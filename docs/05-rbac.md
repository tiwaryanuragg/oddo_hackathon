# 05 — Roles & Permissions (RBAC)

Authoritative code: `packages/shared/src/rbac.ts` (permission grants) and
`enums.ts` (`Role`, `ROLE_RANK`). Both the API's `authorize()` middleware and
the web `<Can>` guard read from the same matrix, so UI affordances never
diverge from what the server will allow.

## 5.1 Roles

| Role | Rank | Intent |
| --- | --- | --- |
| `SUPER_ADMIN` | 100 | Platform owner. Wildcard — every permission. Bootstrap/seed only. |
| `ADMIN` | 80 | Full operational control: users, assets, org, audit governance. |
| `MANAGER` | 60 | Runs a department: approves allocations/transfers/returns, manages assets/categories, approves & assigns maintenance, exports reports. |
| `AUDITOR` | 40 | Read-only across assets + performs audits and verifications. |
| `TECHNICIAN` | 40 | Employee powers + executes maintenance work. |
| `EMPLOYEE` | 20 | Base user: view assets, request allocations/transfers/returns, book resources, raise maintenance requests. |

Rank drives **promotion rules** (§5.4). AUDITOR and TECHNICIAN share rank 40 —
peers, distinguished by capability not seniority.

## 5.2 Permission model

Permissions use `resource:action`. A role's grant set is the union of its own
permissions and those it inherits (EMPLOYEE ⊂ TECHNICIAN/AUDITOR ⊂ MANAGER ⊂
ADMIN). `SUPER_ADMIN` short-circuits to `true` in `hasPermission()`.

```ts
import { hasPermission, Role } from '@assetflow/shared';
hasPermission(Role.MANAGER, 'transfer:approve'); // true
hasPermission(Role.EMPLOYEE, 'asset:manage');    // false
```

## 5.3 Permission matrix

✅ granted · — not granted · ⭐ SUPER_ADMIN implicitly has all.

| Permission | EMPLOYEE | TECHNICIAN | AUDITOR | MANAGER | ADMIN |
| --- | :--: | :--: | :--: | :--: | :--: |
| department:read | ✅ | ✅ | ✅ | ✅ | ✅ |
| department:manage | — | — | — | ✅ | ✅ |
| category:read | ✅ | ✅ | ✅ | ✅ | ✅ |
| category:manage | — | — | — | ✅ | ✅ |
| user:read | ✅ | ✅ | ✅ | ✅ | ✅ |
| user:manage | — | — | — | — | ✅ |
| user:promote | — | — | — | — | ✅ |
| asset:read | ✅ | ✅ | ✅ | ✅ | ✅ |
| asset:manage | — | — | — | ✅ | ✅ |
| asset:retire | — | — | — | — | ✅ |
| allocation:read | ✅ | ✅ | ✅ | ✅ | ✅ |
| allocation:create | ✅ | ✅ | ✅ | ✅ | ✅ |
| allocation:approve | — | — | — | ✅ | ✅ |
| transfer:request | ✅ | ✅ | ✅ | ✅ | ✅ |
| transfer:approve | — | — | — | ✅ | ✅ |
| return:process | ✅ | ✅ | ✅ | ✅ | ✅ |
| booking:read | ✅ | ✅ | ✅ | ✅ | ✅ |
| booking:create | ✅ | ✅ | ✅ | ✅ | ✅ |
| booking:manage_any | — | — | — | ✅ | ✅ |
| maintenance:read | ✅ | ✅ | ✅ | ✅ | ✅ |
| maintenance:request | ✅ | ✅ | ✅ | ✅ | ✅ |
| maintenance:approve | — | — | — | ✅ | ✅ |
| maintenance:assign | — | — | — | ✅ | ✅ |
| maintenance:work | — | ✅ | — | — | ✅ |
| audit:read | — | — | ✅ | ✅ | ✅ |
| audit:manage | — | — | — | — | ✅ |
| audit:verify | — | — | ✅ | — | ✅ |
| report:read | — | — | ✅ | ✅ | ✅ |
| report:export | — | — | — | ✅ | ✅ |
| activity:read | — | — | — | ✅ | ✅ |

> This table is the human-readable mirror of `PERMISSIONS` in
> `packages/shared/src/rbac.ts`; a unit test asserts they stay in sync.

## 5.4 Role promotion rules

Enforced by the Organization module (`POST /users/:id/promote`) and recorded in
`role_change_logs`.

1. **Requires** `user:promote` (ADMIN or SUPER_ADMIN).
2. **Ceiling:** an actor may only assign a role of rank **strictly below their
   own** (`ROLE_RANK[target] < ROLE_RANK[actor]`). So ADMIN (80) can grant up to
   MANAGER (60) but never ADMIN or SUPER_ADMIN. Only SUPER_ADMIN can mint ADMIN.
3. **No self-promotion:** an actor cannot change their own role.
4. **Last-admin guard:** the system refuses to demote the final
   ADMIN/SUPER_ADMIN, preventing lockout.
5. Every change writes `RoleChangeLog { fromRole, toRole, changedBy, reason }`
   and emits a `ROLE_CHANGE` notification to the affected user.

## 5.5 Beyond role checks: ownership / row-level rules

Permissions gate *whether* an action is allowed at all; services additionally
enforce *on which rows*. Examples:

- **allocation:create** lets any user request, but an EMPLOYEE may only create a
  request for **themselves**; MANAGER+ may allocate to others in their scope.
- **return:process** — an EMPLOYEE may only return an allocation they hold.
- **booking cancel/reschedule** — the owner may act on their own booking;
  `booking:manage_any` is required to touch someone else's.
- **audit:verify** — an AUDITOR may only verify records within their assigned
  scope (`AuditAssignment.departmentId`).
- **Manager scoping** — MANAGER approvals are constrained to their own
  department unless the actor is ADMIN+.

These checks live in the service layer (not middleware) because they depend on
the resource being loaded. They throw `AppError.forbidden()` → HTTP 403.
