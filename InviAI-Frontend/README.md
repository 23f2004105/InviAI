# InviAI frontend

Next.js 15 (App Router), React 19, TypeScript, Tailwind 3, Recharts, lucide-react. Setup and deployment are in the root [README](../README.md) and [DEPLOYMENT.md](../DEPLOYMENT.md).

```
app/
  layout.tsx            providers, navbar/sidebar, error + demo-mode banners
  contexts/             AuthContext (token in localStorage), UserContext (user + portfolios)
  lib/api.ts            authenticated API client (NEXT_PUBLIC_API_URL)
  lib/marketApi.ts      market data via relative /api/market/* (proxied by next.config.ts)
  lib/mockData.ts       types + sample data for demo mode and not-yet-built endpoints
  components/           dashboard, layout, ui, chat (AI advisor)
  <route>/page.tsx      dashboard, portfolios, assets, analytics, trends, reports, settings, help, login, register
```

## Environment

| Variable | Used for | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Direct browser calls to the backend (auth, portfolios, chat) | `http://localhost:8000` |
| `BACKEND_URL` | Server-side proxy target for relative `/api/*` calls | `http://localhost:8000` |

## Data

Signed-in users always see real data; if the API fails they get an error banner with Retry. Demo mode (no account) shows sample data and says so. Net-worth/asset history and market stats are still sample data until the backend stores price snapshots.
