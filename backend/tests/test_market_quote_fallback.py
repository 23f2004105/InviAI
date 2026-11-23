"""
Yahoo's quoteSummary ("info") is often blocked from cloud hosts such as Render,
while the chart-based fast_info still works. Quotes must use fast_info then,
not fall back to sample prices.
"""
import pytest

from app.services import market_data as md


class _FastInfo(dict):
    pass


class _BlockedInfoTicker:
    def __init__(self, symbol):
        self.symbol = symbol

    @property
    def info(self):
        raise RuntimeError("401 Unauthorized: Invalid Crumb")

    @property
    def fast_info(self):
        return _FastInfo(lastPrice=5648197.5, previousClose=5630836.0, open=5667783.0,
                         dayHigh=5675335.5, dayLow=5646915.5, lastVolume=1234, currency="INR",
                         exchange="CCC")


@pytest.fixture
def blocked_info(monkeypatch):
    monkeypatch.setattr(md.yf, "Ticker", _BlockedInfoTicker)
    svc = md.MarketDataService()
    return svc


def test_stock_info_uses_fast_info_when_info_blocked(blocked_info):
    info = blocked_info._fetch_stock_info("BTC-INR")
    assert info["currentPrice"] == 5648197.5
    assert info["previousClose"] == 5630836.0
    assert not info.get("is_mock")


def test_quote_endpoint_reports_live_and_mock_flag(client, monkeypatch):
    from app.routers import market
    monkeypatch.setattr(md.yf, "Ticker", _BlockedInfoTicker)
    monkeypatch.setattr(market, "market_service", md.MarketDataService())
    r = client.get("/api/market/quote/BTC-INR")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["current_price"] == 5648197.5
    assert data["is_mock"] is False
