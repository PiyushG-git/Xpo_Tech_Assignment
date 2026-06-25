"""
models.py — MongoDB database setup and document helpers.

Collections
-----------
articles  : one document per news article
clusters  : one document per topic cluster (written by grouper.py)

Deduplication
-------------
A unique index on `url_hash` (SHA-256 of the canonical URL) prevents the
same article from being stored twice across repeated runs.

Usage
-----
    from models import get_db, articles_col, clusters_col, make_url_hash

    db = get_db()
    articles = articles_col(db)
    clusters = clusters_col(db)
"""

from __future__ import annotations

import hashlib
from datetime import datetime, timezone

from pymongo import ASCENDING, MongoClient
from pymongo.collection import Collection
from pymongo.database import Database

from config import MONGO_DB_NAME, MONGO_URI

# ── Client (module-level singleton) ──────────────────────────────────────────
_client: MongoClient | None = None


def get_client() -> MongoClient:
    """Return the shared MongoClient, creating it on first call."""
    global _client
    if _client is None:
        _client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    return _client


def get_db() -> Database:
    """Return the news_pulse database handle."""
    return get_client()[MONGO_DB_NAME]


# ── Collection accessors ──────────────────────────────────────────────────────

def articles_col(db: Database) -> Collection:
    return db["articles"]


def clusters_col(db: Database) -> Collection:
    return db["clusters"]


# ── Index bootstrap ───────────────────────────────────────────────────────────

def init_db() -> None:
    """
    Create all required indexes if they don't already exist.
    Safe to call on every run — MongoDB is idempotent for existing indexes.
    """
    db = get_db()

    # ── articles collection ───────────────────────────────────────────────────
    arts = articles_col(db)

    # Primary dedup key — unique on url_hash
    arts.create_index([("url_hash", ASCENDING)], unique=True, name="uq_url_hash")

    # Useful query indexes for the API
    arts.create_index([("source", ASCENDING)], name="idx_source")
    arts.create_index([("cluster_id", ASCENDING)], name="idx_cluster_id")
    arts.create_index([("published_at", ASCENDING)], name="idx_published_at")

    # ── clusters collection ───────────────────────────────────────────────────
    clus = clusters_col(db)
    clus.create_index([("created_at", ASCENDING)], name="idx_cluster_created")


# ── Document builders ─────────────────────────────────────────────────────────

def build_article_doc(
    *,
    url: str,
    title: str,
    summary: str | None,
    body: str | None,
    source: str,
    published_at: datetime | None,
) -> dict:
    """
    Return a clean article document ready for insertion.

    Article document schema
    -----------------------
    {
        url_hash    : str          # SHA-256 of url — dedup key
        url         : str
        title       : str
        summary     : str | None   # short RSS blurb
        body        : str | None   # full article body (None if fetch failed)
        source      : str          # "BBC News", "NPR", etc.
        published_at: datetime | None   # UTC-aware
        ingested_at : datetime          # UTC-aware, set at insertion time
        cluster_id  : None              # filled in later by grouper.py
    }
    """
    return {
        "url_hash": make_url_hash(url),
        "url": url,
        "title": title,
        "summary": summary or "",
        "body": body,
        "source": source,
        "published_at": published_at,
        "ingested_at": datetime.now(timezone.utc),
        "cluster_id": None,
    }


def build_cluster_doc(
    *,
    label: str,
    article_ids: list,
    article_count: int,
    earliest_at: datetime | None,
    latest_at: datetime | None,
) -> dict:
    """
    Return a cluster document ready for insertion.

    Cluster document schema
    -----------------------
    {
        label        : str
        article_ids  : list[ObjectId]   # references into articles collection
        article_count: int
        earliest_at  : datetime | None
        latest_at    : datetime | None
        created_at   : datetime
    }
    """
    return {
        "label": label,
        "article_ids": article_ids,
        "article_count": article_count,
        "earliest_at": earliest_at,
        "latest_at": latest_at,
        "created_at": datetime.now(timezone.utc),
    }


# ── URL hashing ───────────────────────────────────────────────────────────────

def make_url_hash(url: str) -> str:
    """Return a 64-char hex SHA-256 of the normalised URL."""
    normalised = url.strip().lower()
    return hashlib.sha256(normalised.encode("utf-8")).hexdigest()
