"""The card scanner: parsing parity with leftovers.gg, the /scan endpoint, and the listing's catalog link."""

import json
import uuid
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Connection, text

from app.config import settings
from app.main import app
from app.services import ocr
from app.services.ocr import _parse_pokemon_card_text

JPEG = b"\xff\xd8\xff\xe0" + b"\0" * 64
REFERENCE = json.loads((Path(__file__).parent / "fixtures" / "scanner-python-reference.json").read_text())


@pytest.mark.parametrize("case", REFERENCE["parse"], ids=lambda c: c["text"].split("\n")[0][:30] or "empty")
def test_parsing_matches_leftovers_reference(case: dict) -> None:
    assert _parse_pokemon_card_text(case["text"]) == case["expected"]


# ---- a small catalog in the test database ----

EXPANSIONS = {
    "base": ("base1", "Base", None, "EN"),
    "base2": ("base4", "Base Set 2", None, "EN"),
    "ja": ("sm4s_ja", "覚醒の勇者", None, "JA"),
}


def seed_catalog(db: Connection) -> dict:
    ids = {}
    for key, (external_id, name, name_en, lang) in EXPANSIONS.items():
        ids[key] = uuid.uuid4()
        db.execute(text("""INSERT INTO expansions_v2 (id, external_id, game, name, name_en, language, language_code, last_synced_at)
                           VALUES (:id, :x, 'pokemon', :n, :ne, 'x', :l, now())"""), {"id": ids[key], "x": external_id, "n": name, "ne": name_en, "l": lang})
    cards = {
        "charizard": ("base", "Charizard", None, "4", "4/102", "120", "Mitsuhiro Arita", "Rare Holo", "EN"),
        "blastoise_a": ("base", "Blastoise", None, "2", "2/102", "100", "Ken Sugimori", "Rare Holo", "EN"),
        "blastoise_b": ("base2", "Blastoise", None, "2", "2/102", "100", "Ken Sugimori", "None", "EN"),
        "gengar": ("ja", "ゲンガー", "Gengar", "22", "022/050", "130", "kawayoo", "希少", "JA"),
    }
    for key, (exp, name, en_name, number, printed, hp, artist, rarity, lang) in cards.items():
        ids[key] = uuid.uuid4()
        db.execute(text("""INSERT INTO cards_v2 (id, external_id, game, expansion_id, name, en_name, number, printed_number, hp, artist,
                                                 rarity, language, language_code, images, last_synced_at)
                           VALUES (:id, :x, 'pokemon', :e, :n, :en, :num, :pn, :hp, :a, :r, 'x', :l, CAST(:img AS jsonb), now())"""),
                   {"id": ids[key], "x": key, "e": ids[exp], "n": name, "en": en_name, "num": number, "pn": printed, "hp": hp,
                    "a": artist, "r": rarity, "l": lang, "img": json.dumps([{"small": f"https://img.test/{key}/small"}])})
    return ids


@pytest.fixture
def scanner(api: TestClient, db: Connection, monkeypatch: pytest.MonkeyPatch):
    """Scan with a given OCR text: Google Vision is faked, parsing and matching run for real."""
    ids = seed_catalog(db)
    ocr_text = {"value": ""}
    monkeypatch.setattr(ocr, "detect_text", lambda image: ocr_text["value"])

    def scan(text_read: str, **kwargs):
        ocr_text["value"] = text_read
        return api.post("/api/v1/scan", content=kwargs.get("body", JPEG), headers={"Content-Type": kwargs.get("type", "image/jpeg")})

    scan.ids = ids
    return scan


def test_card_number_match_fills_listing_fields(scanner) -> None:
    response = scanner("Charizard\n120 HP\nIllus. Mitsuhiro Arita\n4/102")
    assert response.status_code == 200
    body = response.json()
    assert (body["status"], body["method"], body["confidence"]) == ("matched", "v3_printed_number", 0.99)
    assert body["card"] == {"id": str(scanner.ids["charizard"]), "name": "Charizard", "set": "Base · 4/102 · Rare Holo",
                            "catalog_name": "Charizard", "image_url": "https://img.test/charizard/small", "language_code": "EN"}
    assert body["ocr"]["set_number"] == "4/102" and body["ocr"]["illustrator"] == "Mitsuhiro Arita"


def test_identical_printings_are_offered_as_candidates(scanner) -> None:
    body = scanner("Blastoise\n100 HP\nIllus. Ken Sugimori\n2/102").json()
    assert body["status"] == "ambiguous"
    assert {c["set"] for c in body["candidates"]} == {"Base · 2/102 · Rare Holo", "Base Set 2 · 2/102"}  # 'None' rarity hidden


