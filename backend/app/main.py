"""
Bindr API.

Serves the JSON API under /api/v1 and the static buyer/seller frontend from
frontend/ on the same origin, so the browser needs no CORS configuration.
"""

from fastapi import APIRouter, FastAPI, HTTPException, Request, status
from fastapi.staticfiles import StaticFiles

from app.api import health
from app.config import settings

app = FastAPI(title="Bindr API", version="0.1.0")

# Carried over from netlify.toml.
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Frame-Options": "DENY",
}


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    for name, value in SECURITY_HEADERS.items():
        response.headers.setdefault(name, value)
    return response


api = APIRouter(prefix="/api/v1")
api.include_router(health.router)


@api.api_route("/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"], include_in_schema=False)
def api_not_found(path: str) -> None:
    """Unknown API paths get a JSON 404 instead of falling through to the static files."""
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")


app.include_router(api)

# Mounted last so API routes win. Serve frontend/ only — never the repo root, which holds .env.
app.mount("/", StaticFiles(directory=settings.frontend_dir, html=True), name="frontend")
