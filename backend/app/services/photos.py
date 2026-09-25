"""
Photo references: the URLs the frontend uses ↔ the storage keys in listing_photos.

Current state: only the static photos bundled in frontend/images/ are accepted, and
their key is their path. S3 uploads (step 5 of the FastAPI migration) extend both
functions with S3 keys.
"""

import re

from fastapi import HTTPException, status

STATIC_PHOTO = re.compile(r"^(?:\./)?(images/[a-zA-Z0-9_./-]+\.(?:jpe?g|png|webp))$", re.IGNORECASE)
CONTENT_TYPES = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp"}


def photo_key(url: object) -> str:
    """Storage key for a photo URL sent by the seller page; 400 for anything else."""
    match = STATIC_PHOTO.match(url) if isinstance(url, str) else None
    if match is None or ".." in url:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Use 1–20 uploaded photos.")
    return match.group(1)


def photo_url(key: str) -> str:
    """URL the browser loads for a storage key. Static photos are served from frontend/."""
    return key


def content_type_for(key: str) -> str:
    return CONTENT_TYPES[key.rsplit(".", 1)[-1].lower()]
