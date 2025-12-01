## Copilot / AI agent instructions for InviAI

Purpose: Give an AI coding assistant the minimum, concrete facts it needs to be productive in this repository.

- Repository layout (primary working area): `InviAI Full/` (backend + frontend). There is a separate prototype in `InviAI-Frontend/`.
- Primary technologies: FastAPI backend (Python 3.10+), Next.js frontend (TS), PostgreSQL, Supabase for auth, Docker Compose for orchestration.

Important files to read first
- Backend entry & lifecycle: `backend/app/main.py` (startup creates tables, CORS, exception handlers)
- Backend config/settings: `backend/app/config.py` (Pydantic Settings, env vars). Prefer using these names over ad-hoc env lookups.
- DB helpers: `backend/app/database.py` (SessionLocal, Base, init_db(), reset_db(), check_db_connection()). Use `get_db()` dependency in endpoints.
- Auth routes: `backend/app/routers/auth.py` (Supabase initialization checks, token verification using Authorization: Bearer <token>).
- Market data: `backend/app/services/market_data.py` (yfinance usage and Indian symbol suffix rules like `RELIANCE.NS`).
- Frontend client: `frontend/lib/api.ts` — shows how the frontend calls the API (reads `NEXT_PUBLIC_API_URL`, stores token in `localStorage` under `auth_token`, and redirects on 401).

How to run locally (developer workflows)
- Recommended (Docker Compose): from repo root `docker-compose up -d` (services: db, backend, frontend). Use `docker-compose logs -f` and `docker-compose down`.
- Backend (local dev without Docker):
  - PowerShell: `cd backend; python -m venv venv; .\venv\Scripts\Activate.ps1; pip install -r requirements.txt; uvicorn app.main:app --reload`
- Frontend (local dev):
  - PowerShell: `cd frontend; npm install; npm run dev` (opens at http://localhost:3000). Frontend expects backend at `NEXT_PUBLIC_API_URL` or `http://localhost:8000`.

Key environment variables (examples)
- Database: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` OR `DATABASE_URL`.
- Supabase: `SUPABASE_URL`, `SUPABASE_KEY` (auth will be disabled if missing — `auth.py` logs a warning).
- SECURITY: `SECRET_KEY` and `ENVIRONMENT` (development toggles verbose SQL logging in `database.py`).
- Market data: `ALPHA_VANTAGE_API_KEY` (optional), `MARKET_DATA_SOURCE`.

Project-specific conventions and gotchas
- Indian stock symbols: backend normalizes by appending `.NS` (NSE) or `.BO` (BSE). See `MarketDataService.format_indian_symbol()` and `POPULAR_INDIAN_STOCKS` in `market_data.py`.
- Supabase-first auth: authentication relies on Supabase SDK. If `SUPABASE_URL`/`KEY` are unset, the backend starts but will return 503 for auth-protected flows. Tests and local flows may need a mock or real Supabase project.
- DB Session pattern: use `get_db()` dependency or `DatabaseSession` context manager from `database.py`.
- Frontend auth token handling: frontend saves token to `localStorage` key `auth_token` and the axios client adds `Authorization: Bearer <token>` header. 401 handling triggers a redirect to `/login` in `frontend/lib/api.ts`.
- CORS origins: set via `CORS_ORIGINS` env var (comma-separated). Default is `http://localhost:3000`.

APIs and examples an agent can use directly
- Register/login: POST `/api/auth/register` and `/api/auth/login` (see `routers/auth.py` and `frontend/lib/api.ts` for request/response shapes).
- Health: GET `/health` — useful when orchestrating or writing integration tests.
- Market price example (backend helper): `get_indian_stock_price("RELIANCE")` calls `format_indian_symbol` and returns the same dict shape used by frontend (`current_price`, `open`, `high`, `low`, `volume`).

Testing & debugging notes
- Tests: `pytest` is configured; `pytest-asyncio` and `httpx` are used. Run `pytest` from repo root or `backend` depending on test locations.
- Enable SQL logging: set `ENVIRONMENT=development` (or set `echo=True` in `database.py`) to see SQL statements.
- Common debug pattern: start backend with `uvicorn ... --reload` and check `http://localhost:8000/docs` for live API contract.

When changing code, be conservative with migrations
- The backend creates tables on startup (`Base.metadata.create_all(bind=engine)` in `main.py`). For production or schema evolution use Alembic (present in `requirements.txt`) rather than relying on create_all.

If unsure, where to look next
- For business logic: `backend/app/services/` (market_data, optimizer planned files).
- For models/schemas: `backend/app/models.py` and `backend/app/schemas.py`.
- For frontend UI examples and mocks: `frontend/app` and `frontend/lib/mockData.ts`.

Questions for the maintainer if something is unclear
- Do we prefer using Supabase mocks in CI/local tests or real Supabase projects? (affects auth test strategy)
- Where should new Phase 3 endpoints live (naming convention): `api/market/*` and `api/portfolios/*` are expected patterns.

End of file — ask for feedback about missing project-specific details to iterate.
