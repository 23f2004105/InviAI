"""
Optimization Router
Markowitz mean-variance weights and rebalancing suggestions for a portfolio.
Educational only - suggests, never places orders.
"""

import math
from typing import Dict, Literal

import numpy as np
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Asset, LocalUser
from app.routers.assets import get_portfolio_or_404
from app.routers.auth_local import get_current_user
from app.services.market_data import market_data_service
from app.services.optimizer import (
    RISK_FREE_RATE,
    InsufficientDataError,
    build_return_stats,
    optimize_weights,
    portfolio_metrics,
)

router = APIRouter()

REBALANCE_THRESHOLD = 5.0  # percentage points of drift before suggesting a trade
INSUFFICIENT_MSG = "Optimization needs at least 2 holdings with 60+ days of price history."


# ========================================
# Helpers
# ========================================

def _date_key(value) -> str:
    if hasattr(value, "strftime"):
        return value.strftime("%Y-%m-%d")
    return str(value)[:10]


def _closes(symbol: str):
    """symbol history -> ({YYYY-MM-DD: close}, is_sample_data)"""
    rows = market_data_service.get_stock_history(symbol, period="1y", interval="1d") or []
    closes, sample = {}, False
    for row in rows:
        if "Close" in row:
            date, close = row.get("Date"), row["Close"]
        elif "close" in row:
            date, close, sample = row.get("date"), row["close"], True
        else:
            continue
        if date is None or close is None:
            continue
        close = float(close)
        if math.isfinite(close) and close > 0:
            closes[_date_key(date)] = close
    return closes, sample


# ========================================
# Endpoint
# ========================================

@router.post("/{portfolio_id}/optimize")
def optimize_portfolio(
    portfolio_id: int,
    risk: Literal["conservative", "moderate", "aggressive"] = Query("moderate"),
    current_user: LocalUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Suggest long-only weights for the portfolio's holdings and the trades to reach them."""
    get_portfolio_or_404(db, portfolio_id, current_user.id)
    assets = db.query(Asset).filter(Asset.portfolio_id == portfolio_id).all()

    # Merge duplicate symbols (the same stock added twice)
    holdings: Dict[str, dict] = {}
    for a in assets:
        h = holdings.setdefault(a.symbol, {"symbol": a.symbol, "name": a.name, "quantity": 0.0,
                                           "value": 0.0, "price": a.current_price or 0.0})
        h["quantity"] += a.quantity or 0.0
        h["value"] += a.current_value or 0.0
        if a.current_price:
            h["price"] = a.current_price

    closes, uses_sample = {}, False
    for sym in holdings:
        c, sample = _closes(sym)
        closes[sym] = c
        uses_sample = uses_sample or sample

    try:
        stats = build_return_stats(closes)
    except InsufficientDataError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=INSUFFICIENT_MSG)

    n = len(stats.symbols)
    total = sum(holdings[s]["value"] for s in stats.symbols)
    current = np.array([holdings[s]["value"] / total if total > 0 else 1.0 / n for s in stats.symbols])
    suggested = optimize_weights(stats, risk)
    equal = np.full(n, 1.0 / n)

    rows = []
    for i, sym in enumerate(stats.symbols):
        h = holdings[sym]
        cur_pct, sug_pct = current[i] * 100, suggested[i] * 100
        drift = round(sug_pct - cur_pct, 1)
        if drift > REBALANCE_THRESHOLD:
            action = "buy"
        elif drift < -REBALANCE_THRESHOLD:
            action = "sell"
        else:
            action = "hold"
        shares = 0
        if action != "hold" and h["price"] > 0:
            shares = int(math.floor(abs(sug_pct - cur_pct) / 100 * total / h["price"]))
        rows.append({
            "symbol": sym,
            "name": h["name"],
            "current_price": h["price"],
            "quantity": h["quantity"],
            "current_weight": round(cur_pct, 2),
            "suggested_weight": round(sug_pct, 2),
            "drift": drift,
            "action": action,
            "shares": shares,
        })

    return {
        "risk_profile": risk,
        "method": "Markowitz mean-variance (1y daily returns)",
        "risk_free_rate": RISK_FREE_RATE,
        "days_used": stats.days,
        "uses_sample_data": uses_sample,
        "metrics": {
            "current": portfolio_metrics(current, stats),
            "suggested": portfolio_metrics(suggested, stats),
            "equal_weight": portfolio_metrics(equal, stats),
        },
        "holdings": rows,
    }
