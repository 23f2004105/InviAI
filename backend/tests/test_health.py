"""
Basic health check tests for Envi AI backend
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root_endpoint():
    """Test root endpoint returns API info"""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Envi AI API"
    assert "version" in data
    assert data["status"] == "operational"


def test_health_endpoint():
    """Test health endpoint returns service status"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("healthy", "degraded")
    assert "services" in data
    assert data["services"]["api"] == "healthy"


def test_docs_endpoint():
    """Test that Swagger docs are available"""
    response = client.get("/docs")
    assert response.status_code == 200


def test_redoc_endpoint():
    """Test that ReDoc is available"""
    response = client.get("/redoc")
    assert response.status_code == 200
