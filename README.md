# News Pulse 

> **Topic-Clustered News Timeline** — A full-stack system that pulls live articles from multiple RSS feeds, automatically groups related articles into topic clusters, and displays them as an interactive visual timeline.

Built as part of the **XPONENTIUM INDIA Full-Stack Developer Internship Assessment**.

---

##  Live Links

| Component | URL |
|---|---|
|  Frontend | _Coming soon (Vercel)_ |
|  Backend API | _Coming soon (Render / Railway)_ |
|  Video Walkthrough | _Coming soon_ |

---

## Project Structure

```
news-pulse/
├── scraper/          # Python — RSS ingestion & topic grouping
├── backend/          # Node.js — REST API
└── frontend/         # Next.js — Timeline UI
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Ingestion | Python 3.12, feedparser, trafilatura, pymongo |
| Grouping | scikit-learn (TF-IDF + cosine similarity) |
| Database | MongoDB (Atlas for prod, localhost for dev) |
| API | Node.js, Express |
| Frontend | Next.js 14 (App Router), React, Recharts |
| Deployment | Vercel (frontend), Render (backend), Atlas (DB) |

---

## Local Setup

### Prerequisites
- Python 3.11+
- Node.js 20+
- MongoDB (local or Atlas)

---

### 1. Scraper (Python)

```bash
cd scraper
pip install -r requirements.txt
```

Copy the environment template:
```bash
cp .env.example .env
```

Edit `.env` with your MongoDB connection:
```env
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
MONGO_DB_NAME=news_pulse
```

Run ingestion (pulls articles from all 4 feeds):
```bash
python ingest.py
```

Run topic grouping:
```bash
python grouper.py
```

---

### 2. Backend API (Node.js)

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with MONGO_URI + PORT
npm run dev
```

**API Endpoints:**

| Method | Endpoint | Description |
|---|---|---|
| GET | `/clusters` | List all topic clusters |
| GET | `/clusters/:id` | Full cluster with all articles |
| GET | `/timeline` | Clusters formatted for charting |
| POST | `/ingest/trigger` | Trigger the Python pipeline |
| GET | `/ingest/status/:jobId` | Poll job status |

---

### 3. Frontend (Next.js)

```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local with NEXT_PUBLIC_API_URL
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Part 1A — RSS Ingestion

### News Sources Used
| Source | Feed URL |
|---|---|
| BBC News | `http://feeds.bbci.co.uk/news/rss.xml` |
| NPR | `https://feeds.npr.org/1001/rss.xml` |
| The Guardian | `https://www.theguardian.com/world/rss` |
| New York Times | `https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml` |

### How It Works
1. **feedparser** fetches and parses each RSS feed
2. **normalizer.py** handles format inconsistencies — different field names (`<description>` vs `<content:encoded>`), missing dates, inconsistent date formats
3. **fetcher.py** downloads the full article page using a persistent **`requests.Session()`** for speed, and extracts body text via **trafilatura** (falls back to BeautifulSoup `<p>` extraction if trafilatura fails)
4. A **SHA-256 hash of the URL** is used as the dedup key — MongoDB's unique index enforces no duplicates even across concurrent runs
5. **Structured Logging** tracks every step of the pipeline for easy debugging in production
6. Articles are stored in the `articles` collection with `cluster_id: null` (filled in by the grouper)

### Key Design Decisions
- **Re-runnable**: second run takes ~2 seconds (all hashes already in DB, zero new inserts)
- **Graceful failures**: paywalled pages (NYT 403s) still save the article with RSS summary only — the pipeline never crashes
- **Per-feed cap**: `MAX_ARTICLES_PER_FEED = 30` in `config.py` — set to `None` for unlimited

---

## Part 1B — Topic Grouping

### Approach: TF-IDF + Cosine Similarity (Option B)

**Why TF-IDF over keyword overlap?**  
TF-IDF weights rare, meaningful terms more heavily than common ones — words like "elections" score higher than "said". This produces more coherent clusters than raw word-overlap counting.

**How articles are grouped:**
1. Compute TF-IDF vectors over `title + summary` text (full body where available)
2. Calculate pairwise cosine similarity between all article vectors
3. Group articles with similarity >= 0.25 into the same cluster using a graph-based connected-components approach
4. Label each cluster using the top 3 TF-IDF terms

**Parameters:**
- Similarity threshold: `0.25` — below this, articles are treated as different topics
- Min cluster size: `2` — singletons form their own "Unclustered" group
- Max features: `5000` TF-IDF terms

**Known limitation:**  
TF-IDF is purely lexical — it groups articles that share the same words, not the same concepts. Two articles about the same event written with different vocabulary (e.g. one says "ceasefire", another says "peace agreement") may land in separate clusters. A sentence-embedding model (e.g. `sentence-transformers`) would fix this but was out of scope.

---

## Database Schema (MongoDB)

### `articles` collection
```json
{
  "_id": "ObjectId",
  "url_hash": "sha256-hex-string",
  "url": "https://...",
  "title": "Article headline",
  "summary": "Short RSS blurb",
  "body": "Full article text or null",
  "body_status": "SUCCESS",
  "extractor": "trafilatura",
  "source": "BBC News",
  "published_at": "2026-06-25T08:00:00Z",
  "ingested_at": "2026-06-25T07:47:37Z",
  "cluster_id": "ObjectId or null"
}
```

### `clusters` collection
```json
{
  "_id": "ObjectId",
  "label": "iran war trump congress",
  "article_ids": ["ObjectId", "..."],
  "article_count": 7,
  "earliest_at": "2026-06-24T14:00:00Z",
  "latest_at": "2026-06-25T08:30:00Z",
  "created_at": "2026-06-25T07:50:52Z"
}
```

### `ingestion_jobs` collection
```json
{
  "_id": "ObjectId",
  "started_at": "2026-06-25T07:47:37Z",
  "ended_at": "2026-06-25T07:50:52Z",
  "articles_inserted": 93,
  "duplicates": 12,
  "failed": 0,
  "status": "completed"
}
```

**Indexes:**
- `articles.url_hash` — unique (dedup key)
- `articles.source` — filtering by source in the UI
- `articles.cluster_id` — joining clusters to articles
- `articles.published_at` — timeline ordering (-1 / descending)

---

## Deployment

| Component | Platform | Notes |
|---|---|---|
| Frontend | Vercel | Auto-deploys from `frontend/` on push to `main` |
| Backend API | Render | Node.js web service, free tier |
| Python pipeline | Render Cron Job | Scheduled daily; also triggerable via `POST /ingest/trigger` |
| Database | MongoDB Atlas M0 | Free tier, hosted in same region as backend |

Environment variables are configured on each hosting platform — **no secrets are committed to this repo**.

---

## Assumptions Made

- Articles without a `published_at` date are stored with `null` and excluded from the timeline range calculation
- NYT articles that return HTTP 403 (paywall) are still stored — the RSS summary is enough for clustering; body is `null`
- "Same story across outlets" cross-source dedup is not implemented (marked as stretch goal in the spec)
- The TF-IDF similarity threshold of `0.25` was chosen empirically by inspecting cluster quality on the first test run

---

## Video Walkthrough

> Link: _coming soon_

Covers: live timeline demo → how topic grouping works → one hard problem solved → one future improvement.

---

