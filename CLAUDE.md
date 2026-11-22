# CLAUDE.md

Context for AI assistants working in this repo. Verified against the code on 2026-10-27; where the older docs (`README.md`, `PROJECT_STATUS.md`, `.github/copilot-instructions.md`) disagree with the code, trust the code and this file.

## What this is

**InviAI** — portfolio tracking / planning app focused on the **Indian market** (NSE/BSE, INR). Users register, create portfolios, add stock holdings, see live-ish prices, dashboards/charts, and chat with a Gemini-powered "investment advisor". Status: alpha, under active development (4 commits; latest work = AI chatbot, uncommitted).

Layout (this directory is the git root; the parent `D:\PROJECTS\InviAI\` holds only a stray `.venv/`, `groww_market_data.py` and an empty `groww script` — not part of the app):

```
backend/            FastAPI + SQLAlchemy 2 + PostgreSQL (Python 3.11)
InviAI-Frontend/    Next.js 15 (App Router) + React 19 + TS + Tailwind 3 + Recharts + lucide-react
docker-compose.yml  db + backend + frontend (see "Known issues": frontend path is wrong)
*.md                Many status/guide docs written during scaffolding (partly stale)
```

## Commands

Backend (PowerShell, from `backend/`; a `venv/` already exists there):
```powershell
python -m venv venv; .\venv\Scripts\Activate.ps1
pip install -r requirements.txt
pip install google-generativeai          # NOT in requirements.txt, needed for /api/ai/*
uvicorn app.main:app --reload            # http://localhost:8000, docs at /docs
python init_db.py                        # DB connection check / create tables
pytest tests/                            # only tests/test_health.py is a real pytest suite
```
`test_auth.py`, `test_register.py`, `test_market_data.py` in `backend/` are ad-hoc scripts (run with `python`), not pytest tests; `test_auth.py` hardcodes `sys.path` to `d:\PROJECTS\InviAI\InviAI Full\backend`.

Frontend (from `InviAI-Frontend/`):
```powershell
npm install
npm run dev      # http://localhost:3000
npm run build
npm run lint     # .eslintrc.json is empty
```

Docker: `docker-compose up -d` (needs root `.env`). Postgres defaults: `inviai_user` / `inviai_db`, port 5432.

## Architecture

### Backend (`backend/app/`)
- `main.py` — app, CORS (`CORS_ORIGINS`, default `http://localhost:3000`), exception handlers, request-logging middleware, `Base.metadata.create_all` on startup (no Alembic migrations exist; schema changes to existing tables will NOT be applied automatically).
- `database.py` — engine (QueuePool), `SessionLocal`, `Base`, `get_db()` dependency. Reads `DATABASE_URL` via `os.getenv` (default `postgresql://inviai_user:password@localhost:5432/inviai_db`). Runs a connection check on import.
- `config.py` — Pydantic `Settings` requiring `SECRET_KEY`, `POSTGRES_*`, `SUPABASE_*`; **effectively unused** (code reads `os.getenv` directly). Falls back to `settings = None` on failure.
- `models.py` — `User`, `Portfolio`, `Asset`, `Transaction`, `MarketDataCache`; enums `AssetType`, `TransactionType`, `RiskTolerance`.
- `schemas.py` — Pydantic request/response models (register requires 8+ chars, a digit and an uppercase letter).
- `routers/` (mounted in `main.py`):
  | Prefix | File | Notes |
  |---|---|---|
  | `/api/auth` | `auth_local.py` | **Active auth.** Local email+password, JWT (HS256, 7 days), defines `LocalUser` (`local_users` table) and `get_current_user`. |
  | `/api/portfolios` | `portfolios.py`, `assets.py`, `transactions.py` | CRUD; all share the `/api/portfolios` prefix (`/{id}/assets`, `/{id}/transactions`, `/{id}/assets/refresh-prices`). Ownership checked via `Portfolio.user_id == current_user.id`. |
  | `/api/market` | `market.py` | `/quote/{symbol}`, `/history/{symbol}`, `/search` (hardcoded list), `/indices`, `/overview`. **Unauthenticated.** |
  | `/api/ai` | `ai_chat.py` | `/chat`, `/quick-advice` via Gemini (`gemini-2.5-flash`), needs `GEMINI_API_KEY`. |
  | — | `auth.py` | **Dead code**: older Supabase auth, not mounted. Still imported by nothing; `supabase` package still in requirements. |
- `services/market_data.py` — `MarketDataService` (singleton `market_data_service`). Priority: Groww API (read-only, if `GROWW_API_KEY`+`GROWW_SECRET`) → Yahoo Finance (`yfinance`) → built-in mock prices. `USE_MOCK_DATA` defaults to `"true"` but the flag is only stored, not actually consulted in the fetch paths. Indian symbols use `.NS` / `.BO` suffixes (`format_indian_symbol`). Indices: `^NSEI`, `^BSESN`, `^NSEBANK`. Service is explicitly **read-only — no order placement**; keep it that way.

### Frontend (`InviAI-Frontend/app/`)
- App Router pages: `/` , `login`, `register`, `dashboard`, `portfolios`, `assets`, `analytics`, `trends`, `reports`, `settings`, `help`. `layout.tsx` is a client component wrapping `AuthProvider` → `UserProvider`.
- `contexts/AuthContext.tsx` — token in `localStorage['auth_token']`; client-side route guard (public: `/login`, `/register`, `/forgot-password`); `login()` fires a `window` `auth-changed` event that `UserContext` listens to.
- `contexts/UserContext.tsx` — loads user + portfolios via `lib/api.ts`.
- `lib/api.ts` — authenticated client (`NEXT_PUBLIC_API_URL`, default `http://localhost:8000`); converts backend portfolio/asset shapes to the UI types in `lib/mockData.ts` (portfolio ids become `portfolio-<n>`). **Silently falls back to mock data** on errors (portfolios, user) and always for history/stats/net-worth.
- `lib/marketApi.ts` — market data via relative `/api/market/*` (proxied by `next.config.ts` rewrite → `http://localhost:8000`), with mock fallbacks.
- `components/{dashboard,layout,ui,chat}` — `ChatBot.tsx` posts to a hardcoded `http://localhost:8000/api/ai/chat`.
- Import alias `@/*` → project root.

### Data flow
Browser → (Next rewrite or direct fetch with `Authorization: Bearer <jwt>`) → FastAPI → Postgres / market providers. Adding an asset fetches the current price, computes cost/value/P&L, then `recalculate_portfolio()` updates weights and portfolio totals.

## Conventions
- Backend: routers define their Pydantic schemas inline at the top; DB access via `Depends(get_db)` and sync SQLAlchemy `Session` inside `async def` handlers; section banner comments (`# ====`); docstrings on endpoints.
- Frontend: `'use client'` components, Tailwind utility classes with dark-mode variants, `lucide-react` icons, functional components typed with `React.FC`.
- Currency is INR (₹) throughout; keep Indian-market framing in UI copy and AI prompts.
- Never commit `.env` files (root `.env`, `backend/.env` exist locally and contain real credentials — don't print or copy their values).

## Environment variables (names only)
- Root `.env` (docker-compose): `ENVIRONMENT`, `SECRET_KEY`, `POSTGRES_{DB,USER,PASSWORD,PORT}`, `SUPABASE_{URL,KEY,ANON_KEY}`, `MARKET_DATA_SOURCE`, `BACKEND_PORT`, `FRONTEND_PORT`, `NEXT_PUBLIC_*`, optional `CORS_ORIGINS`, `LOG_LEVEL`.
- `backend/.env` (what local uvicorn actually loads): `POSTGRES_*`, `DATABASE_URL`, `SUPABASE_*`, `SECRET_KEY`, `ENVIRONMENT`, `USE_MOCK_DATA`, `GROWW_API_KEY`, `GROWW_SECRET`, `GEMINI_API_KEY`. `JWT_SECRET_KEY` is read by `auth_local.py` but **not set** anywhere, so the hardcoded fallback secret is in use.

## Known issues / gotchas (found while reading — not yet fixed)
1. **FK mismatch**: `Portfolio.user_id` → `users.id`, but authentication returns `LocalUser` (`local_users.id`). Creating a portfolio uses `current_user.id` from `local_users`; this only works by coincidence of ids / will violate the FK if no matching `users` row exists. Needs a decision: point portfolios at `local_users`, or drop the legacy `User` model.
2. **`/api/market/history/{symbol}` is broken**: `market.py` treats the service result as a pandas DataFrame (`history.empty`, `iterrows`), but `get_stock_history()` now returns a `list[dict]`.
3. **Weak auth**: passwords hashed with single-round salted SHA-256 (not bcrypt/argon2); JWT secret has a hardcoded default; `/api/market/*` is public; `/api/auth/*` has no rate limiting.
4. **`docker-compose.yml` frontend service** builds `./frontend`, but the directory is `InviAI-Frontend/` (and has no Dockerfile). Docs/copilot-instructions also reference `frontend/`.
5. **`google-generativeai` missing from `requirements.txt`**; `ai_chat.py` degrades to a 500 without it. `/quick-advice` takes params as query args.
6. `next.config.ts` rewrite and `ChatBot.tsx` hardcode `localhost:8000`; `NEXT_PUBLIC_API_URL` is only honoured by `lib/api.ts`.
7. `transactions.py` stores enum names (`BUY`) vs model enum values (`"buy"`), and adjusts `portfolio.initial_value` on BUY/SELL (mixing cost basis and deposits); `delete_transaction` does not reverse asset effects.
8. `README.md.bak` and `INDIAN_MARKET_GUIDE.md` etc. are scaffolding docs; `PROJECT_STATUS.md` says the frontend is 0% done, which is out of date.
9. `FastAPI`'s `datetime.utcnow()` is used throughout (deprecated in 3.12).
10. Working tree has uncommitted changes: `app/dashboard/page.tsx`, `package-lock.json`, `backend/app/main.py`, new `chat/` and `ai_chat.py`. Git repo root is this directory; no remote is configured/known.

## When making changes
- Prefer small, scoped edits; this is a prototype with mock fallbacks, so verify whether a screen is showing real or mock data before debugging it (check the browser network tab / backend logs for `is_mock`).
- Schema changes need either Alembic (installed, not initialised) or a manual `reset_db()` in dev — `create_all` won't alter existing tables.
- Don't add trading/order functionality to the market data service.
- Run `pytest tests/` and `npm run build` (type-check) before declaring work done.
