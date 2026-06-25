"""
normalizer.py — Converts a raw feedparser entry (from any feed) into a
                clean, typed Python dict that the rest of the pipeline
                can rely on.

Why a separate module?
    Different RSS feeds use wildly inconsistent field names and date
    formats.  Isolating that messiness here keeps ingest.py clean.
"""

from __future__ import annotations

import html
import logging
import re
from datetime import datetime, timezone
from typing import Any

from dateutil import parser as dateutil_parser

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

def normalize_entry(entry: Any, source_name: str) -> dict | None:
    """
    Accept a feedparser entry object and return a clean dict, or None
    if the entry is too malformed to be useful (e.g. no URL).

    Returned dict keys
    ------------------
    url          : str   – canonical article URL
    title        : str   – headline (HTML-unescaped)
    summary      : str   – short blurb (may be empty string)
    published_at : datetime | None  – timezone-aware UTC datetime
    source       : str   – human-readable feed name
    """
    # ── URL ───────────────────────────────────────────────────────────────────
    url = _extract_url(entry)
    if not url:
        logger.debug("Skipping entry with no URL from %s", source_name)
        return None

    # ── Title ─────────────────────────────────────────────────────────────────
    title = _clean_text(getattr(entry, "title", "") or "")
    if not title:
        title = "(no title)"

    # ── Summary ───────────────────────────────────────────────────────────────
    # Feeds use: summary, description, content[0].value, content:encoded
    summary = _extract_summary(entry)

    # ── Published date ────────────────────────────────────────────────────────
    published_at = _extract_date(entry)

    return {
        "url": url,
        "title": title,
        "summary": summary,
        "published_at": published_at,
        "source": source_name,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Private helpers
# ─────────────────────────────────────────────────────────────────────────────

def _extract_url(entry: Any) -> str | None:
    """Return the best URL for this entry, or None."""
    # Primary: entry.link
    url = getattr(entry, "link", None)
    if url and url.startswith("http"):
        return url.strip()

    # Fallback: links list
    links = getattr(entry, "links", [])
    for lnk in links:
        href = lnk.get("href", "")
        if href.startswith("http"):
            return href.strip()

    # Fallback: id field (sometimes a URL)
    entry_id = getattr(entry, "id", None)
    if entry_id and entry_id.startswith("http"):
        return entry_id.strip()

    return None


def _extract_summary(entry: Any) -> str:
    """
    Try multiple field names in priority order.
    Strips HTML tags so downstream code works with plain text.
    """
    candidates: list[str] = []

    # feedparser merges <content:encoded> into entry.content[].value
    content_list = getattr(entry, "content", [])
    for content_item in content_list:
        value = content_item.get("value", "")
        if value:
            candidates.append(value)

    # Standard RSS summary / description
    for attr in ("summary", "description", "subtitle"):
        val = getattr(entry, attr, None)
        if val:
            candidates.append(val)

    # Pick the longest candidate — usually the richest
    raw = max(candidates, key=len) if candidates else ""
    return _clean_text(raw)


def _extract_date(entry: Any) -> datetime | None:
    """
    Try to get a timezone-aware UTC datetime from the entry.
    feedparser normally gives us parsed_published / published_parsed
    (a time.struct_time), but some feeds only have a raw string.
    """
    # feedparser pre-parses the date into a struct_time
    struct = getattr(entry, "published_parsed", None) or getattr(entry, "updated_parsed", None)
    if struct:
        try:
            # struct_time from feedparser is always UTC
            dt = datetime(*struct[:6], tzinfo=timezone.utc)
            return dt
        except Exception:
            pass  # fall through

    # Raw string fallback
    raw_date: str | None = getattr(entry, "published", None) or getattr(entry, "updated", None)
    if raw_date:
        try:
            dt = dateutil_parser.parse(raw_date)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            else:
                dt = dt.astimezone(timezone.utc)
            return dt
        except Exception:
            logger.debug("Could not parse date string: %r", raw_date)

    return None


# ── HTML stripping & text cleanup ─────────────────────────────────────────────

_TAG_RE = re.compile(r"<[^>]+>")
_WHITESPACE_RE = re.compile(r"\s+")


def _clean_text(raw: str) -> str:
    """Remove HTML tags, unescape entities, collapse whitespace."""
    if not raw:
        return ""
    # Strip tags
    text = _TAG_RE.sub(" ", raw)
    # Unescape HTML entities (&amp; &lt; etc.)
    text = html.unescape(text)
    # Collapse whitespace
    text = _WHITESPACE_RE.sub(" ", text).strip()
    return text
