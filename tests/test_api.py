from fastapi.testclient import TestClient

from sentinel.api import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_analyze_endpoint_rejects_empty_events():
    response = client.post("/v1/analyze", json={"events": []})
    assert response.status_code == 422


def test_analyze_endpoint_returns_report():
    response = client.post("/v1/analyze", json={"source": "test", "events": [
        {"timestamp": "2026-01-01T00:00:00Z", "service": "api", "status_code": 500, "level": "ERROR"}
    ]})
    assert response.status_code == 200
    assert response.json()["total_events"] == 1
