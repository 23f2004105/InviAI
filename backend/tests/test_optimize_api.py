from datetime import date, timedelta
import zlib

import numpy as np
import pytest

from app.services.market_data import market_data_service
from tests.conftest import register

SAMPLE_SYMBOLS = set()  # symbols whose stubbed history looks like the mock fallback


def fake_history(symbol, period="1mo", interval="1d"):
    rng = np.random.default_rng(zlib.crc32(symbol.encode()))
    mu, sigma = rng.uniform(0.0002, 0.0012), rng.uniform(0.008, 0.025)
    prices = 100 * np.cumprod(1 + rng.normal(mu, sigma, 250))
    start = date(2025, 11, 1)
    if symbol in SAMPLE_SYMBOLS:
        return [{"date": (start + timedelta(days=i)).isoformat(), "close": float(p)} for i, p in enumerate(prices)]
    from datetime import datetime
    return [{"Date": datetime.combine(start + timedelta(days=i), datetime.min.time()), "Close": float(p)}
            for i, p in enumerate(prices)]


@pytest.fixture(autouse=True)
def stub_history(monkeypatch):
    SAMPLE_SYMBOLS.clear()
    monkeypatch.setattr(market_data_service, "get_stock_history", fake_history)


def portfolio_with(client, headers, holdings):
    p = client.post("/api/portfolios/", json={"name": "P", "initial_value": 0}, headers=headers).json()
    for sym, qty in holdings:
        r = client.post(f"/api/portfolios/{p['id']}/assets",
                        json={"symbol": sym, "name": sym, "quantity": qty, "average_cost": 90}, headers=headers)
        assert r.status_code == 201, r.text
    return p["id"]


def test_optimize_returns_weights_and_metrics(client):
    h = register(client)
    pid = portfolio_with(client, h, [("RELIANCE", 10), ("TCS", 5), ("INFY", 8)])
    r = client.post(f"/api/portfolios/{pid}/optimize?risk=moderate", headers=h)
    assert r.status_code == 200, r.text
    data = r.json()
    assert abs(sum(x["suggested_weight"] for x in data["holdings"]) - 100) <= 0.5
    assert set(data["metrics"]) == {"current", "suggested", "equal_weight"}
    assert data["uses_sample_data"] is False
    assert data["risk_profile"] == "moderate"


def test_optimize_rebalance_actions_consistent(client):
    h = register(client)
    pid = portfolio_with(client, h, [("RELIANCE", 10), ("TCS", 50), ("INFY", 8), ("ITC", 3)])
    for risk in ("conservative", "moderate", "aggressive"):
        data = client.post(f"/api/portfolios/{pid}/optimize?risk={risk}", headers=h).json()
        for x in data["holdings"]:
            if abs(x["drift"]) <= 5:
                assert x["action"] == "hold" and x["shares"] == 0
            elif x["drift"] > 5:
                assert x["action"] == "buy"
            else:
                assert x["action"] == "sell"


def test_optimize_merges_duplicate_symbols(client):
    h = register(client)
    pid = portfolio_with(client, h, [("RELIANCE", 10), ("RELIANCE", 5), ("TCS", 5)])
    data = client.post(f"/api/portfolios/{pid}/optimize", headers=h).json()
    assert len(data["holdings"]) == 2
    rel = next(x for x in data["holdings"] if x["symbol"] == "RELIANCE.NS")
    assert rel["quantity"] == 15


def test_optimize_needs_two_holdings(client):
    h = register(client)
    pid = portfolio_with(client, h, [("RELIANCE", 10)])
    r = client.post(f"/api/portfolios/{pid}/optimize", headers=h)
    assert r.status_code == 400
    assert "at least 2" in r.json()["detail"]


def test_optimize_flags_sample_data(client):
    h = register(client)
    pid = portfolio_with(client, h, [("RELIANCE", 10), ("TCS", 5)])
    SAMPLE_SYMBOLS.add("TCS.NS")
    data = client.post(f"/api/portfolios/{pid}/optimize", headers=h).json()
    assert data["uses_sample_data"] is True


def test_optimize_invalid_risk_422(client):
    h = register(client)
    pid = portfolio_with(client, h, [("RELIANCE", 10), ("TCS", 5)])
    assert client.post(f"/api/portfolios/{pid}/optimize?risk=yolo", headers=h).status_code == 422


def test_optimize_other_users_portfolio_404(client):
    alice = register(client, "alice@example.com")
    bob = register(client, "bob@example.com")
    pid = portfolio_with(client, alice, [("RELIANCE", 10), ("TCS", 5)])
    assert client.post(f"/api/portfolios/{pid}/optimize", headers=bob).status_code == 404


def test_optimize_requires_auth(client):
    assert client.post("/api/portfolios/1/optimize").status_code == 401
