# News Pulse 

> **Topic-Clustered News Timeline** — A full-stack system that pulls live articles from multiple RSS feeds, automatically groups related articles into topic clusters, and displays them as an interactive visual timeline.

Built as part of the **XPONENTIUM INDIA Full-Stack Developer Internship Assessment**.

---

##  Live Links

| Component | URL | Notes |
|---|---|---|
|  Frontend | [https://xpo-tech-assignment.vercel.app/](https://xpo-tech-assignment.vercel.app/) | Live URL that works when opened cold |
|  Backend API | [https://xpo-tech-assignment.onrender.com](https://xpo-tech-assignment.onrender.com) | May have standard free-tier cold-start delays |
|  Video Walkthrough | _[Paste Loom URL here]_ | 2-3 minute review |

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

### How Requirements Were Met
1. **Multiple Sources:** Pulls live data from 4 major public RSS feeds (BBC, NPR, Guardian, NYT).
2. **Format Inconsistencies:** `normalizer.py` handles different field names (`<description>` vs `<content:encoded>`), missing dates, and completely inconsistent date formats.
3. **Full Article Extraction:** `fetcher.py` downloads the full article page using a persistent **`requests.Session()`** for speed. It extracts the main body text via **trafilatura**, and falls back to **BeautifulSoup** `<p>` tag extraction if trafilatura fails.
4. **Graceful Failures:** Paywalled pages or network timeouts (e.g., NYT 403s) do not crash the pipeline. The article is simply saved with its RSS summary and a `body_status` of `SUMMARY_ONLY`.
5. **Avoiding Duplicates:** A **SHA-256 hash of the canonical URL** is used as a unique index in MongoDB. This mathematically guarantees no duplicates are stored, even across concurrent runs.
6. **Re-runnable:** The scraper can be run repeatedly. A second run takes only ~2 seconds because it simply checks the MongoDB hashes and skips existing articles, only processing genuinely new content.
7. **Production Ready:** Implements **Structured Logging** to track every step of the pipeline and creates an `ingestion_jobs` receipt in the database upon completion.

---

## Part 1B — Topic Grouping

### Approach: DBSCAN + TF-IDF (Option B)

**Why TF-IDF over keyword overlap?**  
TF-IDF weights rare, meaningful terms more heavily than common ones — words like "elections" score higher than "said". This produces more coherent clusters than raw word-overlap counting.

**How articles are grouped:**
1. Compute TF-IDF vectors over `title + title + summary + body` text. Doubling the title gives the most signal-rich part of the article more weight.
2. Group similar articles using **DBSCAN** clustering with a cosine distance metric. DBSCAN automatically discovers the number of topics and marks unrelated articles as noise ("Uncategorized").
3. For each cluster, compute the centroid (mean vector) and pick the top 3 TF-IDF terms to generate a highly precise, human-readable label (e.g., `Venezuela • Earthquakes • Caracas`).

**Parameters:**
- DBSCAN eps: `0.6` (groups articles with cosine similarity > 0.4)
- DBSCAN min_samples: `2` (singletons are marked as noise)
- TF-IDF max_features: `5000` terms
- TF-IDF min_df: `2` (drops noise words appearing in only 1 article)
- TF-IDF max_df: `0.85` (drops overly common words appearing in >85% of articles)

**Known limitation:**  
TF-IDF is purely lexical — it groups articles that share the same words, not the same concepts. Two articles about the same event written with different vocabulary (e.g. one says "ceasefire", another says "peace agreement") may land in separate clusters. A sentence-embedding model (e.g. `sentence-transformers`) would fix this but was out of scope.

---

## Part 2 — Backend API

### Architecture & Approach
The backend is built with **Node.js, Express, and Mongoose**. It serves as the bridge between the MongoDB database and the Next.js/React frontend.

1. **Mongoose Models:** Strict schema parity with the Python script (`Article`, `Cluster`, `IngestionJob`).
2. **CORS & Middleware:** Pre-configured for local frontend development.
3. **Python Orchestration:** Instead of complex child process management in Node, a small `pipeline.py` script orchestrates the ingestion and grouping. Node.js simply spawns this script asynchronously.

### API Endpoints & Design Decisions

The API implements **reasonable error handling, input validation, and correct status codes (400/404/500 used appropriately)** across all endpoints.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/clusters` | Returns a lightweight list of all clusters (id, label, article_count, dates). |
| `GET` | `/clusters/:id` | Returns a specific cluster fully populated with its articles, sorted chronologically. Returns `404` if not found. |
| `GET` | `/timeline` | **Sensible shape for timeline data**: Returns `[ { id, label, start, end, articleCount, intensity } ]`. Charting libraries need start/end timestamps and magnitudes, not just raw article lists. |
| `POST` | `/ingest/trigger` | Creates a new `IngestionJob`, spawns the Python pipeline in the background, and returns the `jobId` `201 Created` immediately. |
| `GET` | `/ingest/status/:jobId` | Returns `{"status": "running" | "completed" | "failed"}` for frontend polling. Returns `404` if job invalid. |

---

## Database Schema (MongoDB)

A working connection to MongoDB Atlas is established. **Configuration is done entirely via environment variables — there are no hardcoded DB URLs or secrets in the code.**

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

## Deployment: What runs where, and why

| Component | Platform | Notes |
|---|---|---|
| Frontend | Vercel | **Why:** Best-in-class global CDN for Next.js/Vite SPAs. Auto-deploys from `frontend/` on push to `main`. |
| Backend & Pipeline | Render | **Why:** We need a Node.js API that can trigger a Python script via `spawn()`. Render allows us to use a custom `Dockerfile` to create a hybrid Node.js + Python3 environment. |
| Database | MongoDB Atlas M0 | **Why:** Standard free-tier NoSQL database, easily hosted in the same region as the Render backend for low latency. |

**Environment variables are configured directly on the hosting platforms. No secrets are committed to the repository.**

---

## Ambiguities & Assumptions Made

*As per the assignment prompt: "If something is ambiguous, make a reasonable assumption, note it in your README, and keep moving."*

- **Missing Dates**: Articles without a `published_at` date are stored with `null` and excluded from the timeline range calculation.
- **Paywalls**: NYT articles that return HTTP 403 (paywall) are still stored — the RSS summary is enough for clustering; body is stored as `null`.
- **Cross-Source Merging**: "Same story across outlets" cross-source dedup is a known hard problem and is marked as an optional stretch goal, so it was not implemented to focus on core functionality.
- **DBSCAN Parameters**: The DBSCAN `eps` parameter of `0.6` was chosen empirically by inspecting cluster quality on the first test run, rather than via mathematical grid search.

---

## Video Walkthrough

> Link: _coming soon_

Covers: live timeline demo → how topic grouping works → one hard problem solved → one future improvement.

---

