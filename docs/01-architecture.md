# 01 — System Architecture

## 1. Overview

AssetFlow is a modular monolith: a single deployable API organized into strongly
isolated feature modules, backed by PostgreSQL, fronted by a React SPA. A modular
monolith (not microservices) is the correct altitude for this domain — the
modules share one transactional database and the workflows (allocation → audit →
maintenance) cross module boundaries constantly, so distributed transactions
would add cost without benefit. The module boundaries are drawn cleanly enough
that any module could later be extracted if scale demands it.

```
┌──────────────┐     HTTPS/JSON      ┌───────────────────────────────────┐
│  React SPA   │ ──────────────────► │           Express API             │
│ (Vite/TS)    │ ◄────────────────── │                                   │
│  TanStack Q  │     WebSocket       │  ┌─────────────────────────────┐  │
└──────────────┘ ◄────────────────── │  │  HTTP layer (routes/ctrl)   │  │
                                     │  ├─────────────────────────────┤  │
                                     │  │  Service layer (use-cases)  │  │
                                     │  ├─────────────────────────────┤  │
                                     │  │  Repository layer (Prisma)  │  │
                                     │  └─────────────────────────────┘  │
                                     └────────────┬──────────────────────┘
                                                  │
                                          ┌───────▼────────┐
                                          │  PostgreSQL    │
                                          └────────────────┘
```

## 2. Layered (clean) architecture

Every feature module follows the same four-layer structure. Dependencies point
**inward only**: HTTP knows about services, services know about repositories,
repositories know about Prisma. Nothing points back out.

```
modules/<feature>/
├─ <feature>.routes.ts        # URL → controller wiring + middleware
├─ <feature>.controller.ts    # HTTP concerns only: parse req, call service, shape res
├─ <feature>.service.ts       # business rules, orchestration, transactions
├─ <feature>.repository.ts    # data access; the ONLY place Prisma is touched
├─ <feature>.schema.ts        # Zod request/response schemas + inferred DTO types
├─ <feature>.mapper.ts        # entity → DTO transforms (never leak Prisma models)
└─ <feature>.types.ts         # module-local types
```

**Rules that keep the layers honest**

- Controllers never touch `prisma`. Services never touch `req`/`res`.
- Repositories return domain entities; mappers convert to DTOs at the service
  edge so Prisma model shapes never reach the client.
- Validation happens once, at the HTTP edge, via Zod. Services trust their input
  types.
- Cross-module calls go **service → service**, never repository → other module's
  tables. This preserves each module's invariants.

### Why this satisfies SOLID

- **S**ingle responsibility — each file owns exactly one layer's concern.
- **O**pen/closed — new behavior is a new service method or module, not edits to
  a god-controller.
- **L**iskov — repositories implement narrow interfaces; a fake repo substitutes
  cleanly in tests.
- **I**nterface segregation — services depend on the specific repository methods
  they use, not a mega-DAO.
- **D**ependency inversion — services receive their repository via constructor
  injection (a lightweight DI container wires concrete Prisma repos in prod, fakes
  in tests).

## 3. Request lifecycle

```
request
  → helmet / cors / body-parser / cookie-parser        (app.ts)
  → pino-http request logging
  → rate limiter
  → route match
  → authenticate()      verify access JWT → req.user            [Phase 2]
  → authorize(perm)     RBAC permission check                   [Phase 2]
  → validate(schema)    Zod parse of params/query/body          [Phase 2]
  → controller          calls service
      → service         business rules, tx, emits events/notifications
          → repository  Prisma query
  → response envelope   { success, data | error }
  → (thrown errors) → central errorHandler → typed failure envelope
```

## 4. Cross-cutting concerns

| Concern           | Mechanism                                                            |
| ----------------- | ------------------------------------------------------------------- |
| Config            | `config/env.ts` — Zod-validated env, fail-fast on boot              |
| Logging           | `pino` structured logs; `pino-http` per-request                     |
| Errors            | `AppError` + central `errorHandler`; stable machine codes           |
| Validation        | `zod` schemas at the HTTP edge                                      |
| AuthN             | Access JWT (15m) in `Authorization`; rotating refresh in httpOnly cookie |
| AuthZ             | Permission matrix in `@assetflow/shared/rbac`                       |
| Auditability      | `ActivityLog` (who did what) + append-only `AssetEvent` ledger      |
| Realtime          | Socket.io sharing the HTTP server; room-per-user delivery [Phase 10]|
| Transactions      | `prisma.$transaction` around multi-write use-cases (allocation, transfer, audit) |
| Idempotent state  | Explicit state machines guard every status transition (see doc 06)  |

## 5. Domain modules & dependencies

```
        ┌────────────┐
        │   Auth     │  (identity, tokens, sessions)
        └─────┬──────┘
              │
        ┌─────▼──────┐
        │Organization│  (users, departments, categories, roles)
        └─────┬──────┘
              │
        ┌─────▼──────┐
        │   Assets   │  (registration, QR, history, lifecycle)
        └─────┬──────┘
     ┌────────┼─────────┬──────────────┐
     ▼        ▼         ▼              ▼
┌─────────┐┌────────┐┌────────────┐┌────────┐
│Allocation││Booking ││Maintenance ││ Audit  │
└─────────┘└────────┘└────────────┘└────────┘
     └────────┴─────────┴──────────────┘
                    │
        ┌───────────▼────────────┐
        │ Notifications / Activity│  (consumes events from all modules)
        └────────────────────────┘
                    │
        ┌───────────▼────────────┐
        │  Reports / Analytics    │  (reads across all modules)
        └─────────────────────────┘
```

Higher modules depend on lower ones; there are no cycles. Notifications and
Reports are read/consume-only with respect to other modules' data.

## 6. Event flow (internal domain events)

Rather than scatter notification/logging calls through business logic, each
service emits a domain event to an in-process event bus after a successful
transaction. Subscribers handle side effects:

```
AllocationService.approve()
   ├─ (tx) write Allocation, AssetEvent, update Asset.status
   └─ emit "allocation.approved"
         ├─► NotificationSubscriber → create Notification + socket push
         ├─► ActivitySubscriber     → append ActivityLog
         └─► (Phase 9) analytics counters
```

This keeps modules decoupled: Allocation doesn't import Notifications; it just
announces what happened. (Implemented in Phase 2's core; wired per module.)

## 7. Environments & deployment

- **Dev** — `npm run dev` runs API (tsx watch) + web (vite) concurrently; Vite
  proxies `/api` to avoid CORS.
- **Test** — Vitest; app is importable without binding a port (`createApp()`);
  a disposable Postgres schema per test run.
- **Prod** — API compiled to `dist/` and run under Node; web built to static
  assets served by any CDN/static host; `prisma migrate deploy` on release.

## 8. Security posture (summary; detail in doc 05)

- Argon2id password hashing; secrets never logged.
- Short-lived access tokens + rotating, hashed refresh tokens (theft detection
  via rotation chain).
- httpOnly + SameSite cookies for refresh token; CSRF-safe by design.
- helmet security headers, strict CORS allow-list, per-route rate limiting.
- Every mutation authorized by explicit permission; row-level ownership checks
  in services (e.g. an employee may only return their own allocation).
