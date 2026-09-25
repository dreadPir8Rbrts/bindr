"""Application settings, loaded from the repository-root .env file."""

from pathlib import Path
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    # The shared .env also holds Netlify-era and leftovers.gg variables; ignore undeclared ones.
    model_config = SettingsConfigDict(env_file=ROOT_DIR / ".env", extra="ignore")

    frontend_dir: Path = ROOT_DIR / "frontend"
    database_url: Optional[str] = Field(default=None, validation_alias="BINDR_SUPABASE_CONNECTION")
    # Supabase Auth. Both values are public (the browser uses them to sign in).
    supabase_url: Optional[str] = None
    supabase_publishable_key: Optional[str] = None

    @property
    def sqlalchemy_database_url(self) -> str:
        """The Supabase URI with the psycopg 3 driver selected."""
        if not self.database_url:
            raise RuntimeError("BINDR_SUPABASE_CONNECTION is not set in .env")
        url = self.database_url
        for prefix in ("postgresql://", "postgres://"):
            if url.startswith(prefix):
                return "postgresql+psycopg://" + url[len(prefix):]
        return url


settings = Settings()
