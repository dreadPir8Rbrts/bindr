"""
Card catalog copied from leftovers.gg (read-only for Bindr).

Mirrors the existing cards_v2 / expansions_v2 / scrydex_prices tables exactly,
so `alembic check` stays clean. Refresh the data by re-copying from leftovers.gg,
not through Bindr.
"""

import uuid
from datetime import date, datetime
from typing import Any, Optional

from sqlalchemy import Boolean, CheckConstraint, Date, DateTime, ForeignKey, Index, Integer, PrimaryKeyConstraint, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base

GAMES_CHECK = "game IN ('pokemon', 'onepiece', 'naruto_ccg')"


class ExpansionV2(Base):
    __tablename__ = "expansions_v2"
    __table_args__ = (
        UniqueConstraint("game", "external_id"),
        CheckConstraint(GAMES_CHECK, name="game"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    external_id: Mapped[str] = mapped_column(String())
    game: Mapped[str] = mapped_column(String())
    name: Mapped[str] = mapped_column(String())
    name_en: Mapped[Optional[str]] = mapped_column(String())
    series: Mapped[Optional[str]] = mapped_column(String())
    code: Mapped[Optional[str]] = mapped_column(String())
    printed_total: Mapped[Optional[int]] = mapped_column(Integer())
    is_online_only: Mapped[Optional[bool]] = mapped_column(Boolean())
    symbol_url: Mapped[Optional[str]] = mapped_column(String())
    translation: Mapped[Optional[str]] = mapped_column(String())
    type: Mapped[Optional[str]] = mapped_column(String())
    total: Mapped[Optional[int]] = mapped_column(Integer())
    language: Mapped[str] = mapped_column(String())
    language_code: Mapped[str] = mapped_column(String(5))
    release_date: Mapped[Optional[date]] = mapped_column(Date())
    logo_url: Mapped[Optional[str]] = mapped_column(String())
    last_synced_at: Mapped[datetime] = mapped_column(DateTime())


class CardV2(Base):
    __tablename__ = "cards_v2"
    __table_args__ = (
        UniqueConstraint("game", "external_id"),
        CheckConstraint(GAMES_CHECK, name="game"),
        Index("ix_cards_v2_name_gin", "name", postgresql_using="gin", postgresql_ops={"name": "extensions.gin_trgm_ops"}),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    external_id: Mapped[str] = mapped_column(String())
    game: Mapped[str] = mapped_column(String())
    expansion_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("expansions_v2.id"), index=True)
    name: Mapped[str] = mapped_column(String())
    en_name: Mapped[Optional[str]] = mapped_column(String())
    number: Mapped[Optional[str]] = mapped_column(String())
    printed_number: Mapped[Optional[str]] = mapped_column(String())
    rarity: Mapped[Optional[str]] = mapped_column(String())
    rarity_code: Mapped[Optional[str]] = mapped_column(String())
    language: Mapped[str] = mapped_column(String())
    language_code: Mapped[str] = mapped_column(String(5))
    expansion_sort_order: Mapped[Optional[int]] = mapped_column(Integer())
    images: Mapped[Optional[Any]] = mapped_column(JSONB())
    variants: Mapped[Optional[Any]] = mapped_column(JSONB())
    price_data_uploaded_at: Mapped[Optional[datetime]] = mapped_column(DateTime())
    last_synced_at: Mapped[datetime] = mapped_column(DateTime())
    supertype: Mapped[Optional[str]] = mapped_column(String())
    subtypes: Mapped[Optional[Any]] = mapped_column(JSONB())
    types: Mapped[Optional[Any]] = mapped_column(JSONB())
    hp: Mapped[Optional[str]] = mapped_column(String())
    level: Mapped[Optional[str]] = mapped_column(String())
    evolves_from: Mapped[Optional[Any]] = mapped_column(JSONB())
    abilities: Mapped[Optional[Any]] = mapped_column(JSONB())
    attacks: Mapped[Optional[Any]] = mapped_column(JSONB())
    weaknesses: Mapped[Optional[Any]] = mapped_column(JSONB())
    resistances: Mapped[Optional[Any]] = mapped_column(JSONB())
    retreat_cost: Mapped[Optional[Any]] = mapped_column(JSONB())
    national_pokedex_numbers: Mapped[Optional[Any]] = mapped_column(JSONB())
    flavor_text: Mapped[Optional[str]] = mapped_column(Text())
    regulation_mark: Mapped[Optional[str]] = mapped_column(String())
    artist: Mapped[Optional[str]] = mapped_column(String())
    cost: Mapped[Optional[str]] = mapped_column(String())
    power: Mapped[Optional[str]] = mapped_column(String())
    attribute: Mapped[Optional[str]] = mapped_column(String())
    card_type: Mapped[Optional[str]] = mapped_column(String())
    colors: Mapped[Optional[Any]] = mapped_column(JSONB())
    rules: Mapped[Optional[Any]] = mapped_column(JSONB())
    printings: Mapped[Optional[Any]] = mapped_column(JSONB())
    tags: Mapped[Optional[Any]] = mapped_column(JSONB())


class ScrydexPrice(Base):
    __tablename__ = "scrydex_prices"
    # Postgres generated this primary key name; it predates the naming convention.
    __table_args__ = (PrimaryKeyConstraint("card_v2_id", name="scrydex_prices_pkey"),)

    card_v2_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("cards_v2.id", ondelete="CASCADE"))
    prices_json: Mapped[Any] = mapped_column(JSONB())
    fetched_at: Mapped[datetime] = mapped_column(DateTime())
