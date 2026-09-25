"""
Database fixtures for tests that need real Postgres.

They use a throwaway local database (`make test-db-start`), rebuilt from the
Alembic migrations at the start of each run. They never touch Supabase: a
TEST_DATABASE_URL pointing at a Supabase host aborts the run.
"""

import argparse
import os
from pathlib import Path
from typing import Iterator

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import Connection, Engine, create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import OperationalError

BACKEND_DIR = Path(__file__).resolve().parents[1]
TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL", "postgresql+psycopg://postgres@127.0.0.1:54329/bindr_test")


def alembic_config(url: str) -> Config:
    config = Config(str(BACKEND_DIR / "alembic.ini"))
    config.cmd_opts = argparse.Namespace(x=[f"url={url}"])  # read by env.py's get_x_argument
    return config


@pytest.fixture(scope="session")
def migrated_engine() -> Iterator[Engine]:
    url = make_url(TEST_DATABASE_URL)
    if "supabase" in (url.host or ""):
        pytest.exit("TEST_DATABASE_URL points at Supabase; tests only run against a local database.", returncode=2)
    engine = create_engine(url)
    try:
        engine.connect().close()
    except OperationalError:
        pytest.skip("Local test database is not running; start it with `make test-db-start`.")

    with engine.begin() as connection:
        connection.execute(text("DROP SCHEMA IF EXISTS public CASCADE"))
        connection.execute(text("DROP SCHEMA IF EXISTS extensions CASCADE"))
        connection.execute(text("CREATE SCHEMA public"))
        # Recreate Supabase's API roles and their default access to new tables,
        # so the migration's REVOKE is exercised as it will be in production.
        connection.execute(text("""
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
                IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
            END $$
        """))
        connection.execute(text("GRANT ALL ON SCHEMA public TO anon, authenticated"))
        connection.execute(text("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated"))

    command.upgrade(alembic_config(TEST_DATABASE_URL), "head")
    yield engine
    engine.dispose()


@pytest.fixture
def db(migrated_engine: Engine) -> Iterator[Connection]:
    """A connection inside a transaction that is rolled back after the test."""
    connection = migrated_engine.connect()
    transaction = connection.begin()
    try:
        yield connection
    finally:
        transaction.rollback()
        connection.close()
