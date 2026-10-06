"""Photo uploads to S3, attaching them to listings, and cleanup — with an in-memory S3 stand-in."""

import base64
import json
from datetime import datetime, timedelta, timezone
from typing import Dict, Iterable, Iterator, Optional, Tuple

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.config import settings
from app.jobs.cleanup_photos import cleanup_photos
from app.main import app
from app.services.photos import photo_key, photo_url
from app.services.storage import ObjectInfo, S3PhotoStorage, get_optional_storage, get_storage

JPEG = b"\xff\xd8\xff\xe0" + b"\0" * 100
PNG = b"\x89PNG\r\n\x1a\n" + b"\0" * 100
BASE = "https://bindr-test.s3.us-west-2.amazonaws.com"


class FakeStorage:
    """Just enough of S3PhotoStorage, keeping objects in memory."""

    def __init__(self) -> None:
        self.objects: Dict[str, Tuple[bytes, str, datetime]] = {}
        self.deleted: list = []

    def put(self, key: str, data: bytes, content_type: str, modified: Optional[datetime] = None) -> None:
        self.objects[key] = (data, content_type, modified or datetime.now(timezone.utc))

    def presigned_post(self, key: str, content_type: str, max_bytes: int) -> dict:
        return {"url": "https://s3.test/", "fields": {"key": key, "Content-Type": content_type, "max": max_bytes}}

    def head(self, key: str) -> Optional[ObjectInfo]:
        return ObjectInfo(len(self.objects[key][0]), self.objects[key][1]) if key in self.objects else None

    def first_bytes(self, key: str, count: int = 16) -> bytes:
        return self.objects[key][0][:count]

    def delete(self, keys: Iterable[str]) -> None:
        for key in keys:
            self.deleted.append(key)
            self.objects.pop(key, None)

    def list_objects(self):
        return [(key, modified) for key, (_, _, modified) in list(self.objects.items())]


@pytest.fixture
def s3(monkeypatch: pytest.MonkeyPatch) -> Iterator[FakeStorage]:
    monkeypatch.setattr(settings, "aws_s3_bucket", "bindr-test")
    monkeypatch.setattr(settings, "aws_region", "us-west-2")
    monkeypatch.setattr(settings, "s3_public_base_url", None)
    monkeypatch.setattr(settings, "s3_key_prefix", "dev/photos/")
    storage = FakeStorage()
    app.dependency_overrides[get_storage] = lambda: storage
    app.dependency_overrides[get_optional_storage] = lambda: storage
    yield storage
    app.dependency_overrides.pop(get_storage, None)
    app.dependency_overrides.pop(get_optional_storage, None)


def upload(api: TestClient, s3: FakeStorage, data: bytes = JPEG, content_type: str = "image/jpeg", thumb: bytes = JPEG) -> dict:
    """Ticket → 'browser' puts both objects → confirm."""
    ticket = api.post("/api/v1/photos/uploads", json={"contentType": content_type, "bytes": len(data), "thumbBytes": len(thumb)})
    assert ticket.status_code == 200, ticket.text
    ticket = ticket.json()
    s3.put(ticket["upload"]["fields"]["key"], data, content_type)
    s3.put(ticket["thumbUpload"]["fields"]["key"], thumb, "image/jpeg")
    return api.post("/api/v1/photos/confirm", json={"key": ticket["key"]})


def card(photo_urls, **extra) -> dict:
    return {"id": "c1", "name": "Pikachu", "set": "Base · 58/102", "price": 50, "condition": "Near Mint", "sold": False,
            "photos": photo_urls, "photoRoles": [""] * len(photo_urls), "thumb": photo_urls[0], "description": "", **extra}


def test_ticket_pins_key_type_and_size(api: TestClient, s3: FakeStorage) -> None:
    ticket = api.post("/api/v1/photos/uploads", json={"contentType": "image/png", "bytes": 1000, "thumbBytes": 100}).json()
    assert ticket["key"].startswith("dev/photos/") and ticket["key"].endswith(".png")
    assert ticket["upload"]["fields"] == {"key": ticket["key"], "Content-Type": "image/png", "max": 3 * 1024 * 1024}
    assert ticket["thumbUpload"]["fields"]["key"] == ticket["key"][:-4] + "_thumb.jpg"
    assert ticket["thumbUpload"]["fields"]["Content-Type"] == "image/jpeg"


@pytest.mark.parametrize("body,code", [
    ({"contentType": "image/gif", "bytes": 10, "thumbBytes": 10}, 400),
    ({"contentType": "image/heic", "bytes": 10, "thumbBytes": 10}, 400),
    ({"contentType": "image/jpeg", "bytes": 3 * 1024 * 1024 + 1, "thumbBytes": 10}, 413),
    ({"contentType": "image/jpeg", "bytes": 0, "thumbBytes": 10}, 413),
    ({"contentType": "image/jpeg", "bytes": 10, "thumbBytes": 600 * 1024}, 400),
    ({"contentType": "image/jpeg", "bytes": "10", "thumbBytes": 10}, 422),
])
def test_ticket_rejects_bad_requests(api: TestClient, s3: FakeStorage, body: dict, code: int) -> None:
    assert api.post("/api/v1/photos/uploads", json=body).status_code == code


