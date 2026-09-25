"""Supabase token verification and the seller check, with a locally generated signing key."""

import base64
import hashlib
import hmac
import json
import time
from types import SimpleNamespace
from typing import Any, Dict, Optional

import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi.testclient import TestClient

from app import auth
from app.config import settings
from app.main import app

SUPABASE_URL = "https://testproject.supabase.co"
ISSUER = SUPABASE_URL + "/auth/v1"
SELLER_ID = "51eda765-0d8e-43ff-a0fb-1c4b4ae38f7f"

signing_key = ec.generate_private_key(ec.SECP256R1())
other_key = ec.generate_private_key(ec.SECP256R1())
client = TestClient(app)


class FakeJWKS:
    """Stands in for PyJWKClient: serves the test key's public half."""

    def __init__(self, error: Optional[Exception] = None) -> None:
        self.error = error

    def get_signing_key_from_jwt(self, token: str) -> SimpleNamespace:
        if self.error:
            raise self.error
        jwt.get_unverified_header(token)  # malformed tokens fail here, as with the real client
        return SimpleNamespace(key=signing_key.public_key())


@pytest.fixture(autouse=True)
def supabase_settings(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "supabase_url", SUPABASE_URL)
    monkeypatch.setattr(settings, "supabase_publishable_key", "sb_publishable_test")
    monkeypatch.setattr(auth, "jwks_client", lambda: FakeJWKS())


def token(key: Any = signing_key, algorithm: str = "ES256", **overrides: Any) -> str:
    now = int(time.time())
    claims: Dict[str, Any] = {
        "iss": ISSUER, "aud": "authenticated", "sub": SELLER_ID, "email": "admin@bindr.com",
        "role": "authenticated", "iat": now, "exp": now + 3600, "session_id": "s1", "is_anonymous": False,
        "app_metadata": {"provider": "email", "role": "seller"},
    }
    claims.update(overrides)
    return jwt.encode({k: v for k, v in claims.items() if v is not None}, key, algorithm=algorithm)


def get_session(bearer: Optional[str]):
    headers = {"Authorization": f"Bearer {bearer}"} if bearer is not None else {}
    return client.get("/api/v1/session", headers=headers)


def test_seller_token_is_accepted() -> None:
    response = get_session(token())
    assert response.status_code == 200
    assert response.json() == {"authenticated": True, "email": "admin@bindr.com"}


@pytest.mark.parametrize("bearer", [
    None,
    "",
    "not-a-jwt",
    token(key=other_key),                                   # signed by someone else
    token(exp=int(time.time()) - 10),                       # expired
    token(iss="https://otherproject.supabase.co/auth/v1"),  # another Supabase project
    token(aud="anon"),
    token(aud=None),
    token(sub=None),
    token(is_anonymous=True),
    jwt.encode({"iss": ISSUER, "aud": "authenticated", "sub": SELLER_ID, "exp": int(time.time()) + 60, "iat": int(time.time())},
               None, algorithm="none"),
])
def test_invalid_tokens_are_rejected(bearer: Optional[str]) -> None:
    response = get_session(bearer)
    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


def test_shared_secret_token_cannot_pose_as_signed_one() -> None:
    # Algorithm confusion: an HS256 token "signed" with the public key must not verify.
    # PyJWT refuses to build such a token, so assemble it by hand as an attacker would.
    public_pem = signing_key.public_key().public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo)
    b64 = lambda data: base64.urlsafe_b64encode(data).rstrip(b"=")
    claims = {"iss": ISSUER, "aud": "authenticated", "sub": SELLER_ID, "iat": int(time.time()),
              "exp": int(time.time()) + 60, "app_metadata": {"role": "seller"}}
    signing_input = b64(json.dumps({"alg": "HS256", "typ": "JWT"}).encode()) + b"." + b64(json.dumps(claims).encode())
    forged = signing_input + b"." + b64(hmac.new(public_pem, signing_input, hashlib.sha256).digest())
    assert get_session(forged.decode()).status_code == 401


@pytest.mark.parametrize("app_metadata", [{"provider": "email"}, {"role": "admin"}, None])
def test_signed_in_non_sellers_are_forbidden(app_metadata: Optional[dict]) -> None:
    assert get_session(token(app_metadata=app_metadata)).status_code == 403


def test_user_metadata_cannot_grant_seller_role() -> None:
    forged = token(app_metadata={"provider": "email"}, user_metadata={"role": "seller"})
    assert get_session(forged).status_code == 403


def test_unreachable_signing_keys_are_a_503_not_a_401(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(auth, "jwks_client", lambda: FakeJWKS(jwt.PyJWKClientConnectionError("down")))
    assert get_session(token()).status_code == 503


def test_missing_configuration_is_reported(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "supabase_url", None)
    assert get_session(token()).status_code == 503
    assert client.get("/api/v1/config").status_code == 503


def test_public_config_exposes_only_public_values() -> None:
    assert client.get("/api/v1/config").json() == {"supabaseUrl": SUPABASE_URL, "supabasePublishableKey": "sb_publishable_test"}
