# InviAI

Portfolio tracking and planning for the Indian market (NSE/BSE, ₹). Users create portfolios, add holdings, see live prices, dashboards and reports, and chat with a Gemini-powered investment advisor. InviAI is read-only by design: it never places trades.

## Stack

| Part | Tech |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, TypeScript, Tailwind, Recharts |
| Backend | FastAPI, SQLAlchemy 2, Alembic, PostgreSQL |
| Auth | Email + password, bcrypt hashes, JWT (7 days), rate-limited login |
| Market data | Yahoo Finance (`yfinance`), cached 2 min, sample prices as fallback |
| AI advisor | Google Gemini (`gemini-2.5-flash`), offline fallback |
| Hosting | Vercel (frontend) + Render (backend) + Neon (Postgres), see [DEPLOYMENT.md](DEPLOYMENT.md) |

```
backend/            FastAPI app (app/), Alembic migrations (alembic/), tests (tests/)
InviAI-Frontend/    Next.js app
docker-compose.yml  Local Postgres + backend + frontend
render.yaml         Render blueprint for the backend
```

## Run locally

Needs Python 3.11, Node 20 and a local PostgreSQL.

**Backend** (PowerShell, from `backend/`):
```powershell
python -m venv venv; .\venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env      # then fill in DATABASE_URL and JWT_SECRET_KEY
uvicorn app.main:app --reload
```
Database migrations run automatically on startup. API docs: http://localhost:8000/docs

**Frontend** (from `InviAI-Frontend/`):
```powershell
npm install
npm run dev
```
Open http://localhost:3000. The login page also has a demo mode that shows sample data without an account.

**Or with Docker:** copy `.env.example` to `.env`, then `docker-compose up --build`.

## Tests

```powershell
cd backend; .\venv\Scripts\python -m pytest tests/      # in-memory SQLite, no network
python scripts/check_market_data.py                     # live Yahoo Finance check
cd ..\InviAI-Frontend; npm run build                    # type-check + build
```

## Database changes

Edit `backend/app/models.py`, then from `backend/`:
```powershell
alembic revision --autogenerate -m "describe the change"
alembic upgrade head
```
Commit the new file in `backend/alembic/versions/`.

More: [DEMO.md](DEMO.md) (presentation walkthrough), [INDIAN_MARKET_GUIDE.md](INDIAN_MARKET_GUIDE.md), [CLAUDE.md](CLAUDE.md) (architecture notes).
