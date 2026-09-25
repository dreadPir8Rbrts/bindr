"""Inventory, listing and appearance endpoints against the local test database."""

import pytest
from fastapi.testclient import TestClient

from app.main import app

CARD = {
    "id": "c1", "name": "Pikachu", "set": "Base Set · 58/102", "price": 50, "condition": "Near Mint", "sold": False,
    "photos": ["images/full/c1_1.jpg"], "thumb": "images/grid/c1.jpg", "description": "Example", "photoRoles": ["front"],
}


def put(api: TestClient, card: dict, **extra):
    return api.put(f"/api/v1/listings/{card['id']}", json={"card": card, **extra})


def seller_card(api: TestClient, card_id: str) -> dict:
    return next(c for c in api.get("/api/v1/listings").json()["cards"] if c["id"] == card_id)


def test_new_listing_appears_in_public_inventory(api: TestClient) -> None:
    assert put(api, CARD).status_code == 200
    public = api.get("/api/v1/inventory").json()
    assert public["cards"] == [{**CARD, "rare": False}]
    assert public["appearance"]["color"] == "navy"
    assert "version" not in public["cards"][0] and "status" not in public["cards"][0]


def test_seller_view_carries_status_and_version(api: TestClient) -> None:
    put(api, CARD)
    card = seller_card(api, "c1")
    assert (card["status"], card["version"]) == ("available", 1)


def test_price_edit_bumps_version(api: TestClient) -> None:
    put(api, CARD)
    response = put(api, {**seller_card(api, "c1"), "price": 80.5})
    assert response.status_code == 200
    card = seller_card(api, "c1")
    assert (card["price"], card["version"]) == (80.5, 2)


def test_stale_tab_cannot_overwrite_newer_save(api: TestClient) -> None:
    put(api, CARD)
    stale = seller_card(api, "c1")
    assert put(api, {**stale, "sold": True}).status_code == 200
    response = put(api, {**stale, "price": 70})
    assert response.status_code == 409
    assert seller_card(api, "c1")["sold"] is True


def test_saving_one_listing_does_not_block_another(api: TestClient) -> None:
    # The Netlify version had one revision for the whole inventory; versions are now per listing.
    put(api, CARD)
    assert put(api, {**CARD, "id": "c2", "photos": ["images/full/c2_1.jpg"], "thumb": "images/grid/c2.jpg"}).status_code == 200
    c1, c2 = seller_card(api, "c1"), seller_card(api, "c2")
    assert put(api, {**c1, "price": 60}).status_code == 200
    assert put(api, {**c2, "price": 70}).status_code == 200


def test_creating_an_existing_id_or_saving_a_deleted_listing_conflicts(api: TestClient) -> None:
    put(api, CARD)
    assert put(api, CARD).status_code == 409  # no version: treated as a create
    card = seller_card(api, "c1")
    assert api.delete("/api/v1/listings/c1", params={"version": card["version"]}).status_code == 200
    assert put(api, card).status_code == 409


def test_sold_listings_record_when_they_sold(api: TestClient, db) -> None:
    from sqlalchemy import text
    put(api, CARD)
    put(api, {**seller_card(api, "c1"), "sold": True})
    first = db.execute(text("SELECT sold_at FROM listings WHERE id = 'c1'")).scalar_one()
    put(api, {**seller_card(api, "c1"), "price": 55})  # still sold: time kept
    assert db.execute(text("SELECT sold_at FROM listings WHERE id = 'c1'")).scalar_one() == first
    put(api, {**seller_card(api, "c1"), "sold": False})
    assert db.execute(text("SELECT sold_at FROM listings WHERE id = 'c1'")).scalar_one() is None


def test_delete_requires_current_version(api: TestClient) -> None:
    put(api, CARD)
    assert api.delete("/api/v1/listings/c1", params={"version": 99}).status_code == 409
    assert api.delete("/api/v1/listings/c9", params={"version": 1}).status_code == 404
    response = api.delete("/api/v1/listings/c1", params={"version": 1})
    assert response.status_code == 200 and response.json()["cards"] == []
    assert api.get("/api/v1/inventory").json()["cards"] == []