def test_real_presigned_post_policy_enforces_limits() -> None:
    # Real boto3 signing (offline, dummy credentials): S3 will enforce these conditions.
    storage = S3PhotoStorage("bindr-test", "us-west-2", "dev/photos/", "AKIATEST", "secret")
    post = storage.presigned_post("dev/photos/abc.jpg", "image/jpeg", 3 * 1024 * 1024)
    assert post["url"] == BASE + "/"
    policy = json.loads(base64.b64decode(post["fields"]["policy"]))
    assert {"key": "dev/photos/abc.jpg"} in policy["conditions"]
    assert {"Content-Type": "image/jpeg"} in policy["conditions"]
    assert ["content-length-range", 1, 3 * 1024 * 1024] in policy["conditions"]
    assert post["fields"]["x-amz-algorithm"] == "AWS4-HMAC-SHA256"


def test_confirmed_upload_is_pending_until_a_listing_uses_it(api: TestClient, s3: FakeStorage, db) -> None:
    response = upload(api, s3)
    assert response.status_code == 200
    url, thumb = response.json()["url"], response.json()["thumbUrl"]
    assert url.startswith(BASE + "/dev/photos/") and thumb.endswith("_thumb.jpg")
    assert db.execute(text("SELECT listing_id, content_type, bytes FROM listing_photos")).one() == (None, "image/jpeg", len(JPEG))

    assert api.put("/api/v1/listings/c1", json={"card": card([url])}).status_code == 200
    public = api.get("/api/v1/inventory").json()["cards"][0]
    assert public["photos"] == [url] and public["thumb"] == thumb  # buyers' grid loads the small version
    assert db.execute(text("SELECT listing_id, position FROM listing_photos")).one() == ("c1", 0)


def test_confirm_is_idempotent(api: TestClient, s3: FakeStorage, db) -> None:
    ticket = api.post("/api/v1/photos/uploads", json={"contentType": "image/jpeg", "bytes": len(JPEG), "thumbBytes": len(JPEG)}).json()
    s3.put(ticket["upload"]["fields"]["key"], JPEG, "image/jpeg")
    s3.put(ticket["thumbUpload"]["fields"]["key"], JPEG, "image/jpeg")
    first = api.post("/api/v1/photos/confirm", json={"key": ticket["key"]}).json()
    assert api.post("/api/v1/photos/confirm", json={"key": ticket["key"]}).json() == first
    assert db.execute(text("SELECT count(*) FROM listing_photos")).scalar_one() == 1


@pytest.mark.parametrize("data,content_type,thumb,message", [
    (b"GIF89a" + b"\0" * 50, "image/jpeg", JPEG, "does not match"),   # wrong file signature
    (PNG, "image/jpeg", JPEG, "does not match"),                       # PNG bytes claimed as JPEG
    (JPEG, "image/jpeg", PNG, "preview"),                              # thumbnail not a JPEG
])
def test_confirm_rejects_and_removes_bad_files(api: TestClient, s3: FakeStorage, db, data, content_type, thumb, message) -> None:
    response = upload(api, s3, data, content_type, thumb)
    assert response.status_code == 400 and message in response.json()["detail"]
    assert s3.objects == {}
    assert db.execute(text("SELECT count(*) FROM listing_photos")).scalar_one() == 0


def test_confirm_requires_both_objects_and_our_key_format(api: TestClient, s3: FakeStorage) -> None:
    ticket = api.post("/api/v1/photos/uploads", json={"contentType": "image/jpeg", "bytes": 10, "thumbBytes": 10}).json()
    s3.put(ticket["upload"]["fields"]["key"], JPEG, "image/jpeg")  # thumbnail never arrived
    assert api.post("/api/v1/photos/confirm", json={"key": ticket["key"]}).status_code == 400
    for key in ["photos/../x.jpg", "other/photos/00000000-0000-4000-8000-000000000000.jpg", "dev/photos/not-a-uuid.jpg"]:
        assert api.post("/api/v1/photos/confirm", json={"key": key}).status_code == 400


def test_unconfirmed_s3_photos_cannot_be_attached(api: TestClient, s3: FakeStorage) -> None:
    url = f"{BASE}/dev/photos/00000000-0000-4000-8000-000000000000.jpg"
    response = api.put("/api/v1/listings/c1", json={"card": card([url])})
    assert response.status_code == 400 and "upload" in response.json()["detail"]


