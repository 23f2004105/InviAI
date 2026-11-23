## AI assistant instructions for Envi AI

The up-to-date architecture notes, commands and conventions live in [CLAUDE.md](../CLAUDE.md) at the repo root. Read that first; it applies to any AI coding assistant.

Key rules:
- Local email/password auth (`backend/app/routers/auth_local.py`, bcrypt + JWT). There is no Supabase.
- Schema changes go through Alembic migrations in `backend/alembic/versions/`.
- The market data service is read-only; never add trading or order placement.
- Run `pytest tests/` (from `backend/`) and `npm run build` (from `InviAI-Frontend/`) before calling work done.
- Never commit or print `.env` values.
