# AssetFlow

Enterprise asset management, allocation, resource booking, maintenance and audit
platform. Monorepo containing the REST API, the web client, and shared domain
contracts.

## Stack

| Layer     | Technology                                             |
| --------- | ------------------------------------------------------ |
| API       | Node.js 20, Express 4, TypeScript, Zod                 |
| Database  | PostgreSQL 15+, Prisma ORM                             |
| Auth      | JWT (access + rotating refresh), Argon2id              |
| Realtime  | Socket.io (Phase 10)                                   |
| Web       | Vite, React 18, TypeScript, TanStack Query, Zustand    |
| Tooling   | npm workspaces, Prettier, ESLint, Vitest               |

## Repository layout

```
assetflow/
├─ apps/
│  ├─ api/            Express REST API (clean/layered architecture)
│  │  ├─ prisma/      schema.prisma + migrations + seed
│  │  └─ src/
│  │     ├─ config/   env validation
│  │     ├─ core/     logger, prisma client, errors, http helpers
│  │     ├─ middleware/
│  │     ├─ modules/  feature modules (auth, org, assets, …) — added per phase
│  │     └─ routes/   API composition root
│  └─ web/            Vite + React client
│     └─ src/
├─ packages/
│  └─ shared/         enums, constants, RBAC, API contracts (used by api + web)
└─ docs/              architecture, ER diagram, DB, API, RBAC, state machines
```

## Getting started

```bash
# 1. Install (root — npm workspaces hoists everything)
npm install

# 2. Configure environment
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
#    edit apps/api/.env → DATABASE_URL + JWT secrets

# 3. Database
npm run prisma:generate
npm run prisma:migrate      # creates tables
npm run prisma:seed         # creates SUPER_ADMIN + reference data

# 4. Run both apps
npm run dev                 # api :4000  +  web :5173
```

Default seeded admin: `admin@assetflow.local` / `ChangeMe!2026` (override via
`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`).

## Documentation

- [`docs/01-architecture.md`](docs/01-architecture.md) — system architecture
- [`docs/02-er-diagram.md`](docs/02-er-diagram.md) — entity relationships
- [`docs/03-database.md`](docs/03-database.md) — schema reference & conventions
- [`docs/04-api-design.md`](docs/04-api-design.md) — endpoint catalogue
- [`docs/05-rbac.md`](docs/05-rbac.md) — roles & permission matrix
- [`docs/06-state-machines.md`](docs/06-state-machines.md) — lifecycle diagrams

## Delivery phases

1. **Foundation** — architecture, schema, project setup ← _current_
2. Authentication & authorization
3. Organization module
4. Asset module
5. Allocation module
6. Resource booking
7. Maintenance module
8. Audit module
9. Reports & analytics
10. Notifications & realtime
11. UI polish, accessibility, performance
