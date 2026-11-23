# Portfolio Optimizer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Markowitz mean-variance optimizer with rebalancing suggestions and an equal-weight comparison, reachable from an "Optimize" button on each portfolio.

**Architecture:** Pure NumPy/SciPy functions in `backend/app/services/optimizer.py`. A thin authenticated endpoint in `backend/app/routers/optimize.py` gathers one year of history through the existing `market_data_service` and calls them. The frontend adds one API function and an `OptimizePanel` modal opened from `portfolios/page.tsx`.

**Tech Stack:** FastAPI, NumPy, SciPy (`scipy.optimize.minimize`, SLSQP), pytest; Next.js 15 / React 19 / Tailwind.

**Spec:** `docs/superpowers/specs/2026-11-23-portfolio-optimizer-design.md`

## Global Constraints

- Long-only; weights sum to 1; per-stock cap **40%** (cap becomes 100% when fewer than 3 holdings; builder's call for "raised to fit").
- Risk-free rate **6.5%**; annualise with **252** trading days; history period **"1y"**, daily.
- Minimum **2** holdings with at least **60** common return days, else HTTP 400 with a plain message.
- Profiles: `conservative` → minimum variance; `moderate` → maximum Sharpe; `aggressive` → maximize `return − 1·variance`.
- Rebalancing drift threshold **5 percentage points**; share counts rounded down to whole shares.
- Response flag `uses_sample_data: true` when any history came from the mock fallback (rows with lowercase `close` keys).
- Read-only: no trades and no DB writes. The UI shows "Educational only — not financial advice."
- Stop building at 10:30 on 2026-11-23 whatever the state.

## Review Focus

1. Same symbol held twice in one portfolio → merged into one position (quantities and values summed), not two optimizer variables.
2. Yahoo fails for one symbol → the mock history is used, `uses_sample_data` is true, no 500.
3. Highly correlated or identical return series (singular covariance) → optimizer still returns valid weights (sum 1, within bounds).
4. Invalid `risk` query value → 422 from FastAPI validation, not 500.
5. Another user's portfolio id → 404, the same as the assets router.

---

### Task 1: Optimizer math (`optimizer.py`)

**Files:**
- Create: `backend/app/services/optimizer.py`
- Modify: `backend/requirements.txt` (add `scipy==1.11.4` under "Data Processing")
- Test: `backend/tests/test_optimizer.py`

**Interfaces:**
- Produces:
  - `RISK_FREE_RATE = 0.065`, `TRADING_DAYS = 252`, `MAX_WEIGHT = 0.40`, `MIN_DAYS = 60`
  - `class InsufficientDataError(ValueError)`
  - `@dataclass ReturnStats: symbols: list[str]; mean: np.ndarray; cov: np.ndarray; days: int`
  - `build_return_stats(closes: dict[str, dict[str, float]]) -> ReturnStats`: input is symbol → {ISO date "YYYY-MM-DD": close}. Use only dates common to all symbols, sorted; daily simple returns; mean × 252, cov × 252. Raise `InsufficientDataError` if fewer than 2 symbols or fewer than `MIN_DAYS` common returns.
  - `weight_cap(n: int) -> float`: 0.40 if n ≥ 3 else 1.0
  - `portfolio_metrics(weights: np.ndarray, stats: ReturnStats) -> dict` with keys `expected_return`, `volatility`, `sharpe` (floats; sharpe = (r − 0.065)/vol, 0.0 when vol is 0)
  - `optimize_weights(stats: ReturnStats, risk: str) -> np.ndarray`: SLSQP from equal weights, bounds (0, weight_cap(n)), equality constraint sum = 1. Clip tiny negatives, then renormalise. `risk` is one of `"conservative" | "moderate" | "aggressive"`; anything else raises ValueError.

- [ ] **Step 1: Write failing tests** in `backend/tests/test_optimizer.py`, using a deterministic synthetic dataset (`np.random.default_rng(0)`, 4 symbols, 250 days, different drifts and volatilities, plus one pair built as near-duplicates for the singular case):
  - `test_build_return_stats_aligns_common_dates`: symbol B missing 5 dates → `stats.days == 249 - 5`, `stats.cov.shape == (4, 4)`
  - `test_too_few_symbols_or_days_raises`: 1 symbol → `InsufficientDataError`; 2 symbols with 30 days → `InsufficientDataError`
  - `test_weights_valid_for_each_profile`: for each profile, `abs(w.sum() - 1) < 1e-6`, `w.min() >= -1e-9`, `w.max() <= 0.40 + 1e-6`
  - `test_min_variance_has_lowest_volatility`: conservative volatility ≤ moderate, aggressive and equal-weight volatility (+1e-6)
  - `test_max_sharpe_beats_equal_weight`: moderate sharpe ≥ equal-weight sharpe − 1e-6
  - `test_two_holdings_cap_is_full`: `weight_cap(2) == 1.0`, and optimizing 2 symbols gives valid weights
  - `test_near_duplicate_series_still_valid` (Review Focus 3): weights sum to 1, within bounds, no exception
  - `test_unknown_risk_raises`: `optimize_weights(stats, "yolo")` → ValueError

- [ ] **Step 2: Run them and see them fail**
  Run (from `backend/`): `./venv/Scripts/python.exe -m pip install scipy==1.11.4` then `./venv/Scripts/python.exe -m pytest tests/test_optimizer.py -q`
  Expected: FAIL / ImportError for `app.services.optimizer`

- [ ] **Step 3: Implement `backend/app/services/optimizer.py`** per the Interfaces above. Objectives (minimize): conservative `w·Σ·w`; moderate `−(μ·w − 0.065)/sqrt(w·Σ·w)`; aggressive `−(μ·w − 1.0·w·Σ·w)`.

- [ ] **Step 4: Run the tests and see them pass**
  Run: `./venv/Scripts/python.exe -m pytest tests/test_optimizer.py -q`
  Expected: 8 passed

- [ ] **Step 5: Commit**
  `git add backend/app/services/optimizer.py backend/tests/test_optimizer.py backend/requirements.txt` → `git commit -m "Add mean-variance optimizer service"`

### Task 2: Optimize endpoint

**Files:**
- Create: `backend/app/routers/optimize.py`
- Modify: `backend/app/main.py` (include the router with prefix `/api/portfolios`, tag "Optimization")
- Test: `backend/tests/test_optimize_api.py`

**Interfaces:**
- Consumes: everything Task 1 produces; `get_current_user` (`app/routers/auth_local.py`); `get_portfolio_or_404(db, portfolio_id, user_id)` (`app/routers/assets.py`); `market_data_service.get_stock_history(symbol, period="1y", interval="1d") -> list[dict]` (rows have `Date`/`Close` from Yahoo, or `date`/`close` from the mock).
- Produces: `POST /api/portfolios/{portfolio_id}/optimize?risk=moderate`, where `risk: Literal["conservative","moderate","aggressive"]` (default `"moderate"`). It returns:
  ```json
  {
    "risk_profile": "moderate",
    "method": "Markowitz mean-variance (1y daily returns)",
    "risk_free_rate": 0.065, "days_used": 247, "uses_sample_data": false,
    "metrics": {"current": {...}, "suggested": {...}, "equal_weight": {...}},
    "holdings": [{"symbol": "RELIANCE.NS", "name": "...", "current_price": 1377.5,
                  "quantity": 40, "current_weight": 23.3, "suggested_weight": 31.0,
                  "drift": 7.7, "action": "buy", "shares": 22}]
  }
  ```
  Each metrics object is `{expected_return, volatility, sharpe}` as fractions (0.12 = 12%). Weights and drift are percentages rounded to 1 decimal; `drift = suggested − current`. `action` is `"buy"` if drift > 5, `"sell"` if drift < −5, else `"hold"`. `shares = floor(|drift|/100 × portfolio_value / current_price)` (0 for hold). Holdings with the same symbol are merged first (Review Focus 1). Current weights come from `asset.current_value`.

- [ ] **Step 1: Write failing tests** in `backend/tests/test_optimize_api.py`, using the `client` / `register` fixtures from `tests/conftest.py`. Monkeypatch `market_data_service.get_stock_history` with a deterministic generator keyed by symbol (Yahoo-style `Date`/`Close` rows, 250 days):
  - `test_optimize_returns_weights_and_metrics`: 3 holdings → 200; suggested weights sum to 100 ± 0.5; the keys `current`, `suggested`, `equal_weight` are present; `uses_sample_data is False`
  - `test_optimize_rebalance_actions_consistent`: every holding with |drift| ≤ 5 has `action == "hold"` and `shares == 0`; buys have drift > 5
  - `test_optimize_merges_duplicate_symbols`: add RELIANCE twice and TCS once → the response has 2 holdings
  - `test_optimize_needs_two_holdings`: 1 holding → 400, and the detail mentions "at least 2"
  - `test_optimize_flags_sample_data`: the stub returns lowercase `date`/`close` rows for one symbol → `uses_sample_data is True`
  - `test_optimize_invalid_risk_422`: `?risk=yolo` → 422
  - `test_optimize_other_users_portfolio_404`: → 404
  - `test_optimize_requires_auth`: no token → 401

- [ ] **Step 2: Run them and see them fail**
  Run: `./venv/Scripts/python.exe -m pytest tests/test_optimize_api.py -q`
  Expected: FAIL (404 route not found)

- [ ] **Step 3: Implement the router** as a sync `def` endpoint (FastAPI runs it in a thread; the history fetches block). Turn `InsufficientDataError` into 400 with the detail "Optimization needs at least 2 holdings with 60+ days of price history." Normalise each history row's date to `YYYY-MM-DD` (`strftime` if it has one, else `str(x)[:10]`).

- [ ] **Step 4: Run the full backend suite**
  Run: `./venv/Scripts/python.exe -m pytest tests/ -q -p no:warnings`
  Expected: all pass (15 existing + 16 new)

- [ ] **Step 5: Commit**
  `git add backend/app/routers/optimize.py backend/app/main.py backend/tests/test_optimize_api.py` → `git commit -m "Add portfolio optimize endpoint with rebalancing suggestions"`

### Task 3: Optimize panel in the UI

**Files:**
- Modify: `InviAI-Frontend/app/lib/api.ts` (types + `optimizePortfolio`)
- Create: `InviAI-Frontend/app/components/portfolio/OptimizePanel.tsx`
- Modify: `InviAI-Frontend/app/portfolios/page.tsx` (an "Optimize" button next to "Refresh Prices", which opens the panel)

**Interfaces:**
- Consumes: Task 2's endpoint and JSON shape; `apiRequest` in `api.ts`; `Button` from `app/components/ui/Button.tsx`; the investor profile at `localStorage['inviai_investor_profile']` (`{risk_tolerance}`), as `ChatBot.tsx` reads it.
- Produces:
  - `export type RiskProfile = 'conservative' | 'moderate' | 'aggressive'`
  - `export interface OptimizationResult` (mirrors the Task 2 JSON)
  - `export const optimizePortfolio = (portfolioId: string, risk: RiskProfile) => Promise<OptimizationResult>`: POSTs to `/api/portfolios/${id}/optimize?risk=${risk}`, stripping `portfolio-` from the id. In demo mode (`isDemoSession()`) it throws `Error('Create an account to optimize a real portfolio.')`.
  - `OptimizePanel: React.FC<{ portfolio: Portfolio; onClose: () => void }>`

- [ ] **Step 1: Add the types and `optimizePortfolio` to `api.ts`.** Run `npx tsc --noEmit` from `InviAI-Frontend/` → exit 0.

- [ ] **Step 2: Build `OptimizePanel.tsx`**, following the modal styling already in `portfolios/page.tsx` (overlay, white or dark card, Esc and ✕ to close). Contents, top to bottom:
  - three profile buttons (initial value from the saved profile, else `moderate`); changing one re-fetches
  - a spinner while loading, and a red error line when a request fails
  - an amber note "Based on sample prices (live data unavailable)" when `uses_sample_data`
  - a metrics table with rows Expected return, Volatility, Sharpe ratio and columns Current, Suggested, Equal-weight; percentages to 1 decimal, Sharpe to 2
  - a holdings table with columns Stock, Current %, Suggested %, Drift, Action; the action shows "Buy N" in green, "Sell N" in red or "Hold" in grey, and rows with |drift| > 5 are highlighted
  - a footer line: "Markowitz mean-variance optimization on 1-year daily returns · risk-free 6.5% · max 40% per stock. Educational only — not financial advice."

- [ ] **Step 3: Wire the button** into each portfolio card in `portfolios/page.tsx` (lucide `Sparkles` icon, label "Optimize"), with state `optimizing: Portfolio | null`.

- [ ] **Step 4: Verify**
  - `npx tsc --noEmit` → exit 0
  - Browser on the running dev servers (ports 3000/8000), demo account: Portfolios → Optimize on "Long Term Wealth". The panel shows 3 metric columns and 5 holdings, suggested weights add up to about 100%, and switching to Conservative changes the weights and lowers suggested volatility. No console errors from the app.

- [ ] **Step 5: Commit**
  `git add InviAI-Frontend/app/lib/api.ts InviAI-Frontend/app/components/portfolio/OptimizePanel.tsx InviAI-Frontend/app/portfolios/page.tsx docs/superpowers` → `git commit -m "Add Optimize panel to portfolios page"`
