"""Catalog baseline: cards_v2, expansions_v2, scrydex_prices copied from leftovers.gg

These tables already exist in the Bindr production database (restored with
pg_dump on 2026-09-24), so production records this revision with
`alembic stamp 0001` instead of running it. Running it builds the same schema
in a fresh database, such as the local test database.

DDL matches `pg_dump --schema-only` of the production tables.

Revision ID: 0001
Revises:
Create Date: 2026-09-25
"""

from typing import Sequence, Union

from alembic import op

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Supabase keeps extensions in their own schema; pg_trgm backs the name index and
    # unaccent the scanner's accent-insensitive search.
    op.execute("CREATE SCHEMA IF NOT EXISTS extensions")
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions")
    op.execute("CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions")

    op.execute("""
        CREATE TABLE public.expansions_v2 (
            id uuid NOT NULL,
            external_id character varying NOT NULL,
            game character varying NOT NULL,
            name character varying NOT NULL,
            series character varying,
            code character varying,
            printed_total integer,
            is_online_only boolean,
            symbol_url character varying,
            translation character varying,
            type character varying,
            total integer,
            language character varying NOT NULL,
            language_code character varying(5) NOT NULL,
            release_date date,
            logo_url character varying,
            last_synced_at timestamp without time zone NOT NULL,
            name_en character varying,
            CONSTRAINT pk_expansions_v2 PRIMARY KEY (id),
            CONSTRAINT uq_expansions_v2_game_external_id UNIQUE (game, external_id),
            CONSTRAINT ck_expansions_v2_game CHECK (game IN ('pokemon', 'onepiece', 'naruto_ccg'))
        )
    """)
    op.execute("""
        CREATE TABLE public.cards_v2 (
            id uuid NOT NULL,
            external_id character varying NOT NULL,
            game character varying NOT NULL,
            expansion_id uuid NOT NULL,
            name character varying NOT NULL,
            number character varying,
            printed_number character varying,
            rarity character varying,
            rarity_code character varying,
            language character varying NOT NULL,
            language_code character varying(5) NOT NULL,
            expansion_sort_order integer,
            images jsonb,
            variants jsonb,
            price_data_uploaded_at timestamp without time zone,
            last_synced_at timestamp without time zone NOT NULL,
            supertype character varying,
            subtypes jsonb,
            types jsonb,
            hp character varying,
            level character varying,
            evolves_from jsonb,
            abilities jsonb,
            attacks jsonb,
            weaknesses jsonb,
            resistances jsonb,
            retreat_cost jsonb,
            national_pokedex_numbers jsonb,
            flavor_text text,
            regulation_mark character varying,
            artist character varying,
            cost character varying,
            power character varying,
            attribute character varying,
            card_type character varying,
            colors jsonb,
            rules jsonb,
            printings jsonb,
            tags jsonb,
            en_name character varying,
            CONSTRAINT pk_cards_v2 PRIMARY KEY (id),
            CONSTRAINT uq_cards_v2_game_external_id UNIQUE (game, external_id),
            CONSTRAINT ck_cards_v2_game CHECK (game IN ('pokemon', 'onepiece', 'naruto_ccg')),
            CONSTRAINT fk_cards_v2_expansion_id FOREIGN KEY (expansion_id) REFERENCES public.expansions_v2(id)
        )
    """)
    op.execute("CREATE INDEX ix_cards_v2_expansion_id ON public.cards_v2 USING btree (expansion_id)")
    op.execute("CREATE INDEX ix_cards_v2_name_gin ON public.cards_v2 USING gin (name extensions.gin_trgm_ops)")
    op.execute("""
        CREATE TABLE public.scrydex_prices (
            card_v2_id uuid NOT NULL,
            prices_json jsonb NOT NULL,
            fetched_at timestamp without time zone NOT NULL,
            CONSTRAINT scrydex_prices_pkey PRIMARY KEY (card_v2_id),
            CONSTRAINT fk_scrydex_prices_card_v2_id FOREIGN KEY (card_v2_id) REFERENCES public.cards_v2(id) ON DELETE CASCADE
        )
    """)
    for table in ("expansions_v2", "cards_v2", "scrydex_prices"):
        op.execute(f"ALTER TABLE public.{table} ENABLE ROW LEVEL SECURITY")


def downgrade() -> None:
    # Drops the whole catalog. Never run this against production.
    op.execute("DROP TABLE public.scrydex_prices")
    op.execute("DROP TABLE public.cards_v2")
    op.execute("DROP TABLE public.expansions_v2")