@pytest.mark.parametrize("patch", [
    {"price": -1}, {"price": 0}, {"price": "50"}, {"price": 100_000_001}, {"name": ""}, {"name": "   "},
    {"set": ""}, {"id": "<script>"}, {"condition": "invented"}, {"sold": "yes"},
    {"photos": []}, {"photos": ["https://other.test/a.jpg"]}, {"photos": ["images/../secret.jpg"]},
    {"thumb": "images/../secret.jpg"}, {"photoRoles": ["cover"]}, {"description": "x" * 20001},
    {"photos": ["images/a.jpg", "images/b.jpg"], "photoRoles": ["front", "front"]},
    {"photos": ["images/a.jpg", "images/a.jpg"], "photoRoles": ["", ""]},
])
def test_invalid_fields_and_unsafe_images_rejected(api: TestClient, patch: dict) -> None:
    card = {**CARD, **patch}
    response = api.put(f"/api/v1/listings/{CARD['id']}", json={"card": card})
    assert response.status_code == 400, patch
    assert isinstance(response.json()["detail"], str)


def test_address_and_card_id_must_match(api: TestClient) -> None:
    assert api.put("/api/v1/listings/c2", json={"card": CARD}).status_code == 400


def test_drafts_may_be_incomplete_and_stay_private(api: TestClient) -> None:
    response = put(api, {"id": "c5", "status": "draft", "name": "", "set": "", "photos": [], "price": 0})
    assert response.status_code == 200
    assert seller_card(api, "c5")["status"] == "draft"
    assert api.get("/api/v1/inventory").json()["cards"] == []


def test_publishing_a_draft_requires_complete_fields(api: TestClient) -> None:
    put(api, {"id": "c5", "status": "draft", "name": "Pikachu", "photos": []})
    draft = seller_card(api, "c5")
    incomplete = {k: v for k, v in draft.items() if k != "status"}
    assert put(api, incomplete).status_code == 400
    complete = {**CARD, "id": "c5", "version": draft["version"]}
    assert put(api, complete).status_code == 200
    assert [c["id"] for c in api.get("/api/v1/inventory").json()["cards"]] == ["c5"]


def test_photos_can_be_reordered_and_roles_swapped(api: TestClient) -> None:
    photos = ["images/full/c1_1.jpg", "images/full/c1_2.jpg", "images/full/c1_3.jpg"]
    put(api, {**CARD, "photos": photos, "photoRoles": ["front", "back", "detail"], "thumb": photos[0]})
    reordered = [photos[1], photos[0], photos[2]]
    response = put(api, {**seller_card(api, "c1"), "photos": reordered, "photoRoles": ["front", "back", ""], "thumb": reordered[0]})
    assert response.status_code == 200
    card = seller_card(api, "c1")
    assert card["photos"] == reordered and card["photoRoles"] == ["front", "back", ""] and card["thumb"] == reordered[0]


def test_removed_photos_are_dropped(api: TestClient) -> None:
    put(api, {**CARD, "photos": ["images/a.jpg", "images/b.jpg"], "photoRoles": ["", ""], "thumb": "images/a.jpg"})
    put(api, {**seller_card(api, "c1"), "photos": ["images/b.jpg"], "photoRoles": [""], "thumb": "images/b.jpg"})
    assert seller_card(api, "c1")["photos"] == ["images/b.jpg"]


def test_a_photo_belongs_to_one_listing(api: TestClient) -> None:
    put(api, CARD)
    assert put(api, {**CARD, "id": "c2"}).status_code == 400


def test_photo_frames_are_validated_and_kept_when_omitted(api: TestClient) -> None:
    frame = {"x": 0.1, "y": 0.1, "w": 0.8, "h": 0.8}
    photo = CARD["photos"][0]
    put(api, {**CARD, "photoFrames": {photo: frame, "images/not-in-listing.jpg": frame}})
    assert seller_card(api, "c1")["photoFrames"] == {photo: frame}
    without_frames = {k: v for k, v in seller_card(api, "c1").items() if k != "photoFrames"}
    put(api, {**without_frames, "price": 60})
    assert seller_card(api, "c1")["photoFrames"] == {photo: frame}
    for bad in [{"x": -0.1, "y": 0, "w": 0.5, "h": 0.5}, {"x": 0.6, "y": 0, "w": 0.5, "h": 0.5}, {"x": 0, "y": 0, "w": 0.01, "h": 0.5}]:
        assert put(api, {**seller_card(api, "c1"), "photoFrames": {photo: bad}}).status_code == 400