def test_japanese_cards_use_english_name_and_are_labelled(scanner) -> None:
    body = scanner("たね\nゲンガー HP130\n弱点\n022/050").json()
    assert body["status"] == "matched"
    assert body["card"]["name"] == "Gengar (Japanese)" and body["card"]["set"] == "覚醒の勇者 · 022/050 · 希少"


def test_unknown_and_unreadable_cards(scanner) -> None:
    assert scanner("Mew\n999/999").json()["status"] == "no_match"
    assert scanner("").json()["status"] == "no_text"


@pytest.mark.parametrize("kwargs,code", [
    ({"type": "image/png"}, 400),
    ({"body": b"GIF89a" + b"\0" * 20}, 400),
    ({"body": JPEG + b"\0" * (4 * 1024 * 1024)}, 413),
])
def test_scan_input_checks(scanner, kwargs: dict, code: int) -> None:
    assert scanner("Charizard\n4/102", **kwargs).status_code == code


def test_vision_failures_are_502_with_a_friendly_message(scanner, monkeypatch: pytest.MonkeyPatch) -> None:
    def broken(image):
        raise RuntimeError("Google Vision error: quota")
    monkeypatch.setattr(ocr, "detect_text", broken)
    response = scanner("ignored")
    assert response.status_code == 502 and "unavailable" in response.json()["detail"]


def test_missing_vision_credentials_are_reported(api: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "google_credentials_base64", None)
    monkeypatch.setattr(settings, "google_vision_api_key", None)
    ocr._vision_client.cache_clear()
    try:
        response = api.post("/api/v1/scan", content=JPEG, headers={"Content-Type": "image/jpeg"})
        assert response.status_code == 503 and "GOOGLE_CREDENTIALS_BASE64" in response.json()["detail"]
    finally:
        ocr._vision_client.cache_clear()


def test_scan_requires_sign_in(migrated_engine) -> None:
    response = TestClient(app).post("/api/v1/scan", content=JPEG, headers={"Content-Type": "image/jpeg"})
    assert response.status_code == 401


# ---- the listing remembers which catalog card a scan identified ----

CARD = {"id": "c1", "name": "Charizard", "set": "Base · 4/102 · Rare Holo", "price": 500, "condition": "Near Mint", "sold": False,
        "photos": ["images/full/c1_1.jpg"], "photoRoles": ["front"], "thumb": "images/full/c1_1.jpg", "description": ""}


def seller_card(api: TestClient) -> dict:
    return api.get("/api/v1/listings").json()["cards"][0]


def test_catalog_link_is_saved_kept_and_cleared(api: TestClient, db: Connection) -> None:
    ids = seed_catalog(db)
    charizard = str(ids["charizard"])
    assert api.put("/api/v1/listings/c1", json={"card": {**CARD, "catalogCardId": charizard}}).status_code == 200
    assert seller_card(api)["catalogCardId"] == charizard
    assert "catalogCardId" not in api.get("/api/v1/inventory").json()["cards"][0]  # private to the seller
    without_link = {k: v for k, v in seller_card(api).items() if k != "catalogCardId"}
    api.put("/api/v1/listings/c1", json={"card": {**without_link, "price": 550}})
    assert seller_card(api)["catalogCardId"] == charizard  # omitted: kept
    api.put("/api/v1/listings/c1", json={"card": {**seller_card(api), "catalogCardId": None}})
    assert "catalogCardId" not in seller_card(api)  # null: cleared


@pytest.mark.parametrize("value", ["not-a-uuid", 42, str(uuid.uuid4())])
def test_invalid_or_unknown_catalog_cards_are_rejected(api: TestClient, value) -> None:
    response = api.put("/api/v1/listings/c1", json={"card": {**CARD, "catalogCardId": value}})
    assert response.status_code == 400 and "catalog card" in response.json()["detail"]


@pytest.mark.parametrize('query,expected', [
    ('CHARIZ', {'charizard'}), ('Blastoise Base Set 2', {'blastoise_b'}),
    ('4/102', {'charizard'}), ('Gengar', {'gengar'}), ('ゲンガー', {'gengar'}),
    ('missing', set()), ('%%', set()), ('__', set()), ('  ', set()),
])
def test_catalog_search(api, db, query, expected):
    ids = seed_catalog(db)
    response = api.get('/api/v1/catalog/search', params={'q': query})
    assert response.status_code == 200
    assert {c['id'] for c in response.json()['cards']} == {str(ids[k]) for k in expected}
    assert response.json()['has_more'] is False


def test_catalog_search_requires_sign_in(migrated_engine):
    assert TestClient(app).get('/api/v1/catalog/search?q=Charizard').status_code == 401


@pytest.mark.parametrize('query', ['', 'x', 'a' * 101])
def test_catalog_search_input_limits(api, query):
    assert api.get('/api/v1/catalog/search', params={'q': query}).status_code == 422
