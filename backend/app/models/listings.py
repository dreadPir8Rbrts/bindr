"""
Bindr's own data: card listings, their photos, eBay links and binder appearance.

The database enforces what it can on its own (conditions, photo roles, one front
and one back photo, 20 photos, eBay format, price range); rules spanning tables
(a published listing needs at least one photo) are enforced by the API.
"""

import uuid
from datetime import datetime
from typing import Any, List, Optional

from sqlalchemy import (
    BigInteger, Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer, SmallInteger,
    Text, UniqueConstraint, func, text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

CONDITIONS = (
    "Near Mint+", "Near Mint", "Near Mint-",
    "Lightly Played+", "Lightly Played", "Lightly Played-",
    "Moderately Played",
)
LISTING_STATUSES = ("draft", "available", "sold")
PHOTO_ROLES = ("", "front", "back", "detail")
PHOTO_CONTENT_TYPES = ("image/jpeg", "image/png", "image/webp")
EBAY_STATUSES = ("active", "ended", "sold", "unknown")
BINDER_COLORS = ("olive", "charcoal", "oxblood", "navy", "mint", "lavender", "cream", "retro")
BINDER_STYLES = ("modern", "classic", "soft")
MAX_PHOTOS_PER_LISTING = 20
MAX_PRICE_CENTS = 10_000_000_000  # $100,000,000, the existing Bindr limit


def _in(column: str, values: tuple) -> str:
    return f"{column} IN ({', '.join(repr(v) for v in values)})"


class Listing(Base):
    __tablename__ = "listings"
    __table_args__ = (
        CheckConstraint(r"id ~ '^c[0-9]+$'", name="id_format"),
        CheckConstraint(_in("status", LISTING_STATUSES), name="status"),
        CheckConstraint(_in("condition", CONDITIONS), name="condition"),
        CheckConstraint("char_length(name) <= 300 AND char_length(set_label) <= 400", name="text_lengths"),
        CheckConstraint("char_length(description) <= 20000", name="description_length"),
        CheckConstraint(f"price_cents IS NULL OR (price_cents > 0 AND price_cents <= {MAX_PRICE_CENTS})", name="price_range"),
        # Drafts may be incomplete; published listings need a name, set and price.
        CheckConstraint(
            "status = 'draft' OR (btrim(name) <> '' AND btrim(set_label) <> '' AND price_cents IS NOT NULL)",
            name="published_complete",
        ),
        CheckConstraint("sold_at IS NULL OR status = 'sold'", name="sold_at_only_when_sold"),
    )

    id: Mapped[str] = mapped_column(Text(), primary_key=True)  # 'c123', kept from the Netlify inventory
    card_v2_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cards_v2.id", ondelete="SET NULL"), index=True,
    )
    status: Mapped[str] = mapped_column(Text(), server_default=text("'draft'"), index=True)
    name: Mapped[str] = mapped_column(Text(), server_default=text("''"))
    set_label: Mapped[str] = mapped_column(Text(), server_default=text("''"))  # "Set · number · rarity"
    binder_number: Mapped[Optional[str]] = mapped_column(Text())  # display label such as "001/065"
    price_cents: Mapped[Optional[int]] = mapped_column(BigInteger())
    condition: Mapped[str] = mapped_column(Text(), server_default=text("'Near Mint'"))
    rare: Mapped[bool] = mapped_column(Boolean(), server_default=text("false"))
    description: Mapped[str] = mapped_column(Text(), server_default=text("''"))
    sold_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    version: Mapped[int] = mapped_column(Integer(), server_default=text("1"))  # optimistic concurrency
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    photos: Mapped[List["ListingPhoto"]] = relationship(
        back_populates="listing", order_by="ListingPhoto.position", passive_deletes=True,
    )
    ebay_links: Mapped[List["ListingEbayLink"]] = relationship(back_populates="listing", passive_deletes=True)


class ListingPhoto(Base):
    __tablename__ = "listing_photos"
    __table_args__ = (
        CheckConstraint(_in("role", PHOTO_ROLES), name="role"),
        CheckConstraint(_in("content_type", PHOTO_CONTENT_TYPES), name="content_type"),
        CheckConstraint(f"position >= 0 AND position < {MAX_PHOTOS_PER_LISTING}", name="position_range"),
        # A photo is either pending (uploaded, not yet attached) or placed in a listing.
        CheckConstraint("(listing_id IS NULL) = (position IS NULL)", name="attached_has_position"),
        CheckConstraint("frame IS NULL OR jsonb_typeof(frame) = 'object'", name="frame_object"),
        # Deferrable so photos can be reordered inside one transaction.
        UniqueConstraint("listing_id", "position", deferrable=True, initially="DEFERRED"),
        Index(
            "uq_listing_photos_one_front_one_back", "listing_id", "role",
            unique=True, postgresql_where=text("role IN ('front', 'back')"),
        ),
        # Cleanup job: find pending uploads by age.
        Index("ix_listing_photos_pending", "created_at", postgresql_where=text("listing_id IS NULL")),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    listing_id: Mapped[Optional[str]] = mapped_column(Text(), ForeignKey("listings.id", ondelete="CASCADE"))
    position: Mapped[Optional[int]] = mapped_column(SmallInteger())  # 0 is the binder cover photo
    role: Mapped[str] = mapped_column(Text(), server_default=text("''"))
    storage_key: Mapped[str] = mapped_column(Text(), unique=True)  # S3 object key
    thumb_key: Mapped[Optional[str]] = mapped_column(Text())  # optional smaller rendition
    content_type: Mapped[str] = mapped_column(Text())
    bytes: Mapped[Optional[int]] = mapped_column(Integer())
    width: Mapped[Optional[int]] = mapped_column(Integer())
    height: Mapped[Optional[int]] = mapped_column(Integer())
    frame: Mapped[Optional[Any]] = mapped_column(JSONB())  # catalog crop {x, y, w, h}, fractions of the photo
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    listing: Mapped[Optional[Listing]] = relationship(back_populates="photos")


class ListingEbayLink(Base):
    __tablename__ = "listing_ebay_links"
    __table_args__ = (
        CheckConstraint(r"item_id ~ '^[0-9]{9,15}$'", name="item_id_format"),
        CheckConstraint(_in("status", EBAY_STATUSES), name="status"),
    )

    # Primary key on the eBay item: one eBay listing can be linked to only one card.
    item_id: Mapped[str] = mapped_column(Text(), primary_key=True)
    listing_id: Mapped[str] = mapped_column(Text(), ForeignKey("listings.id", ondelete="CASCADE"), index=True)
    status: Mapped[str] = mapped_column(Text())
    checked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    listing: Mapped[Listing] = relationship(back_populates="ebay_links")


class BinderSettings(Base):
    """Single-row table: the binder's appearance."""

    __tablename__ = "binder_settings"
    __table_args__ = (
        CheckConstraint("id = 1", name="single_row"),
        CheckConstraint(_in("color", BINDER_COLORS), name="color"),
        CheckConstraint(_in("style", BINDER_STYLES), name="style"),
    )

    id: Mapped[int] = mapped_column(SmallInteger(), primary_key=True, server_default=text("1"))
    color: Mapped[str] = mapped_column(Text(), server_default=text("'navy'"))
    style: Mapped[str] = mapped_column(Text(), server_default=text("'modern'"))
    rings: Mapped[bool] = mapped_column(Boolean(), server_default=text("false"))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
