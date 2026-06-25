"""
grouper.py — Part 1B: Topic Grouping using TF-IDF and DBSCAN.

Reads all articles from MongoDB, computes TF-IDF vectors over their combined
text (title + summary + body), clusters them using DBSCAN (cosine distance),
generates cluster labels from the top TF-IDF terms, and stores the clusters
back into MongoDB.
"""

from __future__ import annotations

import logging
import sys

from sklearn.cluster import DBSCAN
from sklearn.feature_extraction.text import TfidfVectorizer

from models import articles_col, build_cluster_doc, clusters_col, get_db

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)


def run_grouping() -> dict:
    """
    Run the clustering pipeline.
    Returns a summary dict with the number of clusters and unclustered articles.
    """
    logger.info("=== Topic Grouping starting ===")
    
    db = get_db()
    a_col = articles_col(db)
    c_col = clusters_col(db)

    # 1. Fetch articles
    articles = list(a_col.find({}, {"_id": 1, "title": 1, "summary": 1, "body": 1, "published_at": 1}))
    if not articles:
        logger.warning("No articles found in DB. Run ingest.py first.")
        return {"clusters": 0, "unclustered": 0}

    logger.info("Loaded %d articles from DB", len(articles))

    # 2. Build combined text
    # We double the title so it gets more weight in TF-IDF
    corpus = []
    for art in articles:
        parts = [
            art.get("title", ""),
            art.get("title", ""),  # 2x weight
            art.get("summary", ""),
            art.get("body", "") or ""
        ]
        corpus.append(" ".join(parts))

    # 3. TF-IDF Vectorization
    # min_df=2 drops words that only appear in 1 article (noise)
    # max_df=0.85 drops words that appear in >85% of articles (e.g. "news")
    logger.info("Computing TF-IDF vectors...")
    vectorizer = TfidfVectorizer(
        stop_words="english",
        min_df=2,
        max_df=0.85,
        max_features=5000,
    )
    
    try:
        tfidf_matrix = vectorizer.fit_transform(corpus)
    except ValueError as e:
        logger.error("TF-IDF failed (maybe not enough data?): %s", e)
        return {"clusters": 0, "unclustered": len(articles)}

    feature_names = vectorizer.get_feature_names_out()

    # 4. DBSCAN Clustering
    # eps=0.6 on cosine distance means it groups items with similarity > 0.4
    logger.info("Running DBSCAN clustering...")
    dbscan = DBSCAN(eps=0.6, min_samples=2, metric="cosine")
    labels = dbscan.fit_predict(tfidf_matrix)

    # Group articles by cluster label
    # labels -> -1 means noise (unclustered)
    clusters: dict[int, list[dict]] = {}
    for idx, cluster_id in enumerate(labels):
        clusters.setdefault(int(cluster_id), []).append({
            "_id": articles[idx]["_id"],
            "published_at": articles[idx].get("published_at"),
            "vector_idx": idx
        })

    # 5. Clear old clusters
    logger.info("Clearing old clusters from DB...")
    c_col.delete_many({})
    a_col.update_many({}, {"$set": {"cluster_id": None}})

    # 6. Generate labels and save
    logger.info("Saving new clusters...")
    num_clusters = 0
    num_unclustered = 0

    for cluster_id, members in clusters.items():
        article_ids = [m["_id"] for m in members]
        
        # Calculate time range
        dates = [m["published_at"] for m in members if m["published_at"]]
        earliest_at = min(dates) if dates else None
        latest_at = max(dates) if dates else None

        if cluster_id == -1:
            # Noise / Unclustered
            label_text = "Uncategorized"
            num_unclustered = len(members)
        else:
            # Proper cluster: compute centroid and get top terms
            num_clusters += 1
            member_indices = [m["vector_idx"] for m in members]
            # Mean of the vectors for this cluster
            centroid = tfidf_matrix[member_indices].mean(axis=0).A1
            # Get top 3 terms
            top_indices = centroid.argsort()[-3:][::-1]
            top_terms = [feature_names[i] for i in top_indices]
            label_text = " • ".join(top_terms).title()

        # Save cluster doc
        doc = build_cluster_doc(
            label=label_text,
            article_ids=article_ids,
            article_count=len(article_ids),
            earliest_at=earliest_at,
            latest_at=latest_at,
        )
        result = c_col.insert_one(doc)
        
        # Update articles with new cluster_id
        a_col.update_many(
            {"_id": {"$in": article_ids}},
            {"$set": {"cluster_id": result.inserted_id}}
        )

        if cluster_id != -1:
            logger.info("  Created cluster: [%s] (%d articles)", label_text, len(article_ids))

    logger.info("=== Grouping complete | %d clusters | %d unclustered ===", num_clusters, num_unclustered)
    return {"clusters": num_clusters, "unclustered": num_unclustered}


if __name__ == "__main__":
    run_grouping()
