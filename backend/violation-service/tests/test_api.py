from fastapi.testclient import TestClient
from app.main import app
import pytest

client = TestClient(app)

def test_health_check():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_read_incidents():
    response = client.get("/api/v1/incidents/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_generate_report_no_id():
    response = client.get("/api/v1/reports/99999/generate")
    # Expect error or empty
    assert response.status_code == 200 
    assert "error" in response.json() or "report" in response.json()
