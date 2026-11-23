# CLAUDE.md

Context for AI assistants working in this repo. Last verified against the code on 2026-11-23. Where other docs disagree with the code, trust the code and this file.

## What this is

**Envi AI** is a portfolio tracking / planning app focused on the **Indian market** (NSE/BSE, INR). Users register, create portfolios, add stock holdings, see live-ish prices, dashboards/charts, and chat with a Gemini-powered "investment advisor". Status: alpha prototype.

Layout (this directory is the git root; the parent `D:\PROJECTS\InviAI\` holds only a stray `.venv/` and `synopsis/`, not part of the app):

```
backend/            FastAPI + SQLAlchemy 2 + PostgreSQL + Alembic (Python 3.11)
InviAI-Frontend/    Next.js 15 (App Router) + React 19 + TS + Tailwind 3 + Recharts + lucide-react
docker-compose.yml  db + backend + frontend for local dev
render.yaml         Render blueprint (backend). Hosting: Vercel + Render + Neon, see DEPLOYMENT.md
```

## Commands

Backend (PowerShell, from `backend/`; a `venv/` already exists there):
```powershell
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload            # http://localhost:8000, docs at /docs; runs alembic upgrade head on startup
pytest tests/                            # in-memory SQLite, Yahoo stubbed, no Postgres needed
python scripts/check_market_data.py      # live Yahoo Finance smoke check (set PYTHONIOENCODING=utf-8 when piping)
alembic revision --autogenerate -m "..." # after editing models.py
python seed_demo.py                      # demo account via the API (ENVIAI_API_URL to target a deployed backend)
```

Frontend (from `InviAI-Frontend/`):
```powershell
npm install
npm run dev      # http://localhost:3000
npm run build
npm run lint     # .eslintrc.json is empty
```

Docker: copy `.env.example` → `.env`, then `docker-compose up --build`.

## Architecture

### Backend (`backend/app/`)
- `main.py`: app, CORS (`CORS_ORIGINS`), slowapi limiter + 429 handler, exception handlers, request-logging middleware. Lifespan runs `alembic upgrade head` (`RUN_MIGRATIONS_ON_STARTUP`, default true; single worker only) and warms the market cache in a thread.
- `database.py`: engine (QueuePool, `DB_POOL_SIZE`/`DB_MAX_OVERFLOW` default 5/5 for Neon), `SessionLocal`, `Base`, `get_db()`. Reads `DATABASE_URL` (loads `backend/.env`). Skips the `options=-c timezone=utc` connect arg for `-pooler` hosts.
- `models.py`: `LocalUser` (`local_users`), `Portfolio` (FK → `local_users.id`), `Asset`, `Transaction`, `MarketDataCache`. Old local DBs may still have an unused `users` table; `alembic/env.py` ignores it.
- `rate_limit.py`: shared slowapi `limiter` (in-memory; `RATE_LIMIT_ENABLED`, `AUTH_RATE_LIMIT` default `5/minute`).
- `schemas.py`: shared Pydantic models (register requires 8+ chars, a digit and an uppercase letter).
- `routers/` (mounted in `main.py`):
  | Prefix | File | Notes |
  |---|---|---|
  | `/api/auth` | `auth_local.py` | Email+password, bcrypt (legacy `salt$sha256` hashes verify and are upgraded on login), JWT HS256 7 days. `JWT_SECRET_KEY` required unless `ENVIRONMENT=development`. `get_current_user` lives here. login/register are rate-limited. |
  | `/api/portfolios` | `portfolios.py`, `assets.py`, `transactions.py` | CRUD sharing the prefix (`/{id}/assets`, `/{id}/transactions`, `/{id}/assets/refresh-prices`). Ownership via `Portfolio.user_id == current_user.id`. |
  | `/api/market` | `market.py` | `/quote/{symbol}`, `/history/{symbol}`, `/search` (hardcoded list), `/indices`, `/overview`. **Unauthenticated.** |
  | `/api/ai` | `ai_chat.py` | `/chat`, `/quick-advice` via Gemini (`gemini-2.5-flash`), `GEMINI_API_KEY`, offline fallback. |
- `services/market_data.py`: `MarketDataService` (singleton `market_data_service`). Yahoo Finance (`yfinance`) → built-in mock prices; 2-minute in-memory cache. Groww was removed 2026-11-23. `get_stock_history` returns `list[dict]` with Yahoo keys (`Date`, `Close`, ...) or mock keys (`date`, `close`, ...); callers handle both. **Read-only, no order placement**; keep it that way.

### Frontend (`InviAI-Frontend/app/`)
- App Router pages: `/`, `login`, `register`, `dashboard`, `portfolios`, `assets`, `analytics`, `trends`, `reports`, `settings`, `help`. `layout.tsx` (client) wraps `AuthProvider` → `UserProvider` and shows an error banner (with Retry) and a demo-mode banner.
- `contexts/AuthContext.tsx`: token in `localStorage['auth_token']`; client-side route guard; `login()` fires a `window` `auth-changed` event.
- `contexts/UserContext.tsx`: user + portfolios, `error`, `isDemo`.
- `lib/api.ts`: authenticated client (`NEXT_PUBLIC_API_URL`). Mock data **only in demo mode** (`isDemoSession()`: no token or `demo_token`); signed-in failures throw. History/net-worth/market-stats are still always mock (no backend endpoints yet).
- `lib/marketApi.ts`: relative `/api/market/*`, proxied by `next.config.ts` to `BACKEND_URL` (default `http://localhost:8000`), with mock fallbacks.
- `components/{dashboard,layout,ui,chat}`; `ChatBot.tsx` uses `NEXT_PUBLIC_API_URL`.
- Import alias `@/*` → project root.

### Data flow
Browser → (Next rewrite or direct fetch with `Authorization: Bearer <jwt>`) → FastAPI → Postgres / Yahoo. Adding an asset fetches the current price, computes cost/value/P&L, then `recalculate_portfolio()` updates weights and portfolio totals.

## Conventions
- Backend: routers define their Pydantic schemas inline at the top; DB access via `Depends(get_db)` and sync SQLAlchemy `Session` inside `async def` handlers; section banner comments (`# ====`); docstrings on endpoints. Use `datetime.now(timezone.utc)`, not `utcnow()`.
- Schema changes: edit `models.py` + add an Alembic migration. Never rely on `create_all`.
- Frontend: `'use client'` components, Tailwind with dark-mode variants, `lucide-react` icons, `React.FC`.
- Currency is INR (₹) throughout; keep Indian-market framing in UI copy and AI prompts.
- Never commit or print `.env` values (root `.env`, `backend/.env` hold real credentials). Templates: `.env.example`, `backend/.env.example`.

## Environment variables (names only)
- `backend/.env`: `DATABASE_URL`, `ENVIRONMENT`, `JWT_SECRET_KEY`, `CORS_ORIGINS`, `GEMINI_API_KEY`, optional `AUTH_RATE_LIMIT`, `RATE_LIMIT_ENABLED`, `RUN_MIGRATIONS_ON_STARTUP`, `DB_POOL_SIZE`, `DB_MAX_OVERFLOW`. (`USE_MOCK_DATA` and `POSTGRES_*` may still be present locally; the code doesn't use them.)
- Root `.env` (docker-compose): `ENVIRONMENT`, `SECRET_KEY` (passed as `JWT_SECRET_KEY`), `POSTGRES_{DB,USER,PASSWORD,PORT}`, `BACKEND_PORT`, `FRONTEND_PORT`, `NEXT_PUBLIC_API_URL`, optional `GEMINI_API_KEY`, `CORS_ORIGINS`.
- Frontend: `NEXT_PUBLIC_API_URL`, `BACKEND_URL`.

## Known issues / gotchas
1. `transactions.py` (not re-checked since 2026-10-27): stores enum names (`BUY`) vs model enum values (`"buy"`), adjusts `portfolio.initial_value` on BUY/SELL (mixing cost basis and deposits); `delete_transaction` does not reverse asset effects.
2. `/api/market/*` is public (fine for quotes, but there is no rate limit there).
3. Rate limits and the price cache are per process: keep a single uvicorn worker, or move both to Redis.
4. `/quick-advice` takes params as query args.
5. `USE_MOCK_DATA` is stored by `MarketDataService` but never consulted.

## When making changes
- Prefer small, scoped edits. Verify whether a screen shows real or mock data before debugging it (network tab / `is_mock` in responses; demo mode shows a banner).
- Don't add trading/order functionality to the market data service.
- Run `pytest tests/` and `npm run build` before declaring work done.