def test_ebay_links_are_kept_when_omitted_and_unique_across_cards(api: TestClient) -> None:
    link = {"itemId": "267788402617", "status": "active", "checkedAt": "2026-09-18T12:00:00.000Z"}
    put(api, {**CARD, "ebayListings": [link]})
    assert seller_card(api, "c1")["ebayListings"] == [link]
    without_links = {k: v for k, v in seller_card(api, "c1").items() if k != "ebayListings"}
    put(api, {**without_links, "price": 60})
    assert seller_card(api, "c1")["ebayListings"] == [link]
    response = put(api, {**CARD, "id": "c2", "photos": ["images/c2.jpg"], "thumb": "images/c2.jpg", "ebayListings": [link]})
    assert response.status_code == 400
    assert response.json()["detail"] == "That eBay listing is already linked to another card."
    put(api, {**seller_card(api, "c1"), "ebayListings": []})
    assert "ebayListings" not in seller_card(api, "c1")


@pytest.mark.parametrize("links", [
    [{"itemId": "123", "status": "active", "checkedAt": "2026-09-18T12:00:00Z"}],
    [{"itemId": "267788402617", "status": "deleted", "checkedAt": "2026-09-18T12:00:00Z"}],
    [{"itemId": "267788402617", "status": "active", "checkedAt": "yesterday"}],
    [{"itemId": "267788402617", "status": "active", "checkedAt": "2026-09-18T12:00:00Z"}] * 2,
    [{"itemId": str(267788402600 + i), "status": "active", "checkedAt": "2026-09-18T12:00:00Z"} for i in range(21)],
])
def test_invalid_ebay_links_rejected(api: TestClient, links: list) -> None:
    assert put(api, {**CARD, "ebayListings": links}).status_code == 400


def test_public_revision_changes_with_listings_and_appearance(api: TestClient) -> None:
    first = api.get("/api/v1/inventory").json()["revision"]
    assert api.get("/api/v1/inventory").json()["revision"] == first
    put(api, CARD)
    second = api.get("/api/v1/inventory").json()["revision"]
    assert second != first
    appearance = api.get("/api/v1/appearance").json()
    api.put("/api/v1/appearance", json={**appearance, "color": "olive"})
    assert api.get("/api/v1/inventory").json()["revision"] != second


def test_appearance_saves_with_revision_check(api: TestClient) -> None:
    current = api.get("/api/v1/appearance").json()
    assert (current["color"], current["style"], current["rings"]) == ("navy", "modern", False)
    saved = api.put("/api/v1/appearance", json={"color": "retro", "style": "classic", "rings": True, "revision": current["revision"]})
    assert saved.status_code == 200 and saved.json()["color"] == "retro"
    stale = api.put("/api/v1/appearance", json={"color": "mint", "style": "soft", "rings": False, "revision": current["revision"]})
    assert stale.status_code == 409
    fresh = saved.json()["revision"]
    for bad in [{"color": "pink"}, {"style": "retro"}, {"rings": "yes"}]:
        body = {"color": "mint", "style": "soft", "rings": False, "revision": fresh, **bad}
        assert api.put("/api/v1/appearance", json=body).status_code == 400


@pytest.mark.parametrize("method,path", [
    ("get", "/api/v1/listings"), ("put", "/api/v1/listings/c1"),
    ("delete", "/api/v1/listings/c1?version=1"), ("put", "/api/v1/appearance"),
])
def test_seller_endpoints_require_sign_in(migrated_engine, method: str, path: str) -> None:
    # No dependency overrides: the real Supabase check runs and there is no token.
    client = TestClient(app)
    response = getattr(client, method)(path, **({"json": {"card": CARD}} if method == "put" else {}))
    assert response.status_code == 401
