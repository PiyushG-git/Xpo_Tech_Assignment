"""
ingest.py — Orchestrates the full Part 1A pipeline:

    1. For each feed in config.RSS_FEEDS:
        a. Fetch and parse the RSS feed with feedparser
        b. Normalise every entry into a clean dict (normalizer.py)
        c. Skip entries whose url_hash already exists in MongoDB (dedup)
        d. Fetch the full article body (fetcher.py) — gracefully skip on failure
        e. Insert new article documents into MongoDB

Run it directly:
    python ingest.py

Or import run_ingestion() from other modules (e.g. the Node.js trigger endpoint).
"""

from __future__ import annotations

import logging
import sys
from datetime import datetime, timezone

import feedparser
from pymongo.errors import DuplicateKeyError

from config import MAX_ARTICLES_PER_FEED, RSS_FEEDS
from fetcher import fetch_article_body
from models import articles_col, build_article_doc, get_db, init_db, make_url_hash, ingestion_jobs_col
from normalizer import normalize_entry

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Public entry point
# ─────────────────────────────────────────────────────────────────────────────

from bson.objectid import ObjectId

def run_ingestion(job_id: str | None = None) -> dict:
    """
    Run the full ingestion pipeline over all configured feeds.

    Returns a summary dict:
        {
            "feeds_processed": int,
            "articles_new": int,
            "articles_skipped_duplicate": int,
            "articles_skipped_error": int,
            "started_at": str (ISO-8601),
            "finished_at": str (ISO-8601),
        }
    """
    started_at = datetime.now(timezone.utc)
    logger.info("=== News Pulse ingestion starting at %s ===", started_at.isoformat())

    init_db()   # create indexes on first run; no-op if they already exist

    db = get_db()
    col = articles_col(db)

    stats = {
        "feeds_processed": 0,
        "articles_new": 0,
        "articles_skipped_duplicate": 0,
        "articles_skipped_error": 0,
    }

    for feed_config in RSS_FEEDS:
        _process_feed(feed_config, col, stats)
        stats["feeds_processed"] += 1

    finished_at = datetime.now(timezone.utc)
    elapsed = (finished_at - started_at).total_seconds()

    job_doc = {
        "started_at": started_at,
        "ended_at": finished_at,
        "articles_inserted": stats["articles_new"],
        "duplicates": stats["articles_skipped_duplicate"],
        "failed": stats["articles_skipped_error"],
        "status": "completed",
    }
    
    if job_id:
        ingestion_jobs_col(db).update_one(
            {"_id": ObjectId(job_id)},
            {"$set": job_doc}
        )
        job_doc["_id"] = ObjectId(job_id)
    else:
        ingestion_jobs_col(db).insert_one(job_doc)

    logger.info(
        "=== Ingestion complete in %.1fs | new=%d  dup=%d  err=%d ===",
        elapsed,
        stats["articles_new"],
        stats["articles_skipped_duplicate"],
        stats["articles_skipped_error"],
    )

    return {
        "job_id": str(job_doc.get("_id", "")),
        **stats,
        "started_at": started_at.isoformat(),
        "finished_at": finished_at.isoformat(),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Per-feed processing
# ─────────────────────────────────────────────────────────────────────────────

def _process_feed(feed_config: dict, col, stats: dict) -> None:
    """Fetch, parse, and store all new articles from one feed."""
    source_name: str = feed_config["name"]
    feed_url: str = feed_config["url"]

    logger.info("-- Processing feed: %s (%s)", source_name, feed_url)

    # ── 1. Parse RSS ──────────────────────────────────────────────────────────
    try:
        parsed = feedparser.parse(feed_url)
    except Exception as exc:
        logger.error("feedparser failed for %s: %s", feed_url, exc)
        return

    entries = parsed.entries or []
    if not entries:
        logger.warning("No entries found in feed: %s", feed_url)
        return

    # Honour the per-feed cap
    if MAX_ARTICLES_PER_FEED is not None:
        entries = entries[:MAX_ARTICLES_PER_FEED]

    logger.info("  Found %d entries (cap=%s)", len(entries), MAX_ARTICLES_PER_FEED)

    # ── 2. Normalise + dedup + store ──────────────────────────────────────────
    for entry in entries:
        _process_entry(entry, source_name, col, stats)


def _process_entry(entry, source_name: str, col, stats: dict) -> None:
    """Normalise a single feedparser entry and insert it if new."""

    # ── Normalise ─────────────────────────────────────────────────────────────
    normalised = normalize_entry(entry, source_name)
    if normalised is None:
        stats["articles_skipped_error"] += 1
        return

    url = normalised["url"]
    url_hash = make_url_hash(url)

    # ── Dedup check ───────────────────────────────────────────────────────────
    # count_documents with a limit of 1 is the fastest existence check in pymongo
    if col.count_documents({"url_hash": url_hash}, limit=1):
        logger.debug("  SKIP (duplicate): %s", url)
        stats["articles_skipped_duplicate"] += 1
        return

    # ── Full article body fetch ───────────────────────────────────────────────
    logger.info("  FETCH body: %s", url[:80])
    fetch_result = fetch_article_body(url)
    if fetch_result["body"] is None:
        logger.debug("  Body fetch failed — storing with summary only: %s", url[:60])

    # ── Build document ────────────────────────────────────────────────────────
    doc = build_article_doc(
        url=url,
        title=normalised["title"],
        summary=normalised["summary"],
        body=fetch_result["body"],
        body_status=fetch_result["body_status"],
        extractor=fetch_result["extractor"],
        source=source_name,
        published_at=normalised["published_at"],
    )

    # ── Insert ────────────────────────────────────────────────────────────────
    try:
        col.insert_one(doc)
        stats["articles_new"] += 1
        logger.info("  SAVED: [%s] %s", source_name, normalised["title"][:60])
    except DuplicateKeyError:
        # Race condition: another process inserted the same url_hash between
        # our count_documents check above and this insert. Safe to ignore.
        logger.debug("  SKIP (DuplicateKeyError race): %s", url)
        stats["articles_skipped_duplicate"] += 1


# ─────────────────────────────────────────────────────────────────────────────
# CLI entry point
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    summary = run_ingestion()
    logger.info("Ingestion summary:")
    for key, value in summary.items():
        logger.info("  %s: %s", key, value)
