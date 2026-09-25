"""Database engine and request-scoped sessions."""

from functools import lru_cache
from typing import Iterator

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import settings


@lru_cache(maxsize=1)
def get_engine() -> Engine:
    # prepare_threshold=None disables server-side prepared statements, which
    # Supabase's transaction pooler (port 6543) does not support.
    return create_engine(
        settings.sqlalchemy_database_url,
        pool_pre_ping=True,
        connect_args={"prepare_threshold": None},
    )


def get_db() -> Iterator[Session]:
    """FastAPI dependency: one session per request."""
    session = sessionmaker(bind=get_engine(), expire_on_commit=False)()
    try:
        yield session
    finally:
        session.close()
