# 04 — API Design

REST over JSON. Base path `**/api/v1**` (see `API_PREFIX` in
`@assetflow/shared`). This is the contract the web client and any future
integrations code against.

## 4.1 Conventions

### Response envelope

Success:
```json
{ "success": true, "data": { ... }, "meta": { ... } }
```
Failure:
```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "…", "details": { "email": ["Invalid email"] } } }
```
`code` values are stable and enumerated in
`apps/api/src/core/errors/error-codes.ts`. Clients switch on `code`, show
`message`, and map `details` to form fields.

### Status codes

| Code | Used for |
| --- | --- |
| 200 | OK (read, update) |
| 201 | Created |
| 204 | No content (delete, logout) |
| 400 | Validation error (`VALIDATION_ERROR`) |
| 401 | Unauthenticated / expired token |
| 403 | Authenticated but not permitted |
| 404 | Not found |
| 409 | Conflict / invalid state transition |
| 429 | Rate limited |
| 500 | Unexpected |

### Pagination, sorting, filtering

List endpoints accept:
```
?page=1&limit=20&sortBy=createdAt&sortOrder=desc&search=term
```
`limit` capped at 100 (`PAGINATION.MAX_LIMIT`). Response `data` is:
```json
{ "items": [ ... ], "pagination": { "page":1,"limit":20,"total":57,"totalPages":3,"hasNext":true,"hasPrev":false } }
```
Module-specific filters are documented per endpoint (e.g. assets accept
`status`, `categoryId`, `departmentId`, `condition`).

### Auth transport

- Access token (JWT, 15m) → `Authorization: Bearer <token>`.
- Refresh token (7d, rotating) → httpOnly, SameSite=Strict cookie
  `af_refresh`; never exposed to JS.
- Protected routes: `authenticate` → `authorize(permission)`.

### Idempotency & validation

- All mutating bodies validated by Zod at the edge; unknown fields stripped.
- State transitions validated against the module state machine (doc 06); an
  illegal move returns 409 `INVALID_STATE_TRANSITION`.

## 4.2 Endpoint catalogue

Legend — Auth: 🔓 public · 🔐 authenticated · 🛡️ requires listed permission.

### Auth (Phase 2) — `/auth`

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/auth/signup` | 🔓 | Register (creates `PENDING` user) |
| POST | `/auth/login` | 🔓 | Issue access + refresh |
| POST | `/auth/refresh` | 🔓† | Rotate refresh, new access (†cookie) |
| POST | `/auth/logout` | 🔐 | Revoke current refresh |
| POST | `/auth/forgot-password` | 🔓 | Email reset link |
| POST | `/auth/reset-password` | 🔓 | Consume reset token, set password |
| GET | `/auth/me` | 🔐 | Current user profile |
| GET | `/auth/sessions` | 🔐 | List active refresh sessions |
| DELETE | `/auth/sessions/:id` | 🔐 | Revoke a session |

### Organization (Phase 3)

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/departments` | 🛡️ department:read | List/paginate |
| POST | `/departments` | 🛡️ department:manage | Create |
| GET | `/departments/:id` | 🛡️ department:read | Detail |
| PATCH | `/departments/:id` | 🛡️ department:manage | Update / set manager |
| DELETE | `/departments/:id` | 🛡️ department:manage | Delete (guards members) |
| GET | `/categories` | 🛡️ category:read | Tree/list |
| POST | `/categories` | 🛡️ category:manage | Create (optional parent) |
| PATCH | `/categories/:id` | 🛡️ category:manage | Update |
| DELETE | `/categories/:id` | 🛡️ category:manage | Delete (guards assets) |
| GET | `/users` | 🛡️ user:read | Employee directory (filter role/dept/status) |
| GET | `/users/:id` | 🛡️ user:read | Profile |
| PATCH | `/users/:id` | 🛡️ user:manage | Update profile/status |
| POST | `/users/:id/promote` | 🛡️ user:promote | Change role (+ `RoleChangeLog`) |

