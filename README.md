# OnRoad Monorepo

Vietnam vehicle catalog and on-road cost quotes — split into **frontend** (Next.js UI) and **backend** (Express API).

## Structure

```text
├── apps/
│   ├── frontend/          # Next.js 16 — UI only (port 3000)
│   └── backend/           # Express API — all /api/* routes (port 4000)
├── packages/
│   ├── shared/            # Shared TypeScript types and pure utilities
│   └── tsconfig/          # Shared TS configs
├── db/                    # Neon SQL operator scripts
└── package.json           # npm workspaces root
```

## Quick start

```bash
# Install (from repo root)
npm install --legacy-peer-deps

# Copy env
cp .env.example apps/backend/.env.local
cp .env.example apps/frontend/.env.local
# Fill DATABASE_URL, ADMIN_PASSWORD, ADMIN_TOKEN_SECRET in backend .env.local

# Run both apps
npm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- Frontend proxies `/api/*` → backend via `next.config.ts` rewrites

## Scripts

| Command | Effect |
|---------|--------|
| `npm run dev` | Start backend + frontend |
| `npm run dev:backend` | API only (`:4000`) |
| `npm run dev:frontend` | UI only (`:3000`) |
| `npm run build` | Build both apps |
| `npm run test` | Run tests in both workspaces |

## Backend modules

Each API route maps to one handler under `apps/backend/src/routes/handlers/`. Business logic lives in `apps/backend/src/server/modules/`:

- `auth`, `catalog`, `quote`, `customer`, `policy`, `bank-loan`, `accessory`, `media`, `translate`

Database: **Drizzle ORM** + Neon PostgreSQL (not Prisma — schema in `apps/backend/src/server/db/`).

## Deployment

- **Frontend**: Vercel — Root Directory = `apps/frontend`
- **Backend**: Any Node host (Railway, Render, Fly.io) — `apps/backend`, set `PORT` and `DATABASE_URL`
- Set frontend `API_URL` to the deployed backend URL for rewrites
