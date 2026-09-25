"""
Inventory and appearance endpoints.

Public:  GET /inventory (published listings + appearance), GET /appearance
Seller:  GET /listings (including drafts, with versions), PUT/DELETE /listings/{id},
         PUT /appearance
Seller writes return the seller inventory so the page can refresh in one round trip.
"""

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth import Seller, require_seller
from app.db.session import get_db
from app.models.listings import BINDER_COLORS, BINDER_STYLES, BinderSettings
from app.services import listings as service
from app.services.storage import S3PhotoStorage, delete_quietly, get_optional_storage

router = APIRouter(tags=["listings"])


class SaveListingRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")  # older pages also send an inventory-wide `revision`
    card: Dict[str, Any]


class AppearanceRequest(BaseModel):
    color: Any = None
    style: Any = None
    rings: Any = None
    revision: Any = None


@router.get("/inventory")
def inventory(db: Session = Depends(get_db)) -> dict:
    return service.public_inventory(db)


@router.get("/listings")
def seller_listings(_: Seller = Depends(require_seller), db: Session = Depends(get_db)) -> dict:
    return service.seller_inventory(db)


@router.put("/listings/{listing_id}")
def save_listing(
    listing_id: str, body: SaveListingRequest, _: Seller = Depends(require_seller), db: Session = Depends(get_db),
    storage: Optional[S3PhotoStorage] = Depends(get_optional_storage),
) -> dict:
    delete_quietly(storage, service.save_listing(db, listing_id, body.card))
    return service.seller_inventory(db)


@router.delete("/listings/{listing_id}")
def delete_listing(
    listing_id: str, version: int = Query(...), _: Seller = Depends(require_seller), db: Session = Depends(get_db),
    storage: Optional[S3PhotoStorage] = Depends(get_optional_storage),
) -> dict:
    delete_quietly(storage, service.delete_listing(db, listing_id, version))
    return service.seller_inventory(db)


@router.get("/appearance")
def appearance(db: Session = Depends(get_db)) -> dict:
    return service.appearance_json(db.get(BinderSettings, 1))


@router.put("/appearance")
def save_appearance(body: AppearanceRequest, _: Seller = Depends(require_seller), db: Session = Depends(get_db)) -> dict:
    row = db.scalars(select(BinderSettings).where(BinderSettings.id == 1).with_for_update()).one()
    if body.revision != service.appearance_json(row)["revision"]:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Appearance changed in another window. Reload before saving.")
    if body.color not in BINDER_COLORS or body.style not in BINDER_STYLES or not isinstance(body.rings, bool):
        db.rollback()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Choose a valid binder style.")
    row.color, row.style, row.rings, row.updated_at = body.color, body.style, body.rings, func.now()
    db.commit()
    db.refresh(row)
    return service.appearance_json(row)
