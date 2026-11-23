from datetime import date, timedelta

import numpy as np
import pytest

from app.services.optimizer import (
    InsufficientDataError,
    build_return_stats,
    optimize_weights,
    portfolio_metrics,
    weight_cap,
)

PROFILES = ("conservative", "moderate", "aggressive")


def make_closes(n_days=250, specs=None, seed=0, drop=None):
    """symbol -> {iso date: close} random walks with given (drift, vol) per day."""
    rng = np.random.default_rng(seed)
    specs = specs or {"A": (0.0008, 0.010), "B": (0.0005, 0.020), "C": (0.0002, 0.006), "D": (0.0010, 0.025)}
    dates = [(date(2025, 1, 1) + timedelta(days=i)).isoformat() for i in range(n_days)]
    out = {}
    for sym, (mu, sigma) in specs.items():
        prices = 100 * np.cumprod(1 + rng.normal(mu, sigma, n_days))
        out[sym] = dict(zip(dates, prices.tolist()))
    for sym, missing in (drop or {}).items():
        for d in dates[10:10 + missing]:
            out[sym].pop(d)
    return out


def check_valid(w, cap):
    assert abs(w.sum() - 1) < 1e-6
    assert w.min() >= -1e-9
    assert w.max() <= cap + 1e-6


def test_build_return_stats_aligns_common_dates():
    stats = build_return_stats(make_closes(drop={"B": 5}))
    assert stats.days == 249 - 5
    assert stats.cov.shape == (4, 4)
    assert stats.symbols == ["A", "B", "C", "D"]


def test_too_few_symbols_or_days_raises():
    with pytest.raises(InsufficientDataError):
        build_return_stats(make_closes(specs={"A": (0.001, 0.01)}))
    with pytest.raises(InsufficientDataError):
        build_return_stats(make_closes(n_days=30, specs={"A": (0.001, 0.01), "B": (0.0, 0.02)}))


def test_weights_valid_for_each_profile():
    stats = build_return_stats(make_closes())
    for risk in PROFILES:
        check_valid(optimize_weights(stats, risk), 0.40)


def test_min_variance_has_lowest_volatility():
    stats = build_return_stats(make_closes())
    vol = {r: portfolio_metrics(optimize_weights(stats, r), stats)["volatility"] for r in PROFILES}
    eq = portfolio_metrics(np.full(4, 0.25), stats)["volatility"]
    for other in (vol["moderate"], vol["aggressive"], eq):
        assert vol["conservative"] <= other + 1e-6


def test_max_sharpe_beats_equal_weight():
    stats = build_return_stats(make_closes())
    best = portfolio_metrics(optimize_weights(stats, "moderate"), stats)["sharpe"]
    eq = portfolio_metrics(np.full(4, 0.25), stats)["sharpe"]
    assert best >= eq - 1e-6


def test_two_holdings_cap_is_full():
    assert weight_cap(2) == 1.0
    assert weight_cap(3) == 0.40
    stats = build_return_stats(make_closes(specs={"A": (0.001, 0.01), "B": (0.0003, 0.02)}))
    for risk in PROFILES:
        check_valid(optimize_weights(stats, risk), 1.0)


def test_near_duplicate_series_still_valid():
    closes = make_closes()
    closes["E"] = {d: p * 1.0000001 for d, p in closes["A"].items()}  # same moves as A
    stats = build_return_stats(closes)
    for risk in PROFILES:
        check_valid(optimize_weights(stats, risk), 0.40)


def test_moderate_falls_back_to_min_variance_when_all_returns_below_risk_free():
    # Every stock loses money: max-Sharpe would reward extra volatility, so moderate = min variance
    stats = build_return_stats(make_closes(specs={
        "A": (-0.0008, 0.010), "B": (-0.0010, 0.025), "C": (-0.0006, 0.008), "D": (-0.0012, 0.030)}))
    assert stats.mean.max() < 0.065
    mod = portfolio_metrics(optimize_weights(stats, "moderate"), stats)
    cons = portfolio_metrics(optimize_weights(stats, "conservative"), stats)
    assert abs(mod["volatility"] - cons["volatility"]) < 1e-6


def test_unknown_risk_raises():
    stats = build_return_stats(make_closes())
    with pytest.raises(ValueError):
        optimize_weights(stats, "yolo")
