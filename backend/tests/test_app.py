from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health() -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_serves_buyer_and_seller_pages() -> None:
    buyer = client.get("/")
    assert buyer.status_code == 200
    assert "PokémonHooper’s binder" in buyer.text
    seller = client.get("/seller.html")
    assert seller.status_code == 200
    assert 'id="scanFrontPhoto"' in seller.text


def test_repository_files_are_not_served() -> None:
    for path in ["/.env", "/../.env", "/%2e%2e/.env", "/README-DEVELOPER.md", "/backend/app/config.py"]:
        assert client.get(path).status_code == 404, path


def test_unknown_api_path_is_json_404() -> None:
    response = client.post("/api/v1/nope")
    assert response.status_code == 404
    assert response.json() == {"detail": "Not found"}


def test_security_headers() -> None:
    for path in ["/", "/api/v1/health"]:
        headers = client.get(path).headers
        assert headers["x-content-type-options"] == "nosniff"
        assert headers["x-frame-options"] == "DENY"
        assert headers["referrer-policy"] == "strict-origin-when-cross-origin"
