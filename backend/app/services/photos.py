"""
Photo references: the URLs the frontend uses ↔ the storage keys in listing_photos.

Two kinds of key:
- static photos bundled in frontend/images/ (the pre-S3 inventory): key = path,
  served by FastAPI from frontend/;
- S3 uploads: `<prefix>photos/<uuid>.<ext>` plus a `<uuid>_thumb.jpg` rendition,
  served from the bucket (or S3_PUBLIC_BASE_URL). Any `.../photos/` prefix is accepted,
  so photos uploaded from a local run (dev/photos/) still resolve.
"""

import re
from typing import Optional

from fastapi import HTTPException, status

from app.config import settings

STATIC_PHOTO = re.compile(r"^(?:\./)?(images/[a-zA-Z0-9_./-]+\.(?:jpe?g|png|webp))$", re.IGNORECASE)
STORAGE_KEY = re.compile(r"^(?:[a-z0-9-]+/)*photos/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?:_thumb)?\.(?:jpg|png|webp)$")
CONTENT_TYPES = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp"}
EXTENSIONS = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
PHOTOS_MESSAGE = "Use 1–20 uploaded photos."


def is_storage_key(key: str) -> bool:
    return bool(STORAGE_KEY.match(key))


def photo_key(url: object) -> str:
    """Storage key for a photo URL sent by the seller page; 400 for anything else."""
    if not isinstance(url, str) or ".." in url:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, PHOTOS_MESSAGE)
    match = STATIC_PHOTO.match(url)
    if match:
        return match.group(1)
    base = settings.photo_base_url
    if base and url.startswith(base + "/") and is_storage_key(url[len(base) + 1:]):
        return url[len(base) + 1:]
    raise HTTPException(status.HTTP_400_BAD_REQUEST, PHOTOS_MESSAGE)


def photo_url(key: Optional[str]) -> str:
    """URL the browser loads for a storage key."""
    if not key:
        return ""
    if STATIC_PHOTO.match(key):
        return key
    return f"{settings.photo_base_url}/{key}"


def content_type_for(key: str) -> str:
    return CONTENT_TYPES[key.rsplit(".", 1)[-1].lower()]


def has_image_signature(data: bytes, content_type: str) -> bool:
    """The file's first bytes match its claimed format (carried over from the Netlify upload check)."""
    if content_type == "image/jpeg":
        return data[:3] == b"\xff\xd8\xff"
    if content_type == "image/png":
        return data[:8] == b"\x89PNG\r\n\x1a\n"
    if content_type == "image/webp":
        return data[:4] == b"RIFF" and data[8:12] == b"WEBP"
    return False
