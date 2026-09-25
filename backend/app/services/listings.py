"""
Listings: validation, persistence and the card JSON the frontend uses.

The card format ({id, name, set, price, condition, sold, photos, photoRoles, ...})
is the one the buyer and seller pages already work with; this module maps it onto
the listings / listing_photos / listing_ebay_links tables. Validation rules and
messages are carried over from the Netlify version (server/core.mjs cleanCard).
"""

import hashlib
import json
import math
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import ROUND_HALF_UP, Decimal
from typing import Any, Dict, List, Optional, Sequence

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.models.listings import (
    CONDITIONS, EBAY_STATUSES, MAX_PHOTOS_PER_LISTING, MAX_PRICE_CENTS, PHOTO_ROLES,
    BinderSettings, Listing, ListingEbayLink, ListingPhoto,
)
from app.services.photos import content_type_for, photo_key, photo_url

MAX_EBAY_LINKS = 20
FIELDS_MESSAGE = "Check the card name, set, condition, availability and price."
PHOTOS_MESSAGE = "Use 1–20 uploaded photos."
STALE_MESSAGE = "This listing changed in another window. Reload the seller binder before saving again."
EBAY_ITEM_ID = re.compile(r"^\d{9,15}$")
LISTING_ID = re.compile(r"^c\d+$")


class CardError(HTTPException):
    def __init__(self, detail: str, status_code: int = status.HTTP_400_BAD_REQUEST) -> None:
        super().__init__(status_code, detail)


@dataclass
class CleanCard:
    id: str
    status: str
    name: str
    set_label: str
    price_cents: Optional[int]
    condition: str
    rare: bool
    description: str
    binder_number: Optional[str]
    photo_keys: List[str]
    photo_roles: List[str]
    thumb_key: Optional[str]
    frames: Optional[Dict[str, Dict[str, float]]]  # None: keep the stored frames
    ebay_links: Optional[List[Dict[str, Any]]] = field(default=None)  # None: keep the stored links


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

