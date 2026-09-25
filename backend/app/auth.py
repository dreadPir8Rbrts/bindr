"""
Supabase Auth for the API.

The browser signs in with supabase-js and sends its access token as
`Authorization: Bearer <token>`. Tokens are verified against the project's
published signing keys (JWKS), so the API holds no auth secret. Seller routes
also require `app_metadata.role == "seller"`, which only the server or the
Supabase dashboard can set (unlike user_metadata, which users can edit).
"""

from dataclasses import dataclass
from functools import lru_cache
from typing import Any, Dict, Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings

AUDIENCE = "authenticated"
# Asymmetric only: a shared-secret (HS256) token can't be verified with a public key.
ALGORITHMS = ["ES256", "RS256"]

_bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class Seller:
    user_id: str
    email: Optional[str]


def _issuer() -> str:
    if not settings.supabase_url:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Sign-in is not configured: set SUPABASE_URL in .env.")
    return settings.supabase_url.rstrip("/") + "/auth/v1"


@lru_cache(maxsize=1)
def jwks_client() -> jwt.PyJWKClient:
    # Supabase advises against caching signing keys for long; refetch every 10 minutes.
    return jwt.PyJWKClient(_issuer() + "/.well-known/jwks.json", cache_keys=True, lifespan=600)


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(status.HTTP_401_UNAUTHORIZED, detail, headers={"WWW-Authenticate": "Bearer"})


def verify_token(token: str) -> Dict[str, Any]:
    """Return the token's claims, or raise 401 (bad token) / 503 (keys unreachable)."""
    issuer = _issuer()
    try:
        signing_key = jwks_client().get_signing_key_from_jwt(token)
    except jwt.PyJWKClientConnectionError:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Sign-in service is unreachable. Try again shortly.")
    except (jwt.PyJWKClientError, jwt.InvalidTokenError):
        raise _unauthorized("Your session is invalid. Sign in again.")
    try:
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=ALGORITHMS,
            audience=AUDIENCE,
            issuer=issuer,
            options={"require": ["exp", "iat", "sub", "iss", "aud"]},
        )
    except jwt.ExpiredSignatureError:
        raise _unauthorized("Your session has expired. Sign in again.")
    except jwt.InvalidTokenError:
        raise _unauthorized("Your session is invalid. Sign in again.")
    if claims.get("is_anonymous"):
        raise _unauthorized("Sign in with your seller account.")
    return claims


def current_claims(credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer)) -> Dict[str, Any]:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise _unauthorized("Sign in to continue.")
    return verify_token(credentials.credentials)


def require_seller(claims: Dict[str, Any] = Depends(current_claims)) -> Seller:
    app_metadata = claims.get("app_metadata") or {}
    if app_metadata.get("role") != "seller":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This account can't manage the binder.")
    return Seller(user_id=claims["sub"], email=claims.get("email"))
