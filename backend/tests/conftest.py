"""
Shared test fixtures.

Tests run against a throwaway in-memory SQLite database (no Postgres needed)
and never call Yahoo Finance: get_current_price is stubbed.
"""

import os

os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret")
os.environ["RUN_MIGRATIONS_ON_STARTUP"] = "false"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.rate_limit import limiter
from app.services.market_data import market_data_service
from app import models  # noqa: F401  (registers tables on Base.metadata)


@pytest.fixture()
def db_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    yield TestingSession
    Base.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture()
def client(db_session, monkeypatch):
    def override_get_db():
        db = db_session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    # Fixed price for every symbol, no network
    monkeypatch.setattr(
        market_data_service,
        "get_current_price",
        lambda symbol: {"symbol": symbol, "current_price": 100.0, "is_mock": False},
    )

    limiter.enabled = False
    yield TestClient(app)
    limiter.enabled = True
    limiter.reset()
    app.dependency_overrides.clear()


def register(client, email="user@example.com", password="Passw0rdX"):
    r = client.post("/api/auth/register", json={"email": email, "password": password, "full_name": "Test"})
    assert r.status_code == 201, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}
