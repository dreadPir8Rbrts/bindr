"""
Bindr API.

Serves the JSON API under /api/v1 and the static buyer/seller frontend from
frontend/ on the same origin, so the browser needs no CORS configuration.
"""

from fastapi import APIRouter, FastAPI, HTTPException, Request, status
from fastapi.staticfiles import StaticFiles

from app.api import health, listings, photos, scan, session
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
        # Only the seller editor can be embedded, and only by this same origin.
        if name == "X-Frame-Options" and request.url.path == "/seller.html":
            value = "SAMEORIGIN"
        response.headers.setdefault(name, value)
    return response


api = APIRouter(prefix="/api/v1")
api.include_router(health.router)
api.include_router(session.router)
api.include_router(listings.router)
api.include_router(photos.router)
api.include_router(scan.router)


@api.api_route("/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"], include_in_schema=False)
def api_not_found(path: str) -> None:
    """Unknown API paths get a JSON 404 instead of falling through to the static files."""
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")


app.include_router(api)

# Mounted last so API routes win. Serve frontend/ only — never the repo root, which holds .env.
app.mount("/", StaticFiles(directory=settings.frontend_dir, html=True), name="frontend")
