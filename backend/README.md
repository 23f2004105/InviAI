# Envi AI backend

FastAPI + SQLAlchemy 2 + PostgreSQL. Setup, tests and deployment are in the root [README](../README.md) and [DEPLOYMENT.md](../DEPLOYMENT.md).

```
app/
  main.py              app, CORS, rate limiter, startup migrations, /health
  database.py          engine, SessionLocal, get_db()
  models.py            LocalUser, Portfolio, Asset, Transaction, MarketDataCache
  schemas.py           shared Pydantic models
  rate_limit.py        slowapi limiter (AUTH_RATE_LIMIT, default 5/minute)
  routers/
    auth_local.py      /api/auth     register, login, me (bcrypt + JWT)
    portfolios.py      /api/portfolios
    assets.py          /api/portfolios/{id}/assets (+ refresh-prices)
    transactions.py    /api/portfolios/{id}/transactions
    market.py          /api/market   quote, history, search, indices, overview
    ai_chat.py         /api/ai       Gemini advisor
  services/
    market_data.py     Yahoo Finance with mock fallback, 2-minute cache (read-only)
alembic/               migrations (applied on startup)
tests/                 pytest suite (in-memory SQLite, Yahoo stubbed)
scripts/               manual checks, e.g. check_market_data.py
seed_demo.py           creates the demo account through the API
```

Environment variables are listed in [.env.example](.env.example).
