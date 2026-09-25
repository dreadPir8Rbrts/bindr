"""
Remove photo uploads that never made it into a listing.

- pending photo rows (confirmed uploads never attached) older than the cutoff,
  with their S3 objects;
- S3 objects under S3_KEY_PREFIX that no photo row references (e.g. an upload
  whose confirm never arrived, or a delete that failed after a save).

Only objects older than the cutoff are touched, so uploads in progress are safe.
Usage (from backend/): python -m app.jobs.cleanup_photos [--dry-run] [--hours 24]
"""

import argparse
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.listings import ListingPhoto

logger = logging.getLogger(__name__)


def cleanup_photos(db: Session, storage, older_than: timedelta = timedelta(hours=24),
                   now: Optional[datetime] = None, dry_run: bool = False) -> Dict[str, List[str]]:
    cutoff = (now or datetime.now(timezone.utc)) - older_than

    stale = db.scalars(select(ListingPhoto).where(ListingPhoto.listing_id.is_(None), ListingPhoto.created_at < cutoff)).all()
    stale_keys = [k for p in stale for k in (p.storage_key, p.thumb_key) if k]
    if not dry_run:
        for photo in stale:
            db.delete(photo)
        db.flush()

    referenced = set()
    for storage_key, thumb_key in db.execute(select(ListingPhoto.storage_key, ListingPhoto.thumb_key)):
        referenced.update(k for k in (storage_key, thumb_key) if k)
    orphans = [key for key, modified in storage.list_objects() if modified < cutoff and key not in referenced]

    to_delete = sorted(set(orphans) | set(stale_keys))
    if dry_run:
        db.rollback()
    else:
        db.commit()  # rows first: a failed S3 delete leaves only objects, which the next run removes
        if to_delete:
            storage.delete(to_delete)
    return {"pending_rows": [p.storage_key for p in stale], "objects": to_delete}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--dry-run", action="store_true", help="report what would be removed without removing it")
    parser.add_argument("--hours", type=float, default=24, help="only remove uploads older than this (default 24)")
    args = parser.parse_args()

    from sqlalchemy.orm import sessionmaker

    from app.db.session import get_engine
    from app.services.storage import get_storage

    with sessionmaker(bind=get_engine())() as db:
        result = cleanup_photos(db, get_storage(), timedelta(hours=args.hours), dry_run=args.dry_run)
    verb = "Would remove" if args.dry_run else "Removed"
    print(f"{verb} {len(result['pending_rows'])} unattached upload(s) and {len(result['objects'])} S3 object(s).")
    for key in result["objects"]:
        print("  " + key)


if __name__ == "__main__":
    main()