def test_removed_and_deleted_photos_are_removed_from_s3(api: TestClient, s3: FakeStorage) -> None:
    a, b = upload(api, s3).json()["url"], upload(api, s3).json()["url"]
    api.put("/api/v1/listings/c1", json={"card": card([a, b])})
    listing = api.get("/api/v1/listings").json()["cards"][0]
    api.put("/api/v1/listings/c1", json={"card": {**listing, "photos": [b], "photoRoles": [""], "thumb": b}})
    assert sorted(s3.deleted) == sorted([photo_key(a), photo_key(a)[:-4] + "_thumb.jpg"])
    listing = api.get("/api/v1/listings").json()["cards"][0]
    api.delete("/api/v1/listings/c1", params={"version": listing["version"]})
    assert s3.objects == {}


def test_static_photos_are_never_deleted_from_s3(api: TestClient, s3: FakeStorage) -> None:
    static = card(["images/full/c1_1.jpg"], thumb="images/grid/c1.jpg")
    api.put("/api/v1/listings/c1", json={"card": static})
    api.delete("/api/v1/listings/c1", params={"version": 1})
    assert s3.deleted == []


def test_photo_urls_round_trip(s3: FakeStorage) -> None:
    key = "photos/00000000-0000-4000-8000-000000000000.jpg"
    assert photo_url(key) == f"{BASE}/{key}" and photo_key(photo_url(key)) == key
    assert photo_url("images/full/c1_1.jpg") == "images/full/c1_1.jpg"
    for bad in [f"https://evil.test/{key}", f"{BASE}/secret.jpg", f"{BASE}/photos/../x.jpg"]:
        with pytest.raises(Exception):
            photo_key(bad)


def test_cleanup_removes_only_old_unused_uploads(api: TestClient, s3: FakeStorage, db) -> None:
    from sqlalchemy.orm import Session
    session = Session(bind=db, join_transaction_mode="create_savepoint")
    used, unattached = upload(api, s3).json()["url"], upload(api, s3).json()["url"]
    api.put("/api/v1/listings/c1", json={"card": card([used])})
    old = datetime.now(timezone.utc) - timedelta(days=2)
    db.execute(text("UPDATE listing_photos SET created_at = :old"), {"old": old})
    for key in list(s3.objects):
        s3.objects[key] = (*s3.objects[key][:2], old)
    s3.put("dev/photos/11111111-1111-4111-8111-111111111111.jpg", JPEG, "image/jpeg", old)  # never confirmed
    s3.put("dev/photos/22222222-2222-4222-8222-222222222222.jpg", JPEG, "image/jpeg")       # upload in progress

    preview = cleanup_photos(session, s3, dry_run=True)
    assert len(preview["objects"]) == 3 and s3.deleted == []

    result = cleanup_photos(session, s3)
    assert sorted(result["objects"]) == sorted([photo_key(unattached), photo_key(unattached)[:-4] + "_thumb.jpg",
                                                 "dev/photos/11111111-1111-4111-8111-111111111111.jpg"])
    assert photo_key(used) in s3.objects and "dev/photos/22222222-2222-4222-8222-222222222222.jpg" in s3.objects
    assert db.execute(text("SELECT storage_key FROM listing_photos")).scalars().all() == [photo_key(used)]


def test_uploads_require_sign_in_and_configured_storage(migrated_engine) -> None:
    client = TestClient(app)
    assert client.post("/api/v1/photos/uploads", json={"contentType": "image/jpeg", "bytes": 1, "thumbBytes": 1}).status_code == 401
    assert client.post("/api/v1/photos/confirm", json={"key": "x"}).status_code == 401


def test_private_draft_retains_front_photo_and_publishes_without_back(api: TestClient, s3: FakeStorage, db) -> None:
    from sqlalchemy.orm import Session
    session = Session(bind=db, join_transaction_mode="create_savepoint")
    url = upload(api, s3).json()["url"]
    draft = card([url], name="", set="", price=0, status="draft", photoRoles=["front"])
    response = api.put("/api/v1/listings/c1", json={"card": draft})
    assert response.status_code == 200, response.text
    saved = response.json()["cards"][0]
    assert not api.get("/api/v1/inventory").json()["cards"]
    assert api.get("/api/v1/listings").json()["cards"][0]["status"] == "draft"
    old = datetime.now(timezone.utc) - timedelta(days=2)
    db.execute(text("UPDATE listing_photos SET created_at = :old"), {"old": old})
    for key in list(s3.objects):
        s3.objects[key] = (*s3.objects[key][:2], old)
    assert cleanup_photos(session, s3)["objects"] == []
    saved.update(name="Pikachu", set="Base · 58/102", price=50, status="available")
    response = api.put("/api/v1/listings/c1", json={"card": saved})
    assert response.status_code == 200, response.text
    public = api.get("/api/v1/inventory").json()["cards"]
    assert len(public) == 1 and public[0]["photoRoles"] == ["front"]
    session.close()
