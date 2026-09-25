"""Application settings, loaded from the repository-root .env file."""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    # The shared .env also holds Netlify-era and leftovers.gg variables; ignore undeclared ones.
    model_config = SettingsConfigDict(env_file=ROOT_DIR / ".env", extra="ignore")

    frontend_dir: Path = ROOT_DIR / "frontend"


settings = Settings()
