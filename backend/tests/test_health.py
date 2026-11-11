from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_check_reports_liveness() -> None:
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert response.headers["x-request-id"]


def test_api_v1_root_is_available() -> None:
    response = client.get("/api/v1/")

    assert response.status_code == 200
    assert response.json() == {"name": "SkyFare API", "version": "v1"}


def test_http_errors_use_the_shared_error_contract() -> None:
    response = client.get("/api/v1/not-found")

    assert response.status_code == 404
    assert response.json()["code"] == "http_error"
    assert response.json()["request_id"] == response.headers["x-request-id"]
