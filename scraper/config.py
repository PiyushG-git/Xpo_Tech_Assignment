"""
config.py — Central configuration for feeds, database, and scraper behaviour.
"""

import os
from dotenv import load_dotenv

load_dotenv()

# ── MongoDB ───────────────────────────────────────────────────────────────────
MONGO_URI: str = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB_NAME: str = os.getenv("MONGO_DB_NAME", "news_pulse")

# ── RSS Feed sources ──────────────────────────────────────────────────────────
#   Each entry:
#     url    – public RSS endpoint
#     name   – human-readable source label stored with every article
#     lang   – ISO-639-1 language code (reserved for future filtering)
RSS_FEEDS: list[dict] = [
    {
        "url": "http://feeds.bbci.co.uk/news/rss.xml",
        "name": "BBC News",
        "lang": "en",
    },
    {
        "url": "https://feeds.npr.org/1001/rss.xml",
        "name": "NPR",
        "lang": "en",
    },
    {
        "url": "https://www.theguardian.com/world/rss",
        "name": "The Guardian",
        "lang": "en",
    },
    {
        "url": "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml",
        "name": "New York Times",
        "lang": "en",
    },
]

# ── Scraper behaviour ─────────────────────────────────────────────────────────
# Maximum articles fetched per feed per run (None = no limit)
MAX_ARTICLES_PER_FEED: int | None = 30

# Seconds to wait before giving up on a single HTTP request
REQUEST_TIMEOUT: int = 15

# How many times to retry a failed article-body fetch
FETCH_RETRIES: int = 2
