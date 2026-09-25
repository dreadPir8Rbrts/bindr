"""POST /scan — identify a card from a photo (seller only). Body: the JPEG itself."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.orm import Session

from app.auth import Seller, require_seller
from app.db.session import get_db
from app.services.photos import has_image_signature
from app.services.scanner import scan_image

logger = logging.getLogger(__name__)
router = APIRouter(tags=["scan"])

MAX_SCAN_BYTES = 4 * 1024 * 1024  # the seller page sends ~800px JPEGs, well under this


@router.post("/scan")
async def scan(request: Request, _: Seller = Depends(require_seller), db: Session = Depends(get_db)) -> dict:
    if request.headers.get("content-type") != "image/jpeg":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Send the scan photo as a JPEG.")
    data = bytearray()
    async for chunk in request.stream():
        data += chunk
        if len(data) > MAX_SCAN_BYTES:
            raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, "Scan photos must be under 4 MB.")
    if not has_image_signature(bytes(data), "image/jpeg"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "The file does not match its image format.")
    try:
        # OCR and matching are blocking (network + database); keep them off the event loop.
        return await run_in_threadpool(scan_image, db, bytes(data))
    except HTTPException:
        raise
    except Exception:
        logger.exception("card scan failed")
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Card scanning is unavailable right now. Try again, or fill in the details yourself.")
