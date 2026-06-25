"""
fetcher.py — Fetches the full body text of an article page.

Why trafilatura?
    trafilatura is purpose-built for main-content extraction from news
    pages — it strips navbars, ads, and boilerplate far better than a
    naive BeautifulSoup scrape.  We fall back to a simple <p>-tag
    concatenation if trafilatura returns nothing.

Graceful failure policy
    • Network errors, timeouts, and parse failures are all caught here.
    • The caller receives None; the article is still stored with its
      RSS summary — a partial record is better than a crash.
"""

from __future__ import annotations

import logging
import time

import requests
import trafilatura

from config import FETCH_RETRIES, REQUEST_TIMEOUT

logger = logging.getLogger(__name__)

# Realistic browser headers so news sites don't block us outright
_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}


def fetch_article_body(url: str) -> str | None:
    """
    Download *url* and return the main body text (plain text, no HTML).
    Returns None on any error so callers can degrade gracefully.
    """
    html = _download_html(url)
    if not html:
        return None

    # ── Primary: trafilatura ──────────────────────────────────────────────────
    body = trafilatura.extract(
        html,
        include_comments=False,
        include_tables=False,
        no_fallback=False,
    )
    if body and len(body.strip()) > 100:
        return body.strip()

    # ── Fallback: grab all <p> text with BeautifulSoup ────────────────────────
    body = _bs4_extract(html)
    if body and len(body.strip()) > 100:
        logger.debug("trafilatura failed for %s; used BS4 fallback", url)
        return body.strip()

    logger.debug("Could not extract useful body from %s", url)
    return None


# ── Private helpers ───────────────────────────────────────────────────────────

def _download_html(url: str) -> str | None:
    """HTTP GET with retries; returns raw HTML or None."""
    for attempt in range(1, FETCH_RETRIES + 2):  # +2 so FETCH_RETRIES=2 → 3 attempts
        try:
            resp = requests.get(
                url,
                headers=_HEADERS,
                timeout=REQUEST_TIMEOUT,
                allow_redirects=True,
            )
            resp.raise_for_status()
            return resp.text
        except requests.exceptions.Timeout:
            logger.warning("Timeout fetching %s (attempt %d)", url, attempt)
        except requests.exceptions.TooManyRedirects:
            logger.warning("Too many redirects for %s — skipping", url)
            return None  # no point retrying
        except requests.exceptions.HTTPError as exc:
            status = exc.response.status_code if exc.response else "?"
            logger.warning("HTTP %s for %s (attempt %d)", status, url, attempt)
            if status in (403, 404, 410, 451):
                return None  # permanent error, no retry
        except requests.exceptions.RequestException as exc:
            logger.warning("Request error for %s: %s (attempt %d)", url, exc, attempt)

        if attempt <= FETCH_RETRIES:
            time.sleep(1.5 * attempt)  # simple back-off

    return None


def _bs4_extract(html: str) -> str | None:
    """Fallback: concatenate all <p> tag text from the page."""
    try:
        from bs4 import BeautifulSoup

        soup = BeautifulSoup(html, "lxml")
        paragraphs = [p.get_text(" ", strip=True) for p in soup.find_all("p")]
        text = " ".join(p for p in paragraphs if len(p) > 40)
        return text if text else None
    except Exception as exc:
        logger.debug("BS4 fallback failed: %s", exc)
        return None
