"""Alembic environment: connects with BINDR_SUPABASE_CONNECTION (or -x url=...)."""

from alembic import context
from sqlalchemy import create_engine, pool

from app.config import settings
from app.models import Base

target_metadata = Base.metadata


def database_url() -> str:
    # `alembic -x url=postgresql+psycopg://...` targets another database (e.g. a local test one).
    return context.get_x_argument(as_dictionary=True).get("url") or settings.sqlalchemy_database_url


def include_object(obj, name, type_, reflected, compare_to) -> bool:
    # The database also holds Supabase-managed objects; only manage tables Bindr models define.
    if type_ == "table" and reflected and compare_to is None:
        return False
    return True


def run_migrations_offline() -> None:
    context.configure(url=database_url(), target_metadata=target_metadata, literal_binds=True, include_object=include_object)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    engine = create_engine(database_url(), poolclass=pool.NullPool)
    with engine.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_object=include_object,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
