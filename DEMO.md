# InviAI – Presentation Demo Guide

## Before you present (10 minutes ahead)

1. **Start PostgreSQL** (it must be running on port 5432; the app's data lives there).
2. **Backend** – PowerShell:
   ```powershell
   cd "D:\PROJECTS\InviAI\InviAI Full\backend"
   .\venv\Scripts\Activate.ps1
   uvicorn app.main:app --port 8000
   ```
   Check http://localhost:8000/health shows `"database": "healthy"`.
3. **Frontend** – second PowerShell window:
   ```powershell
   cd "D:\PROJECTS\InviAI\InviAI Full\InviAI-Frontend"
   npm run dev
   ```
   Open http://localhost:3000 (first page load compiles for a few seconds; open each page once before presenting to warm it up).
4. Optional: reset the demo data to a clean state – `python seed_demo.py` in `backend/` (backend must be running).

## Demo account

| Email | Password |
|---|---|
| `demo@inviai.app` | `Demo@2026` |

Two portfolios: **Long Term Wealth** (Reliance, TCS, HDFC Bank, Infosys, ITC) and **Growth Picks** (Bajaj Finance, Titan, Bharti Airtel, Tata Motors).

## Suggested click path (~5 min)

1. **Login** with the demo account → **Dashboard**: live NIFTY 50 / SENSEX / NIFTY Bank / NIFTY IT, net worth, best performer, value chart, allocation donut, watchlist.
2. **Portfolios** → *Create Portfolio* ("Retirement") → *Add Stock* → search `SBIN` → 20 shares @ ₹780 → value, weight and return calculate instantly → *Refresh Prices*.
3. **Assets**: every holding across portfolios.
4. **Analytics**: risk metrics and sector allocation.
5. **NSE/BSE Trends**: top gainers / losers / most active.
6. **Settings** → Investor Profile → choose *Aggressive*, horizon *5+ years*, ₹2,00,000 → *Save*.
7. **AI Advisor** (chat bubble, bottom-right of Dashboard): ask *"I have 2 lakh for 5 years, how should I invest?"* or *"Which tax saving options do I have?"*
8. **Reports**: summary per portfolio → *Download CSV* / *Print / PDF*.
9. **Help & Support** FAQ, then **Log out** from Settings.
10. Optional: **Register** a new account live to show sign-up and the empty state.

## If something goes wrong

- **Chat answers look generic** – the Gemini key is missing/invalid or there's no internet, so InviAI uses its built-in offline advisor (still Indian-market specific). To use Gemini, put a valid key from https://aistudio.google.com in `GEMINI_API_KEY` in `backend/.env` and restart the backend.
- **Prices don't change / look rounded** – Yahoo Finance is unreachable, so built-in sample prices are used. Everything else keeps working.
- **Backend can't connect to the database** – PostgreSQL isn't running, or `backend/.env` `DATABASE_URL` is wrong.
- **Backend completely down** – on the login page, *Continue with Demo Mode* shows the UI with sample data.
- **Logged out unexpectedly** – log in again with the demo account.

## Talking points (what's real)

- FastAPI + PostgreSQL backend, JWT auth, per-user portfolios, holdings and transactions.
- Live NSE/BSE quotes (Yahoo Finance → sample-price fallback), cached for 2 minutes and pre-warmed at startup.
- Portfolio value, cost basis, unrealised P&L and weights recalculated on every change.
- AI investment advisor (Google Gemini) personalised with the investor profile, with an offline fallback.
- Read-only by design: InviAI never places trades.
- Next steps: price history from stored snapshots, rebalancing suggestions, broker import, Alembic migrations, bcrypt password hashing.
