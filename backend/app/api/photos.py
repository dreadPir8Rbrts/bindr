"""
Photo uploads (seller only).

1. POST /photos/uploads  → presigned S3 POSTs for the photo and its 480px thumbnail
2. the browser uploads both straight to S3
3. POST /photos/confirm  → checks both objects and records a pending photo
The pending photo is attached when a listing that uses its URL is saved; unattached
uploads are removed by `python -m app.jobs.cleanup_photos`.
"""

import re
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, StrictInt
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth import Seller, require_seller
from app.config import settings
from app.db.session import get_db
from app.models.listings import ListingPhoto
from app.services.photos import EXTENSIONS, has_image_signature, photo_url
from app.services.storage import S3PhotoStorage, get_storage

router = APIRouter(prefix="/photos", tags=["photos"])

MAX_PHOTO_BYTES = 3 * 1024 * 1024  # matches the seller page's photo preparation limit
MAX_THUMB_BYTES = 512 * 1024


class UploadRequest(BaseModel):
    contentType: str
    bytes: StrictInt
    thumbBytes: StrictInt


class ConfirmRequest(BaseModel):
    key: str


def _thumb_key(key: str) -> str:
    return key.rsplit(".", 1)[0] + "_thumb.jpg"


def _upload_key_pattern() -> re.Pattern:
    return re.compile("^" + re.escape(settings.s3_key_prefix) + r"[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png|webp)$")


@router.post("/uploads")
def create_upload(body: UploadRequest, _: Seller = Depends(require_seller), storage: S3PhotoStorage = Depends(get_storage)) -> dict:
    extension = EXTENSIONS.get(body.contentType)
    if extension is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Use JPEG, PNG or WebP.")
    if not 0 < body.bytes <= MAX_PHOTO_BYTES:
        raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, "Choose a photo under 3 MB.")
    if not 0 < body.thumbBytes <= MAX_THUMB_BYTES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "The photo preview is too large. Try again.")
    key = f"{settings.s3_key_prefix}{uuid.uuid4()}.{extension}"
    return {
        "key": key,
        "upload": storage.presigned_post(key, body.contentType, MAX_PHOTO_BYTES),
        "thumbUpload": storage.presigned_post(_thumb_key(key), "image/jpeg", MAX_THUMB_BYTES),
    }


@router.post("/confirm")
def confirm_upload(
    body: ConfirmRequest,
    _: Seller = Depends(require_seller),
    storage: S3PhotoStorage = Depends(get_storage),
    db: Session = Depends(get_db),
) -> dict:
    key = body.key
    if not _upload_key_pattern().match(key):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Unknown upload. Try this photo again.")
    thumb_key = _thumb_key(key)
    existing = db.scalars(select(ListingPhoto).where(ListingPhoto.storage_key == key)).one_or_none()
    if existing is not None:  # a retried confirm
        return {"url": photo_url(key), "thumbUrl": photo_url(existing.thumb_key)}

    content_type = {"jpg": "image/jpeg", "png": "image/png", "webp": "image/webp"}[key.rsplit(".", 1)[1]]
    photo, thumb = storage.head(key), storage.head(thumb_key)

    def reject(message: str) -> HTTPException:
        storage.delete([key, thumb_key])
        return HTTPException(status.HTTP_400_BAD_REQUEST, message)

    if photo is None or thumb is None:
        raise reject("The upload did not finish. Try this photo again.")
    if (photo.size > MAX_PHOTO_BYTES or photo.content_type != content_type
            or not has_image_signature(storage.first_bytes(key), content_type)):
        raise reject("The file does not match its image format.")
    if thumb.size > MAX_THUMB_BYTES or thumb.content_type != "image/jpeg" or not has_image_signature(storage.first_bytes(thumb_key), "image/jpeg"):
        raise reject("The photo preview could not be checked. Try this photo again.")

    db.add(ListingPhoto(storage_key=key, thumb_key=thumb_key, content_type=content_type, bytes=photo.size))
    try:
        db.commit()
    except IntegrityError:  # confirmed concurrently
        db.rollback()
    return {"url": photo_url(key), "thumbUrl": photo_url(thumb_key)}