### Assets (Phase 4)

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/assets` | 🛡️ asset:read | Search/filter/paginate |
| POST | `/assets` | 🛡️ asset:manage | Register (auto tag + QR) |
| GET | `/assets/:id` | 🛡️ asset:read | Detail |
| PATCH | `/assets/:id` | 🛡️ asset:manage | Update |
| POST | `/assets/:id/status` | 🛡️ asset:manage | Guarded lifecycle transition |
| POST | `/assets/:id/retire` | 🛡️ asset:retire | Retire |
| GET | `/assets/:id/history` | 🛡️ asset:read | Event ledger |
| GET | `/assets/:id/qr` | 🛡️ asset:read | QR image/payload |
| GET | `/assets/lookup/:assetTag` | 🔐 | Resolve QR scan → asset |

### Allocation (Phase 5)

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/allocations` | 🛡️ allocation:read | List (scoped to self unless manager+) |
| POST | `/allocations` | 🛡️ allocation:create | Allocate asset to user |
| GET | `/allocations/:id` | 🛡️ allocation:read | Detail |
| POST | `/allocations/:id/revoke` | 🛡️ allocation:approve | Force-revoke |
| POST | `/transfers` | 🛡️ transfer:request | Request transfer |
| GET | `/transfers` | 🛡️ allocation:read | List (incoming/outgoing) |
| POST | `/transfers/:id/approve` | 🛡️ transfer:approve | Approve |
| POST | `/transfers/:id/reject` | 🛡️ transfer:approve | Reject |
| POST | `/transfers/:id/cancel` | 🔐 owner | Requester cancels |
| POST | `/returns` | 🛡️ return:process | Request return |
| POST | `/returns/:id/approve` | 🛡️ allocation:approve | Approve → close allocation |
| POST | `/returns/:id/reject` | 🛡️ allocation:approve | Reject |

### Booking (Phase 6)

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/bookings` | 🛡️ booking:read | Calendar/list (filter asset/date-range) |
| POST | `/bookings` | 🛡️ booking:create | Create (overlap-validated) |
| GET | `/bookings/:id` | 🛡️ booking:read | Detail |
| PATCH | `/bookings/:id/reschedule` | 🔐 owner / manage_any | Move times (re-validate) |
| POST | `/bookings/:id/cancel` | 🔐 owner / manage_any | Cancel |
| GET | `/assets/:id/availability` | 🛡️ booking:read | Free/busy slots |

### Maintenance (Phase 7)

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/maintenance` | 🛡️ maintenance:read | List (filter status/priority/tech) |
| POST | `/maintenance` | 🛡️ maintenance:request | Raise request |
| GET | `/maintenance/:id` | 🛡️ maintenance:read | Detail + logs |
| POST | `/maintenance/:id/approve` | 🛡️ maintenance:approve | Approve/reject |
| POST | `/maintenance/:id/assign` | 🛡️ maintenance:assign | Assign technician |
| POST | `/maintenance/:id/progress` | 🛡️ maintenance:work | Add log / advance status |
| POST | `/maintenance/:id/complete` | 🛡️ maintenance:work | Complete (asset → AVAILABLE) |

### Audit (Phase 8)

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/audit/cycles` | 🛡️ audit:read | List cycles |
| POST | `/audit/cycles` | 🛡️ audit:manage | Create cycle |
| POST | `/audit/cycles/:id/start` | 🛡️ audit:manage | Generate records, start |
| POST | `/audit/cycles/:id/assignments` | 🛡️ audit:manage | Assign auditor to scope |
| GET | `/audit/cycles/:id/records` | 🛡️ audit:read | Records (auditor sees own scope) |
| POST | `/audit/records/:id/verify` | 🛡️ audit:verify | Record observation |
| POST | `/audit/records/:id/discrepancy` | 🛡️ audit:verify | Raise discrepancy |
| GET | `/audit/cycles/:id/report` | 🛡️ audit:read | Summary + discrepancies |

### Reports & Notifications (Phases 9–10)

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/reports/dashboard` | 🛡️ report:read | KPI summary |
| GET | `/reports/assets` | 🛡️ report:read | Asset analytics (by status/category/dept) |
| GET | `/reports/utilization` | 🛡️ report:read | Allocation/booking utilization |
| GET | `/reports/export/:kind.csv` | 🛡️ report:export | CSV export |
| GET | `/reports/export/:kind.pdf` | 🛡️ report:export | PDF export |
| GET | `/notifications` | 🔐 | Own notifications (paginated) |
| POST | `/notifications/:id/read` | 🔐 | Mark read |
| POST | `/notifications/read-all` | 🔐 | Mark all read |
| GET | `/activity` | 🛡️ activity:read | Activity feed (filterable) |

### Realtime (Phase 10) — Socket.io

Namespace `/`, authenticated by access token on handshake. Rooms: `user:<id>`,
`department:<id>`, `role:<ROLE>`. Server-emitted events (see
`SOCKET_EVENTS`): `notification:new`, `asset:updated`, `allocation:updated`,
`maintenance:updated`, `booking:updated`.