def _price_cents(price: Any) -> int:
    if isinstance(price, bool) or not isinstance(price, (int, float)) or not math.isfinite(price):
        raise CardError(FIELDS_MESSAGE)
    cents = int((Decimal(str(price)) * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
    if cents <= 0 or cents > MAX_PRICE_CENTS:
        raise CardError(FIELDS_MESSAGE)
    return cents


def _clean_frames(frames: Any, keys_by_url: Dict[str, str]) -> Dict[str, Dict[str, float]]:
    """Frames keyed by photo URL → frames keyed by storage key, dropping photos not in the listing."""
    if not isinstance(frames, dict):
        raise CardError("Invalid photo framing.")
    result: Dict[str, Dict[str, float]] = {}
    for url, frame in frames.items():
        key = keys_by_url.get(url)
        if key is None:
            continue
        values = [frame.get(k) if isinstance(frame, dict) else None for k in ("x", "y", "w", "h")]
        if not all(isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v) for v in values):
            raise CardError("Keep the frame inside the photo.")
        x, y, w, h = values
        if x < 0 or y < 0 or w < 0.05 or h < 0.05 or x + w > 1.00001 or y + h > 1.00001:
            raise CardError("Keep the frame inside the photo.")
        result[key] = {"x": x, "y": y, "w": w, "h": h}
    return result


def _clean_ebay_links(links: Any) -> List[Dict[str, Any]]:
    if not isinstance(links, list) or len(links) > MAX_EBAY_LINKS:
        raise CardError("Use at most 20 eBay links per card.")
    cleaned = []
    for link in links:
        try:
            item_id, link_status, checked = link["itemId"], link["status"], link["checkedAt"]
            if not isinstance(item_id, str) or not EBAY_ITEM_ID.match(item_id) or link_status not in EBAY_STATUSES:
                raise ValueError
            checked_at = datetime.fromisoformat(checked.replace("Z", "+00:00"))
        except (KeyError, TypeError, ValueError, AttributeError):
            raise CardError("Check the eBay listing number, status and date.")
        if checked_at.tzinfo is None:
            checked_at = checked_at.replace(tzinfo=timezone.utc)
        cleaned.append({"item_id": item_id, "status": link_status, "checked_at": checked_at})
    if len({link["item_id"] for link in cleaned}) != len(cleaned):
        raise CardError("This eBay listing is linked twice.")
    return cleaned


def clean_card(raw: Any) -> CleanCard:
    """Validate a card from the seller page. Drafts (status 'draft') may be incomplete."""
    if not isinstance(raw, dict) or not isinstance(raw.get("id"), str) or not LISTING_ID.match(raw["id"]):
        raise CardError(FIELDS_MESSAGE)
    draft = raw.get("status") == "draft"

    name, set_label, condition = raw.get("name", ""), raw.get("set", ""), raw.get("condition", "Near Mint")
    if not isinstance(name, str) or not isinstance(set_label, str) or len(name) > 300 or len(set_label) > 400:
        raise CardError(FIELDS_MESSAGE)
    if condition not in CONDITIONS:
        raise CardError(FIELDS_MESSAGE)
    sold = raw.get("sold", False)
    if not isinstance(sold, bool):
        raise CardError(FIELDS_MESSAGE)
    price = raw.get("price")
    if draft:
        price_cents = None if price in (None, 0, "") else _price_cents(price)
    else:
        if not name.strip() or not set_label.strip():
            raise CardError(FIELDS_MESSAGE)
        price_cents = _price_cents(price)

    photos = raw.get("photos", [])
    min_photos = 0 if draft else 1
    if not isinstance(photos, list) or not min_photos <= len(photos) <= MAX_PHOTOS_PER_LISTING:
        raise CardError(PHOTOS_MESSAGE)
    keys = [photo_key(p) for p in photos]
    if len(set(keys)) != len(keys):
        raise CardError("Each photo can be used only once in a listing.")
    thumb = raw.get("thumb") or ""
    if photos:
        thumb_key = photo_key(thumb) if thumb else keys[0]
    else:
        thumb_key = None

    description = raw.get("description", "")
    if not isinstance(description, str) or len(description) > 20000:
        raise CardError("Description is too long.")

    roles = raw.get("photoRoles") if raw.get("photoRoles") is not None else [""] * len(photos)
    if (not isinstance(roles, list) or len(roles) != len(photos) or any(r not in PHOTO_ROLES for r in roles)
            or roles.count("front") > 1 or roles.count("back") > 1):
        raise CardError("Label at most one front and one back photo.")

    number = raw.get("number")
    if number is not None and (not isinstance(number, str) or len(number) > 40):
        raise CardError(FIELDS_MESSAGE)

    keys_by_url = dict(zip(photos, keys))
    frames = _clean_frames(raw["photoFrames"], keys_by_url) if raw.get("photoFrames") is not None else None
    ebay = _clean_ebay_links(raw["ebayListings"]) if raw.get("ebayListings") is not None else None

    return CleanCard(
        id=raw["id"],
        status="draft" if draft else ("sold" if sold else "available"),
        name=name.strip(),
        set_label=set_label.strip(),
        price_cents=price_cents,
        condition=condition,
        rare=bool(raw.get("rare")),
        description=description.strip(),
        binder_number=number,
        photo_keys=keys,
        photo_roles=list(roles),
        thumb_key=thumb_key,
        frames=frames,
        ebay_links=ebay,
    )


# ---------------------------------------------------------------------------
# Card JSON
# ---------------------------------------------------------------------------

def _iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def card_json(listing: Listing, include_private: bool = False) -> Dict[str, Any]:
    photos = sorted(listing.photos, key=lambda p: p.position)
    urls = [photo_url(p.storage_key) for p in photos]
    cover = photos[0] if photos else None
    card: Dict[str, Any] = {
        "id": listing.id,
        "name": listing.name,
        "set": listing.set_label,
        "price": listing.price_cents / 100 if listing.price_cents is not None else 0,
        "condition": listing.condition,
        "sold": listing.status == "sold",
        "description": listing.description,
        "photos": urls,
        "photoRoles": [p.role for p in photos],
        "thumb": photo_url(cover.thumb_key or cover.storage_key) if cover else "",
        "rare": listing.rare,
    }
    if listing.binder_number is not None:
        card["number"] = listing.binder_number
    if listing.ebay_links:
        links = sorted(listing.ebay_links, key=lambda l: (l.checked_at, l.item_id))
        card["ebayListings"] = [{"itemId": l.item_id, "status": l.status, "checkedAt": _iso(l.checked_at)} for l in links]
    frames = {url: p.frame for url, p in zip(urls, photos) if p.frame}
    if frames:
        card["photoFrames"] = frames
    if include_private:
        card["status"] = listing.status
        card["version"] = listing.version
    return card


def _load_listings(db: Session, include_drafts: bool) -> Sequence[Listing]:
    query = (
        select(Listing)
        .options(selectinload(Listing.photos), selectinload(Listing.ebay_links))
        # Oldest first, like the Netlify inventory array ('c2' before 'c10').
        .order_by(Listing.created_at, func.length(Listing.id), Listing.id)
    )
    if not include_drafts:
        query = query.where(Listing.status != "draft")
    return db.scalars(query).all()


def _revision(payload: Dict[str, Any]) -> str:
    """Fingerprint of the served data: changes whenever any listing or the appearance does."""
    return hashlib.sha256(json.dumps(payload, sort_keys=True, default=str).encode()).hexdigest()[:20]


def appearance_json(settings_row: BinderSettings) -> Dict[str, Any]:
    return {"color": settings_row.color, "style": settings_row.style, "rings": settings_row.rings, "revision": _iso(settings_row.updated_at)}


def public_inventory(db: Session) -> Dict[str, Any]:
    payload = {
        "cards": [card_json(l) for l in _load_listings(db, include_drafts=False)],
        "appearance": appearance_json(db.get(BinderSettings, 1)),
    }
    return {**payload, "revision": _revision(payload)}


def seller_inventory(db: Session) -> Dict[str, Any]:
    payload = {"cards": [card_json(l, include_private=True) for l in _load_listings(db, include_drafts=True)]}
    return {**payload, "revision": _revision(payload)}


# ---------------------------------------------------------------------------
# Saving and deleting
# ---------------------------------------------------------------------------

def _integrity_error(error: IntegrityError) -> CardError:
    constraint = getattr(getattr(error.orig, "diag", None), "constraint_name", None) or ""
    if constraint == "pk_listing_ebay_links":
        return CardError("That eBay listing is already linked to another card.")
    if constraint == "pk_listings":
        return CardError("A listing with this id was just created in another window. Reload inventory.", status.HTTP_409_CONFLICT)
    if constraint == "uq_listing_photos_storage_key":
        return CardError("A photo in this listing is already used by another listing.")
    return CardError(FIELDS_MESSAGE)


def _sync_photos(db: Session, listing: Listing, card: CleanCard) -> None:
    others = db.scalars(
        select(ListingPhoto).where(ListingPhoto.storage_key.in_(card.photo_keys), ListingPhoto.listing_id != listing.id)
    ).all()
    if others:
        raise CardError("A photo in this listing is already used by another listing.")
    # Pending uploads (listing_id NULL) are adopted by storage key.
    pending = {p.storage_key: p for p in db.scalars(
        select(ListingPhoto).where(ListingPhoto.storage_key.in_(card.photo_keys), ListingPhoto.listing_id.is_(None))
    )}
    current = {p.storage_key: p for p in listing.photos}
    stored_frames = {p.storage_key: p.frame for p in listing.photos}

    for key, photo in current.items():
        if key not in card.photo_keys:
            db.delete(photo)
    # One front/back is a unique index (not deferrable): clear roles before reassigning them.
    for photo in current.values():
        photo.role = ""
    db.flush()

    for position, key in enumerate(card.photo_keys):
        photo = current.get(key) or pending.get(key)
        if photo is None:
            photo = ListingPhoto(storage_key=key, content_type=content_type_for(key))
            db.add(photo)
        photo.listing_id = listing.id
        photo.position = position
        photo.role = card.photo_roles[position]
        photo.frame = (card.frames if card.frames is not None else stored_frames).get(key)
        photo.thumb_key = card.thumb_key if position == 0 and card.thumb_key != key else None


def _sync_ebay_links(db: Session, listing: Listing, links: List[Dict[str, Any]]) -> None:
    wanted = {link["item_id"]: link for link in links}
    taken = db.scalars(
        select(ListingEbayLink.item_id).where(ListingEbayLink.item_id.in_(wanted), ListingEbayLink.listing_id != listing.id)
    ).all()
    if taken:
        raise CardError("That eBay listing is already linked to another card.")
    current = {link.item_id: link for link in listing.ebay_links}
    for item_id, link in current.items():
        if item_id not in wanted:
            db.delete(link)
    for item_id, data in wanted.items():
        link = current.get(item_id) or ListingEbayLink(item_id=item_id, listing_id=listing.id)
        link.status, link.checked_at = data["status"], data["checked_at"]
        db.add(link)


def save_listing(db: Session, listing_id: str, raw: Any) -> None:
    """Create or update one listing. Updates must carry the version they were edited from."""
    card = clean_card(raw)
    if card.id != listing_id:
        raise CardError("The listing id does not match the address.")
    version = raw.get("version")
    try:
        listing = db.scalars(
            select(Listing).where(Listing.id == listing_id).with_for_update()
            .options(selectinload(Listing.photos), selectinload(Listing.ebay_links))
        ).one_or_none()
        if listing is None:
            if version is not None:
                raise CardError("This listing no longer exists. Reload inventory.", status.HTTP_409_CONFLICT)
            listing = Listing(id=listing_id, version=1)
            db.add(listing)
            db.flush()
        elif version != listing.version:
            raise CardError(STALE_MESSAGE, status.HTTP_409_CONFLICT)
        else:
            listing.version += 1

        previously_sold = listing.status == "sold"
        listing.status = card.status
        listing.sold_at = (listing.sold_at if previously_sold else func.now()) if card.status == "sold" else None
        listing.name, listing.set_label, listing.price_cents = card.name, card.set_label, card.price_cents
        listing.condition, listing.rare, listing.description = card.condition, card.rare, card.description
        listing.binder_number = card.binder_number
        listing.updated_at = func.now()
        _sync_photos(db, listing, card)
        if card.ebay_links is not None:
            _sync_ebay_links(db, listing, card.ebay_links)
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise _integrity_error(error)
    except HTTPException:
        db.rollback()
        raise


def delete_listing(db: Session, listing_id: str, version: int) -> None:
    listing = db.scalars(select(Listing).where(Listing.id == listing_id).with_for_update()).one_or_none()
    if listing is None:
        db.rollback()
        raise CardError("This listing no longer exists. Reload inventory.", status.HTTP_404_NOT_FOUND)
    if listing.version != version:
        db.rollback()
        raise CardError("This listing changed in another window. Reload before deleting.", status.HTTP_409_CONFLICT)
    db.delete(listing)
    db.commit()
