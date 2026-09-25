from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import Seller, require_seller
from app.config import settings

router = APIRouter(tags=["session"])


@router.get("/config")
def public_config() -> dict:
    """Public values the browser needs to start supabase-js."""
    if not (settings.supabase_url and settings.supabase_publishable_key):
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Sign-in is not configured: set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in .env.")
    return {"supabaseUrl": settings.supabase_url, "supabasePublishableKey": settings.supabase_publishable_key}


@router.get("/session")
def session(seller: Seller = Depends(require_seller)) -> dict:
    """Confirms the bearer token belongs to the seller."""
    return {"authenticated": True, "email": seller.email}
