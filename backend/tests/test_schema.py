"""Database rules for listings, photos, eBay links and settings (real Postgres)."""

import uuid
from typing import Optional

import pytest
from alembic import command
from sqlalchemy import Connection, Engine, text
from sqlalchemy.exc import IntegrityError

from tests.conftest import TEST_DATABASE_URL, alembic_config


def run(db: Connection, sql: str, **params):
    return db.execute(text(sql), params)


def rejected(db: Connection, sql: str, **params) -> bool:
    """True if a constraint refuses the statement (other errors fail the test); the transaction stays usable."""
    savepoint = db.begin_nested()
    try:
        db.execute(text(sql), params)
        db.execute(text("SET CONSTRAINTS ALL IMMEDIATE"))  # surface deferred-constraint failures now
    except IntegrityError:
        savepoint.rollback()
        return True
    savepoint.rollback()
    return False


def add_listing(db: Connection, listing_id: str = "c1", status: str = "available", **fields) -> str:
    values = {"name": "Charizard", "set_label": "Base · 4/102 · Rare Holo", "price_cents": 50000, **fields}
    run(db, "INSERT INTO listings (id, status, name, set_label, price_cents) VALUES (:id, :status, :name, :set_label, :price_cents)",
        id=listing_id, status=status, **values)
    return listing_id


def add_photo(db: Connection, listing_id: Optional[str], position: Optional[int], role: str = "") -> str:
    key = f"listings/{listing_id or 'pending'}/{uuid.uuid4()}.jpg"
    run(db, "INSERT INTO listing_photos (listing_id, position, role, storage_key, content_type) VALUES (:l, :p, :r, :k, 'image/jpeg')",
        l=listing_id, p=position, r=role, k=key)
    return key


def test_migrations_are_reversible(migrated_engine: Engine) -> None:
    config = alembic_config(TEST_DATABASE_URL)
    command.downgrade(config, "base")
    with migrated_engine.connect() as connection:
        assert connection.execute(text("SELECT to_regclass('public.listings'), to_regclass('public.cards_v2')")).one() == (None, None)
    command.upgrade(config, "head")
    with migrated_engine.connect() as connection:
        assert connection.execute(text("SELECT version_num FROM alembic_version")).scalar_one() == "0002"


def test_drafts_may_be_incomplete_but_published_listings_may_not(db: Connection) -> None:
    run(db, "INSERT INTO listings (id) VALUES ('c1')")
    assert run(db, "SELECT status, name, price_cents, condition, version FROM listings").one() == ("draft", "", None, "Near Mint", 1)
    assert rejected(db, "UPDATE listings SET status = 'available' WHERE id = 'c1'")
    assert rejected(db, "INSERT INTO listings (id, status, name, set_label) VALUES ('c2', 'available', 'Pikachu', 'Base')")
    assert rejected(db, "INSERT INTO listings (id, status, name, set_label, price_cents) VALUES ('c3', 'available', '  ', 'Base', 100)")
    add_listing(db, "c4")


@pytest.mark.parametrize("sql", [
    "INSERT INTO listings (id) VALUES ('C1')",
    "INSERT INTO listings (id) VALUES ('c1; drop')",
    "INSERT INTO listings (id, condition) VALUES ('c1', 'Mint')",
    "INSERT INTO listings (id, status) VALUES ('c1', 'reserved')",
    "INSERT INTO listings (id, price_cents) VALUES ('c1', 0)",
    "INSERT INTO listings (id, price_cents) VALUES ('c1', 10000000001)",
    "INSERT INTO listings (id, name) VALUES ('c1', repeat('x', 301))",
    "INSERT INTO listings (id, description) VALUES ('c1', repeat('x', 20001))",
    "INSERT INTO listings (id, sold_at) VALUES ('c1', now())",
])
def test_listing_field_rules(db: Connection, sql: str) -> None:
    assert rejected(db, sql)


def test_sold_listings_keep_their_sold_time(db: Connection) -> None:
    add_listing(db, "c1", status="sold")
    run(db, "UPDATE listings SET sold_at = now() WHERE id = 'c1'")
    assert rejected(db, "UPDATE listings SET status = 'available' WHERE id = 'c1'")


def test_photo_roles_positions_and_pending_uploads(db: Connection) -> None:
    add_listing(db)
    add_photo(db, None, None)  # pending upload
    add_photo(db, "c1", 0, "front")
    add_photo(db, "c1", 1, "back")
    add_photo(db, "c1", 2, "detail")
    add_photo(db, "c1", 3, "detail")
    assert rejected(db, "INSERT INTO listing_photos (listing_id, position, role, storage_key, content_type) VALUES ('c1', 4, 'front', 'k-front2', 'image/jpeg')")
    assert rejected(db, "INSERT INTO listing_photos (listing_id, position, role, storage_key, content_type) VALUES ('c1', 5, 'back', 'k-back2', 'image/jpeg')")
    assert rejected(db, "INSERT INTO listing_photos (listing_id, position, storage_key, content_type) VALUES ('c1', 20, 'k-20', 'image/jpeg')")
    assert rejected(db, "INSERT INTO listing_photos (listing_id, position, storage_key, content_type) VALUES ('c1', NULL, 'k-nopos', 'image/jpeg')")
    assert rejected(db, "INSERT INTO listing_photos (listing_id, position, storage_key, content_type) VALUES (NULL, 0, 'k-pendpos', 'image/jpeg')")
    assert rejected(db, "INSERT INTO listing_photos (listing_id, position, role, storage_key, content_type) VALUES ('c1', 6, 'cover', 'k-role', 'image/jpeg')")
    assert rejected(db, "INSERT INTO listing_photos (listing_id, position, storage_key, content_type) VALUES ('c1', 7, 'k-gif', 'image/gif')")
    assert rejected(db, "INSERT INTO listing_photos (listing_id, position, storage_key, content_type, frame) VALUES ('c1', 8, 'k-frame', 'image/jpeg', '[1,2]')")


