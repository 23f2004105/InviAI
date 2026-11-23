"""
Portfolio optimization - Markowitz mean-variance (Modern Portfolio Theory).

Pure functions: no database or network access, so they can be unit tested.
Inputs are daily closing prices; outputs are long-only weights that sum to 1.
Educational use only - no trading.
"""

from dataclasses import dataclass
from typing import Dict, List

import numpy as np
from scipy.optimize import minimize

RISK_FREE_RATE = 0.065   # approx. Indian 10-year government bond yield
TRADING_DAYS = 252
MAX_WEIGHT = 0.40        # per-stock cap, keeps suggestions diversified
MIN_DAYS = 60            # minimum common daily returns needed
RISK_PROFILES = ("conservative", "moderate", "aggressive")
AGGRESSIVE_RISK_AVERSION = 1.0


class InsufficientDataError(ValueError):
    """Not enough holdings or price history to optimize."""


@dataclass
class ReturnStats:
    symbols: List[str]
    mean: np.ndarray   # annualised expected returns
    cov: np.ndarray    # annualised covariance matrix
    days: int          # number of daily returns used


def build_return_stats(closes: Dict[str, Dict[str, float]]) -> ReturnStats:
    """
    closes: symbol -> {"YYYY-MM-DD": close}. Only dates present for every
    symbol are used, so all return series line up.
    """
    symbols = list(closes)
    if len(symbols) < 2:
        raise InsufficientDataError("need at least 2 holdings")

    common = set.intersection(*(set(closes[s]) for s in symbols))
    dates = sorted(common)
    if len(dates) - 1 < MIN_DAYS:
        raise InsufficientDataError(f"need at least {MIN_DAYS} days of common price history")

    prices = np.array([[closes[s][d] for s in symbols] for d in dates], dtype=float)
    returns = prices[1:] / prices[:-1] - 1
    mean = returns.mean(axis=0) * TRADING_DAYS
    cov = np.cov(returns, rowvar=False) * TRADING_DAYS
    return ReturnStats(symbols=symbols, mean=mean, cov=cov, days=returns.shape[0])


def weight_cap(n: int) -> float:
    """40% per stock; with fewer than 3 holdings the cap can't be met, so lift it."""
    return MAX_WEIGHT if n >= 3 else 1.0


def portfolio_metrics(weights: np.ndarray, stats: ReturnStats) -> dict:
    """Expected annual return, volatility and Sharpe ratio for a weight vector."""
    w = np.asarray(weights, dtype=float)
    ret = float(stats.mean @ w)
    vol = float(np.sqrt(max(w @ stats.cov @ w, 0.0)))
    sharpe = (ret - RISK_FREE_RATE) / vol if vol > 0 else 0.0
    return {"expected_return": ret, "volatility": vol, "sharpe": float(sharpe)}


def optimize_weights(stats: ReturnStats, risk: str) -> np.ndarray:
    """
    conservative -> minimum variance
    moderate     -> maximum Sharpe ratio
    aggressive   -> maximise return - 1.0 * variance
    """
    if risk not in RISK_PROFILES:
        raise ValueError(f"unknown risk profile: {risk}")

    n = len(stats.symbols)
    mu, cov = stats.mean, stats.cov

    def variance(w):
        return float(w @ cov @ w)

    if risk == "conservative":
        objective = variance
    elif risk == "moderate":
        def objective(w):
            vol = np.sqrt(max(variance(w), 1e-12))
            return -(float(mu @ w) - RISK_FREE_RATE) / vol
    else:
        def objective(w):
            return -(float(mu @ w) - AGGRESSIVE_RISK_AVERSION * variance(w))

    cap = weight_cap(n)
    result = minimize(
        objective,
        x0=np.full(n, 1.0 / n),
        method="SLSQP",
        bounds=[(0.0, cap)] * n,
        constraints=[{"type": "eq", "fun": lambda w: np.sum(w) - 1.0}],
        options={"maxiter": 500, "ftol": 1e-10},
    )
    w = np.clip(result.x if result.success else np.full(n, 1.0 / n), 0.0, cap)
    return w / w.sum()
