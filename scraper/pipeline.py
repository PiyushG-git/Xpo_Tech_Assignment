"""
pipeline.py — Wrapper to run the entire backend pipeline (ingestion + grouping).
Usage: python pipeline.py [job_id]
"""

import sys
import logging

from ingest import run_ingestion
from grouper import run_grouping

# Reconfigure basicConfig in case it wasn't
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

if __name__ == "__main__":
    job_id = sys.argv[1] if len(sys.argv) > 1 else None

    logger.info(f"Starting pipeline... Job ID: {job_id}")

    try:
        # Run Phase 1: Ingestion
        run_ingestion(job_id=job_id)
        
        # Run Phase 2: Grouping
        run_grouping()
        
        logger.info("Pipeline completed successfully.")
    except Exception as e:
        logger.error(f"Pipeline failed: {e}")
        # Update the job to failed if it crashes
        if job_id:
            from models import ingestion_jobs_col, get_db
            from bson.objectid import ObjectId
            db = get_db()
            ingestion_jobs_col(db).update_one(
                {"_id": ObjectId(job_id)},
                {"$set": {"status": "failed"}}
            )
        sys.exit(1)
