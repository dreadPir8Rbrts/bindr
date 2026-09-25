"""Listings, listing photos, eBay links and binder settings

Replaces the Netlify Blobs inventory. Check constraint names are wrapped in op.f()
because the naming convention would otherwise prefix them a second time. Row-level security is enabled with no
policies and Supabase's API roles lose table access: only the FastAPI backend,
connecting as the database owner, reads or writes these tables.

Revision ID: 0002
Revises: 0001
Create Date: 2026-09-25
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLES = ("listings", "listing_photos", "listing_ebay_links", "binder_settings")
CONDITIONS = "'Near Mint+', 'Near Mint', 'Near Mint-', 'Lightly Played+', 'Lightly Played', 'Lightly Played-', 'Moderately Played'"


def upgrade() -> None:
    op.create_table(
        "listings",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("card_v2_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("status", sa.Text(), server_default=sa.text("'draft'"), nullable=False),
        sa.Column("name", sa.Text(), server_default=sa.text("''"), nullable=False),
        sa.Column("set_label", sa.Text(), server_default=sa.text("''"), nullable=False),
        sa.Column("binder_number", sa.Text(), nullable=True),
        sa.Column("price_cents", sa.BigInteger(), nullable=True),
        sa.Column("condition", sa.Text(), server_default=sa.text("'Near Mint'"), nullable=False),
        sa.Column("rare", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("description", sa.Text(), server_default=sa.text("''"), nullable=False),
        sa.Column("sold_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("version", sa.Integer(), server_default=sa.text("1"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(r"id ~ '^c[0-9]+$'", name=op.f("ck_listings_id_format")),
        sa.CheckConstraint("status IN ('draft', 'available', 'sold')", name=op.f("ck_listings_status")),
        sa.CheckConstraint(f"condition IN ({CONDITIONS})", name=op.f("ck_listings_condition")),
        sa.CheckConstraint("char_length(name) <= 300 AND char_length(set_label) <= 400", name=op.f("ck_listings_text_lengths")),
        sa.CheckConstraint("char_length(description) <= 20000", name=op.f("ck_listings_description_length")),
        sa.CheckConstraint("price_cents IS NULL OR (price_cents > 0 AND price_cents <= 10000000000)", name=op.f("ck_listings_price_range")),
        sa.CheckConstraint(
            "status = 'draft' OR (btrim(name) <> '' AND btrim(set_label) <> '' AND price_cents IS NOT NULL)",
            name=op.f("ck_listings_published_complete"),
        ),
        sa.CheckConstraint("sold_at IS NULL OR status = 'sold'", name=op.f("ck_listings_sold_at_only_when_sold")),
        sa.ForeignKeyConstraint(["card_v2_id"], ["cards_v2.id"], name="fk_listings_card_v2_id", ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id", name="pk_listings"),
    )
    op.create_index("ix_listings_card_v2_id", "listings", ["card_v2_id"])
    op.create_index("ix_listings_status", "listings", ["status"])

    op.create_table(
        "listing_photos",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.func.gen_random_uuid(), nullable=False),
        sa.Column("listing_id", sa.Text(), nullable=True),
        sa.Column("position", sa.SmallInteger(), nullable=True),
        sa.Column("role", sa.Text(), server_default=sa.text("''"), nullable=False),
        sa.Column("storage_key", sa.Text(), nullable=False),
        sa.Column("thumb_key", sa.Text(), nullable=True),
        sa.Column("content_type", sa.Text(), nullable=False),
        sa.Column("bytes", sa.Integer(), nullable=True),
        sa.Column("width", sa.Integer(), nullable=True),
        sa.Column("height", sa.Integer(), nullable=True),
        sa.Column("frame", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("role IN ('', 'front', 'back', 'detail')", name=op.f("ck_listing_photos_role")),
        sa.CheckConstraint("content_type IN ('image/jpeg', 'image/png', 'image/webp')", name=op.f("ck_listing_photos_content_type")),
        sa.CheckConstraint("position >= 0 AND position < 20", name=op.f("ck_listing_photos_position_range")),
        sa.CheckConstraint("(listing_id IS NULL) = (position IS NULL)", name=op.f("ck_listing_photos_attached_has_position")),
        sa.CheckConstraint("frame IS NULL OR jsonb_typeof(frame) = 'object'", name=op.f("ck_listing_photos_frame_object")),
        sa.ForeignKeyConstraint(["listing_id"], ["listings.id"], name="fk_listing_photos_listing_id", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_listing_photos"),
        sa.UniqueConstraint("storage_key", name="uq_listing_photos_storage_key"),
        sa.UniqueConstraint(
            "listing_id", "position", name="uq_listing_photos_listing_id_position", deferrable=True, initially="DEFERRED",
        ),
    )
    op.create_index(
        "uq_listing_photos_one_front_one_back", "listing_photos", ["listing_id", "role"], unique=True,
        postgresql_where=sa.text("role IN ('front', 'back')"),
    )
    op.create_index(
        "ix_listing_photos_pending", "listing_photos", ["created_at"],
        postgresql_where=sa.text("listing_id IS NULL"),
    )

    op.create_table(
        "listing_ebay_links",
        sa.Column("item_id", sa.Text(), nullable=False),
        sa.Column("listing_id", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("checked_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(r"item_id ~ '^[0-9]{9,15}$'", name=op.f("ck_listing_ebay_links_item_id_format")),
        sa.CheckConstraint("status IN ('active', 'ended', 'sold', 'unknown')", name=op.f("ck_listing_ebay_links_status")),
        sa.ForeignKeyConstraint(["listing_id"], ["listings.id"], name="fk_listing_ebay_links_listing_id", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("item_id", name="pk_listing_ebay_links"),
    )
    op.create_index("ix_listing_ebay_links_listing_id", "listing_ebay_links", ["listing_id"])

    op.create_table(
        "binder_settings",
        sa.Column("id", sa.SmallInteger(), server_default=sa.text("1"), nullable=False),
        sa.Column("color", sa.Text(), server_default=sa.text("'navy'"), nullable=False),
        sa.Column("style", sa.Text(), server_default=sa.text("'modern'"), nullable=False),
        sa.Column("rings", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("id = 1", name=op.f("ck_binder_settings_single_row")),
        sa.CheckConstraint(
            "color IN ('olive', 'charcoal', 'oxblood', 'navy', 'mint', 'lavender', 'cream', 'retro')",
            name=op.f("ck_binder_settings_color"),
        ),
        sa.CheckConstraint("style IN ('modern', 'classic', 'soft')", name=op.f("ck_binder_settings_style")),
        sa.PrimaryKeyConstraint("id", name="pk_binder_settings"),
    )
    # The Netlify version's default appearance: navy, modern, no rings.
    op.execute("INSERT INTO public.binder_settings (id) VALUES (1)")

    for table in TABLES:
        op.execute(f"ALTER TABLE public.{table} ENABLE ROW LEVEL SECURITY")
    # Supabase grants its API roles full access to new public tables by default; take it back.
    # (Guarded so the migration also runs on plain Postgres, e.g. the local test database.)
    op.execute(f"""
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
                REVOKE ALL ON {', '.join('public.' + t for t in TABLES)} FROM anon;
            END IF;
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
                REVOKE ALL ON {', '.join('public.' + t for t in TABLES)} FROM authenticated;
            END IF;
        END
        $$
    """)


def downgrade() -> None:
    op.drop_table("binder_settings")
    op.drop_index("ix_listing_ebay_links_listing_id", table_name="listing_ebay_links")
    op.drop_table("listing_ebay_links")
    op.drop_index("ix_listing_photos_pending", table_name="listing_photos")
    op.drop_index("uq_listing_photos_one_front_one_back", table_name="listing_photos")
    op.drop_table("listing_photos")
    op.drop_index("ix_listings_status", table_name="listings")
    op.drop_index("ix_listings_card_v2_id", table_name="listings")
    op.drop_table("listings")
