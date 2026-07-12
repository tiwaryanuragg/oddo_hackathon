# 03 — Database Reference

PostgreSQL via Prisma. Authoritative source: `apps/api/prisma/schema.prisma`.
This document explains intent, invariants, and the handful of constraints that
Prisma's schema DSL cannot express directly (added via migration SQL).

## 3.1 Conventions

- **PK:** `cuid()` string ids — collision-resistant, URL-safe, non-sequential
  (so ids can't be enumerated to probe volume).
- **Naming:** camelCase fields in code, snake_case tables via `@@map`.
- **Timestamps:** every mutable table has `createdAt @default(now())` and
  `updatedAt @updatedAt`. Append-only tables omit `updatedAt`.
- **Money:** `Decimal(12,2)` — never floats.
- **Delete behavior:**
  - `Restrict` on actor/ownership references that anchor audit trails
    (`registeredBy`, `issuedBy`, `holder`, `technician` link targets) — you
    cannot hard-delete a user who owns history; deactivate instead.
  - `SetNull` on optional descriptive links (`department`, `assignedTo`,
    `approver`) so history survives the loss of the referenced row.
  - `Cascade` only on true children (`AssetEvent`, `MaintenanceLog`,
    `AuditRecord`, `RefreshToken`, `Notification`).
- **Enums:** duplicated in `packages/shared/src/enums.ts`; a drift test asserts
  parity.

## 3.2 Tables

### Identity & Organization

| Table | Purpose | Key columns / indexes | Notes |
| --- | --- | --- | --- |
| `users` | People + auth identity | `email` UK; idx `role`, `status`, `departmentId` | `passwordHash` (Argon2id). `status` gates login. `role` drives RBAC. |
| `departments` | Org units | `name` UK, `code` UK; idx `managerId` | `manager` is a User; `SetNull` on manager removal. |
| `categories` | Asset taxonomy (tree) | `slug` UK; idx `parentId` | Self-referential `parentId`; carries depreciation defaults inherited by assets. |

### Auth

| Table | Purpose | Key columns / indexes | Notes |
| --- | --- | --- | --- |
| `refresh_tokens` | Rotating refresh sessions | `tokenHash` UK; idx `userId`, `expiresAt` | Only the **hash** is stored. `replacedById` forms a rotation chain; reuse of a revoked token ⇒ theft detection. |
| `password_reset_tokens` | Forgot-password flow | `tokenHash` UK; idx `userId` | Single-use (`usedAt`), short TTL. |

### Assets

| Table | Purpose | Key columns / indexes | Notes |
| --- | --- | --- | --- |
| `assets` | The registry | `assetTag` UK, `serialNumber` UK; idx `status`, `categoryId`, `departmentId`, `assignedToId`, `condition` | `assignedToId` is a denormalized cache of the current holder. `qrCodeUrl` caches the generated QR image. |
| `asset_events` | Append-only history ledger | idx `assetId`, `type`, `createdAt` | Never updated/deleted. `fromStatus`/`toStatus` capture lifecycle moves; `metadata` JSON holds context. |

### Allocation / Transfer / Return

| Table | Purpose | Key columns / indexes | Notes |
| --- | --- | --- | --- |
| `allocations` | Custody records | idx `assetId`, `holderId`, `status` | **Invariant:** ≤ 1 `ACTIVE` per asset (partial unique index, §3.3). |
| `transfer_requests` | Peer/managed handover | idx `assetId`, `toUserId`, `status` | Links optionally to the originating `allocation`. |
| `returns` | Return workflow | idx `allocationId`, `status` | Captures `reportedCondition`; approval closes the allocation. |

### Booking

| Table | Purpose | Key columns / indexes | Notes |
| --- | --- | --- | --- |
| `bookings` | Time-boxed reservations | idx `(assetId,startTime,endTime)`, `ownerId`, `status` | Overlap check uses the composite index. `reminderSentAt` drives the reminder scheduler. `rescheduledFromId` links a moved booking to its origin. |

### Maintenance

| Table | Purpose | Key columns / indexes | Notes |
| --- | --- | --- | --- |
| `maintenance_requests` | Repair/service tickets | idx `assetId`, `status`, `technicianId`, `priority` | Status changes auto-drive `asset.status` (→ `IN_MAINTENANCE` / back). |
| `maintenance_logs` | Progress timeline | idx `requestId` | Append-only notes with optional status snapshot. |

### Audit

| Table | Purpose | Key columns / indexes | Notes |
| --- | --- | --- | --- |
| `audit_cycles` | Audit campaigns | idx `status` | Time-boxed by `startDate`/`endDate`. |
| `audit_assignments` | Auditor ↔ scope | UK `(auditCycleId,auditorId,departmentId)`; idx `auditorId` | Null `departmentId` ⇒ whole-org scope. |
| `audit_records` | Per-asset verification | UK `(auditCycleId,assetId)`; idx `status`, `assetId` | One line per asset per cycle. |
| `discrepancy_reports` | Raised anomalies | `auditRecordId` UK; idx `resolved` | 1:1 optional child of an audit record. |

### Cross-cutting

| Table | Purpose | Key columns / indexes | Notes |
| --- | --- | --- | --- |
| `notifications` | Per-user inbox | idx `(userId,isRead)`, `createdAt` | Polymorphic `entityType`/`entityId` for deep-linking. |
| `activity_logs` | "Who did what" feed | idx `actorId`, `(entityType,entityId)`, `createdAt` | Append-only; `actorId` SetNull to survive user removal. |
| `role_change_logs` | Promotion audit | idx `userId` | Records `fromRole`→`toRole`, actor, reason. |

## 3.3 Invariants enforced beyond the Prisma DSL

Added in the initial migration as raw SQL (Prisma supports this via
`migration.sql` edits):

1. **Single active allocation per asset**
   ```sql
   CREATE UNIQUE INDEX allocations_one_active_per_asset
     ON allocations ("assetId")
     WHERE status = 'ACTIVE';
   ```
2. **No overlapping confirmed bookings per asset** — enforced primarily in the
   service (transactional overlap query), with an optional exclusion constraint
   for defense in depth:
   ```sql
   ALTER TABLE bookings ADD CONSTRAINT bookings_no_overlap
     EXCLUDE USING gist (
       "assetId" WITH =,
       tsrange("startTime", "endTime") WITH &&
     ) WHERE (status IN ('PENDING','CONFIRMED','RESCHEDULED'));
   -- requires: CREATE EXTENSION IF NOT EXISTS btree_gist;
   ```
3. **Booking time sanity:** `CHECK ("endTime" > "startTime")`.

## 3.4 Migration & seeding

```bash
npm run prisma:generate        # regenerate typed client after schema edits
npm run prisma:migrate         # dev: create + apply a named migration
npm run prisma:deploy          # prod/CI: apply committed migrations
npm run prisma:seed            # idempotent: super admin + reference data
npm run db:studio              # browse data
```

Migrations are committed to source control; production applies them with
`prisma migrate deploy` on release. Raw-SQL invariants (§3.3) live inside the
generated migration file so they version alongside the schema.