def test_photo_positions_are_unique_but_can_be_swapped_in_one_transaction(db: Connection) -> None:
    add_listing(db)
    add_photo(db, "c1", 0)
    add_photo(db, "c1", 1)
    assert rejected(db, "INSERT INTO listing_photos (listing_id, position, storage_key, content_type) VALUES ('c1', 1, 'k-dup', 'image/jpeg')")
    # Reordering passes through a moment where two photos share a position; the deferred check allows it.
    run(db, "UPDATE listing_photos SET position = CASE position WHEN 0 THEN 1 ELSE 0 END WHERE listing_id = 'c1'")
    run(db, "SET CONSTRAINTS ALL IMMEDIATE")
    assert run(db, "SELECT count(DISTINCT position) FROM listing_photos WHERE listing_id = 'c1'").scalar_one() == 2


def test_storage_keys_are_unique(db: Connection) -> None:
    add_listing(db)
    key = add_photo(db, "c1", 0)
    assert rejected(db, "INSERT INTO listing_photos (listing_id, position, storage_key, content_type) VALUES ('c1', 1, :k, 'image/jpeg')", k=key)


def test_an_ebay_listing_links_to_only_one_card(db: Connection) -> None:
    add_listing(db, "c1")
    add_listing(db, "c2")
    run(db, "INSERT INTO listing_ebay_links (item_id, listing_id, status, checked_at) VALUES ('267788402617', 'c1', 'active', now())")
    assert rejected(db, "INSERT INTO listing_ebay_links (item_id, listing_id, status, checked_at) VALUES ('267788402617', 'c2', 'active', now())")
    assert rejected(db, "INSERT INTO listing_ebay_links (item_id, listing_id, status, checked_at) VALUES ('12345', 'c2', 'active', now())")
    assert rejected(db, "INSERT INTO listing_ebay_links (item_id, listing_id, status, checked_at) VALUES ('267788402618', 'c2', 'deleted', now())")


def test_deleting_a_listing_removes_its_photos_and_links(db: Connection) -> None:
    add_listing(db)
    add_photo(db, "c1", 0)
    run(db, "INSERT INTO listing_ebay_links (item_id, listing_id, status, checked_at) VALUES ('267788402617', 'c1', 'sold', now())")
    run(db, "DELETE FROM listings WHERE id = 'c1'")
    assert run(db, "SELECT (SELECT count(*) FROM listing_photos), (SELECT count(*) FROM listing_ebay_links)").one() == (0, 0)


def test_catalog_link_survives_catalog_card_removal(db: Connection) -> None:
    expansion, card = uuid.uuid4(), uuid.uuid4()
    run(db, "INSERT INTO expansions_v2 (id, external_id, game, name, language, language_code, last_synced_at) VALUES (:e, 'base1', 'pokemon', 'Base', 'English', 'EN', now())", e=expansion)
    run(db, "INSERT INTO cards_v2 (id, external_id, game, expansion_id, name, language, language_code, last_synced_at) VALUES (:c, 'base1-4', 'pokemon', :e, 'Charizard', 'English', 'EN', now())", c=card, e=expansion)
    add_listing(db)
    run(db, "UPDATE listings SET card_v2_id = :c WHERE id = 'c1'", c=card)
    run(db, "DELETE FROM cards_v2 WHERE id = :c", c=card)
    assert run(db, "SELECT card_v2_id FROM listings WHERE id = 'c1'").scalar_one() is None


def test_binder_settings_is_one_row_defaulting_to_navy(db: Connection) -> None:
    assert run(db, "SELECT id, color, style, rings FROM binder_settings").all() == [(1, "navy", "modern", False)]
    assert rejected(db, "INSERT INTO binder_settings (id) VALUES (2)")
    assert rejected(db, "UPDATE binder_settings SET color = 'pink'")
    assert rejected(db, "UPDATE binder_settings SET style = 'retro'")


@pytest.mark.parametrize("table", ["listings", "listing_photos", "listing_ebay_links", "binder_settings"])
def test_supabase_api_roles_have_no_access(db: Connection, table: str) -> None:
    assert run(db, "SELECT relrowsecurity FROM pg_class WHERE oid = to_regclass(:t)", t=f"public.{table}").scalar_one()
    for role in ("anon", "authenticated"):
        for privilege in ("SELECT", "INSERT", "UPDATE", "DELETE"):
            assert not run(db, "SELECT has_table_privilege(:r, :t, :p)", r=role, t=f"public.{table}", p=privilege).scalar_one()


def test_constraint_names_follow_the_naming_convention(db: Connection) -> None:
    rows = run(db, """
        SELECT conrelid::regclass::text, conname FROM pg_constraint
        WHERE contype = 'c' AND conrelid::regclass::text IN ('listings', 'listing_photos', 'listing_ebay_links', 'binder_settings')
    """).all()
    assert rows, "expected check constraints"
    for table, name in rows:
        assert name.startswith(f"ck_{table}_"), name
        assert f"ck_{table}_ck_" not in name, f"doubled prefix: {name}"
    assert ("listings", "ck_listings_published_complete") in rows
