"""
S3 photo storage.

The browser uploads straight to S3 with a presigned POST whose policy pins the
object key, content type and maximum size, so S3 itself rejects anything else.
The API then confirms the upload (size, type and file signature) before the
photo can be attached to a listing.
"""

import logging
from dataclasses import dataclass
from datetime import datetime
from functools import lru_cache
from typing import Iterable, Iterator, Optional, Tuple

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from fastapi import HTTPException, status

from app.config import settings

logger = logging.getLogger(__name__)

UPLOAD_EXPIRY_SECONDS = 300


@dataclass(frozen=True)
class ObjectInfo:
    size: int
    content_type: str


class S3PhotoStorage:
    def __init__(self, bucket: str, region: str, prefix: str, access_key: str, secret_key: str) -> None:
        self.bucket = bucket
        self.prefix = prefix
        self.client = boto3.client(
            "s3",
            region_name=region,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            config=Config(signature_version="s3v4", s3={"addressing_style": "virtual"}),
        )

    def presigned_post(self, key: str, content_type: str, max_bytes: int) -> dict:
        post = self.client.generate_presigned_post(
            Bucket=self.bucket,
            Key=key,
            Fields={"Content-Type": content_type},
            Conditions=[{"Content-Type": content_type}, ["content-length-range", 1, max_bytes]],
            ExpiresIn=UPLOAD_EXPIRY_SECONDS,
        )
        return {"url": post["url"], "fields": post["fields"]}

    def head(self, key: str) -> Optional[ObjectInfo]:
        try:
            response = self.client.head_object(Bucket=self.bucket, Key=key)
        except ClientError as error:
            if error.response.get("Error", {}).get("Code") in ("404", "NoSuchKey", "NotFound"):
                return None
            raise
        return ObjectInfo(size=response["ContentLength"], content_type=response.get("ContentType", ""))

    def first_bytes(self, key: str, count: int = 16) -> bytes:
        response = self.client.get_object(Bucket=self.bucket, Key=key, Range=f"bytes=0-{count - 1}")
        return response["Body"].read()

    def delete(self, keys: Iterable[str]) -> None:
        keys = list(keys)
        for start in range(0, len(keys), 1000):  # S3's batch limit
            batch = [{"Key": k} for k in keys[start:start + 1000]]
            self.client.delete_objects(Bucket=self.bucket, Delete={"Objects": batch, "Quiet": True})

    def list_objects(self) -> Iterator[Tuple[str, datetime]]:
        """Every object under this storage's prefix, with its last-modified time."""
        paginator = self.client.get_paginator("list_objects_v2")
        for page in paginator.paginate(Bucket=self.bucket, Prefix=self.prefix):
            for obj in page.get("Contents", []):
                yield obj["Key"], obj["LastModified"]


def storage_configured() -> bool:
    return bool(settings.aws_s3_bucket and settings.aws_access_key_id and settings.aws_secret_access_key)


@lru_cache(maxsize=1)
def _build_storage() -> S3PhotoStorage:
    return S3PhotoStorage(
        bucket=settings.aws_s3_bucket, region=settings.aws_region, prefix=settings.s3_key_prefix,
        access_key=settings.aws_access_key_id, secret_key=settings.aws_secret_access_key,
    )


def get_storage() -> S3PhotoStorage:
    """FastAPI dependency for endpoints that need S3."""
    if not storage_configured():
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Photo storage is not configured: set the AWS_* values in .env.")
    return _build_storage()


def get_optional_storage() -> Optional[S3PhotoStorage]:
    """For endpoints that only tidy up S3 (e.g. deleting removed photos) and must work without it."""
    return _build_storage() if storage_configured() else None


def delete_quietly(storage: Optional[S3PhotoStorage], keys: Iterable[str]) -> None:
    """Best-effort removal after a database commit; leftovers are caught by the cleanup job."""
    keys = list(keys)
    if not keys:
        return
    if storage is None:
        logger.warning("photo storage not configured; %d object(s) left for the cleanup job", len(keys))
        return
    try:
        storage.delete(keys)
    except Exception:
        logger.exception("could not delete %d photo object(s); the cleanup job will retry", len(keys))
