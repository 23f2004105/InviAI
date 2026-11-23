# Portfolio optimizer + rebalancing (short design)

## Intent
The synopsis promises an "AI optimization" module: Markowitz mean-variance optimization (SciPy) that suggests allocations matching the user's risk profile, threshold-based rebalancing, and a check of the suggestion against an equal-weight portfolio. None of it exists yet. It has to be demo-ready for the presentation at 11:30 on 2026-11-23, so it must be small, correct and must not break anything that works today.

## Goals
- For one portfolio: suggest target weights from one year of daily prices, matched to the risk profile.
- Show expected annual return, volatility and Sharpe ratio for **current**, **suggested** and **equal-weight** mixes (the synopsis's model-validation check).
- Rebalancing: list holdings whose weight differs from the suggestion by more than 5 points, with the number of shares to buy or sell.
- Clearly educational: no trading, and a "not financial advice" note.

## Non-goals
- Saving targets to the database, background alerts, or new asset classes.
- Rewriting the Analytics page (stretch only if time remains).
- Adding stocks the user doesn't hold: it optimizes within the current holdings.

## Approaches considered
1. **Optimizer endpoint + rebalancing from the same numbers (chosen).** Covers the headline module, the rebalancing algorithm and model validation in one piece.
2. Real risk metrics + rebalancing only. Safer, but leaves out the optimizer the synopsis is built around.
3. No build, demo polish only. Lowest risk, closes no gaps.

## Design
**Backend**: `app/services/optimizer.py` (pure functions, unit-testable) + `POST /api/portfolios/{id}/optimize?risk=conservative|moderate|aggressive` in a new router, authenticated with the same ownership check as the assets router.
- Prices: `market_data_service.get_stock_history(symbol, period="1y")` per holding; daily returns → annualised mean (×252) and covariance (×252).
- Optimization (SciPy `minimize`, SLSQP): long-only, weights sum to 1, per-stock cap of 40% (raised to fit if there are fewer than 3 holdings). Objective by profile:
  - conservative: minimum variance
  - moderate: maximum Sharpe ratio
  - aggressive: maximize return − 1·variance (a low risk-aversion utility)
- Risk-free rate: 6.5% (approximate Indian 10-year yield), used for Sharpe.
- Needs at least 2 holdings with at least 60 days of history; otherwise a clear 400 message.
- If any history came from the mock fallback, the response sets `uses_sample_data: true` and the UI says so.
- Response: per-holding current weight, suggested weight, drift, action (buy/sell/hold) and share count at the current price; metrics for current, suggested and equal-weight mixes.
- `scipy` goes back into `requirements.txt`.

**Frontend**: an "Optimize" button on each portfolio card opens a panel that shows:
- a risk-profile selector, defaulting to the profile saved in Settings
- a metrics table comparing current, suggested and equal-weight mixes
- a weights table with drift and rebalancing actions (drift over 5 points highlighted)
- a one-line method note ("Markowitz mean-variance, 1-year daily returns") and the disclaimer

**Tests**: optimizer unit tests (weights sum to 1, respect caps, min-variance has the lowest volatility, max-Sharpe has Sharpe at least equal to equal-weight) and an endpoint test with stubbed history (auth, ownership, response shape, too-few-holdings error).

## Left to the builder
Exact UI styling (follow the existing modal and Tailwind patterns in `portfolios/page.tsx`), number formatting, and endpoint error wording.

## Safety
Work stays on the `hardening-and-deploy` branch. Stop building by 10:30; if it isn't passing tests and a browser run-through by then, it isn't shown.
