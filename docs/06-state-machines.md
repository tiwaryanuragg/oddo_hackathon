# 06 — State Machines

Every status-bearing entity moves only along explicitly allowed transitions.
Each module ships a `transitions.ts` guard (a `Record<FromState, ToState[]>`)
that the service consults before any status write; an illegal move throws
`AppError.invalidTransition()` → HTTP 409 `INVALID_STATE_TRANSITION`. This is
what makes the workflows tamper-resistant and idempotent.

## 6.1 Asset lifecycle (`AssetStatus`)

```mermaid
stateDiagram-v2
    [*] --> DRAFT : register
    DRAFT --> AVAILABLE : publish
    AVAILABLE --> RESERVED : booking confirmed
    RESERVED --> AVAILABLE : booking ends/cancelled
    AVAILABLE --> ALLOCATED : allocate
    RESERVED --> ALLOCATED : allocate (booked pickup)
    ALLOCATED --> AVAILABLE : return approved
    AVAILABLE --> IN_MAINTENANCE : maintenance approved
    ALLOCATED --> IN_MAINTENANCE : maintenance approved
    IN_MAINTENANCE --> AVAILABLE : maintenance completed
    AVAILABLE --> UNDER_AUDIT : audit cycle started
    UNDER_AUDIT --> AVAILABLE : audit verified
    AVAILABLE --> RETIRED : retire
    ALLOCATED --> LOST : reported lost
    UNDER_AUDIT --> LOST : audit marks missing
    RETIRED --> [*]
```

| From | Allowed to |
| --- | --- |
| DRAFT | AVAILABLE |
| AVAILABLE | RESERVED, ALLOCATED, IN_MAINTENANCE, UNDER_AUDIT, RETIRED |
| RESERVED | AVAILABLE, ALLOCATED |
| ALLOCATED | AVAILABLE, IN_MAINTENANCE, LOST |
| IN_MAINTENANCE | AVAILABLE |
| UNDER_AUDIT | AVAILABLE, LOST |
| RETIRED / LOST | *(terminal)* |

Every transition appends an `AssetEvent(STATUS_CHANGED, fromStatus, toStatus)`.

## 6.2 Allocation (`AllocationStatus`)

```mermaid
stateDiagram-v2
    [*] --> ACTIVE : allocate
    ACTIVE --> RETURN_REQUESTED : return requested
    ACTIVE --> OVERDUE : dueDate passed (scheduler)
    OVERDUE --> RETURN_REQUESTED : return requested
    RETURN_REQUESTED --> RETURNED : return approved
    RETURN_REQUESTED --> ACTIVE : return rejected
    ACTIVE --> REVOKED : force revoke (manager)
    OVERDUE --> REVOKED : force revoke
    RETURNED --> [*]
    REVOKED --> [*]
```

| From | Allowed to |
| --- | --- |
| ACTIVE | RETURN_REQUESTED, OVERDUE, REVOKED |
| OVERDUE | RETURN_REQUESTED, REVOKED |
| RETURN_REQUESTED | RETURNED, ACTIVE |
| RETURNED / REVOKED | *(terminal)* |

Invariant: at most one `ACTIVE` allocation per asset (partial unique index).

## 6.3 Transfer request (`TransferStatus`)

```mermaid
stateDiagram-v2
    [*] --> PENDING : request
    PENDING --> APPROVED : approve
    PENDING --> REJECTED : reject
    PENDING --> CANCELLED : requester cancels
    APPROVED --> COMPLETED : custody moved
    REJECTED --> [*]
    CANCELLED --> [*]
    COMPLETED --> [*]
```

| From | Allowed to |
| --- | --- |
| PENDING | APPROVED, REJECTED, CANCELLED |
| APPROVED | COMPLETED |
| REJECTED / CANCELLED / COMPLETED | *(terminal)* |

Approval runs in a transaction: close the old allocation, open a new `ACTIVE`
one for `toUser`, update `asset.assignedToId`, append `AssetEvent(TRANSFERRED)`.

## 6.4 Return (`ReturnStatus`)

```mermaid
stateDiagram-v2
    [*] --> REQUESTED : submit
    REQUESTED --> APPROVED : approve
    REQUESTED --> REJECTED : reject
    APPROVED --> COMPLETED : asset checked in
    REJECTED --> [*]
    COMPLETED --> [*]
```

| From | Allowed to |
| --- | --- |
| REQUESTED | APPROVED, REJECTED |
| APPROVED | COMPLETED |
| REJECTED / COMPLETED | *(terminal)* |

Completion sets allocation → `RETURNED`, asset → `AVAILABLE` (or
`IN_MAINTENANCE` if returned `DAMAGED`), and records the reported condition.

## 6.5 Booking (`BookingStatus`)

```mermaid
stateDiagram-v2
    [*] --> PENDING : create
    PENDING --> CONFIRMED : validated / auto-confirm
    CONFIRMED --> RESCHEDULED : reschedule
    RESCHEDULED --> CONFIRMED : new time validated
    PENDING --> CANCELLED : cancel
    CONFIRMED --> CANCELLED : cancel
    CONFIRMED --> COMPLETED : end time passed
    CONFIRMED --> NO_SHOW : not picked up
    CANCELLED --> [*]
    COMPLETED --> [*]
    NO_SHOW --> [*]
```

| From | Allowed to |
| --- | --- |
| PENDING | CONFIRMED, CANCELLED |
| CONFIRMED | RESCHEDULED, CANCELLED, COMPLETED, NO_SHOW |
| RESCHEDULED | CONFIRMED, CANCELLED |
| CANCELLED / COMPLETED / NO_SHOW | *(terminal)* |

Create and reschedule both run overlap validation against
`PENDING|CONFIRMED|RESCHEDULED` bookings for the same asset.

## 6.6 Maintenance request (`MaintenanceStatus`)

```mermaid
stateDiagram-v2
    [*] --> REQUESTED : raise
    REQUESTED --> APPROVED : approve
    REQUESTED --> REJECTED : reject
    REQUESTED --> CANCELLED : requester cancels
    APPROVED --> ASSIGNED : assign technician
    ASSIGNED --> IN_PROGRESS : work started
    IN_PROGRESS --> ON_HOLD : blocked
    ON_HOLD --> IN_PROGRESS : resumed
    IN_PROGRESS --> COMPLETED : work done
    ASSIGNED --> CANCELLED : cancel
    REJECTED --> [*]
    CANCELLED --> [*]
    COMPLETED --> [*]
```

| From | Allowed to |
| --- | --- |
| REQUESTED | APPROVED, REJECTED, CANCELLED |
| APPROVED | ASSIGNED, CANCELLED |
| ASSIGNED | IN_PROGRESS, CANCELLED |
| IN_PROGRESS | ON_HOLD, COMPLETED |
| ON_HOLD | IN_PROGRESS |
| REJECTED / CANCELLED / COMPLETED | *(terminal)* |

**Asset-status automation:** entering `IN_PROGRESS` drives the asset to
`IN_MAINTENANCE`; `COMPLETED` returns it to `AVAILABLE`. Each step appends a
`MaintenanceLog` and `AssetEvent`.

## 6.7 Audit cycle (`AuditCycleStatus`) & record (`AuditRecordStatus`)

```mermaid
stateDiagram-v2
    direction LR
    state Cycle {
        [*] --> DRAFT
        DRAFT --> SCHEDULED : schedule
        SCHEDULED --> IN_PROGRESS : start (generate records)
        IN_PROGRESS --> COMPLETED : close
        DRAFT --> CANCELLED
        SCHEDULED --> CANCELLED
        IN_PROGRESS --> CANCELLED
    }
```

| Cycle from | Allowed to |
| --- | --- |
| DRAFT | SCHEDULED, CANCELLED |
| SCHEDULED | IN_PROGRESS, CANCELLED |
| IN_PROGRESS | COMPLETED, CANCELLED |
| COMPLETED / CANCELLED | *(terminal)* |

```mermaid
stateDiagram-v2
    [*] --> PENDING : record generated
    PENDING --> VERIFIED : matches expectation
    PENDING --> DISCREPANCY : mismatch → report
    PENDING --> MISSING : not found
    VERIFIED --> [*]
    DISCREPANCY --> [*]
    MISSING --> [*]
```

| Record from | Allowed to |
| --- | --- |
| PENDING | VERIFIED, DISCREPANCY, MISSING |
| VERIFIED / DISCREPANCY / MISSING | *(terminal within cycle)* |

Starting a cycle sets in-scope assets → `UNDER_AUDIT`; `VERIFIED`/closing
returns them to their prior status; `MISSING` transitions the asset → `LOST`.
`DISCREPANCY` creates a `DiscrepancyReport` child.

## 6.8 User account (`UserStatus`)

```mermaid
stateDiagram-v2
    [*] --> PENDING : signup
    PENDING --> ACTIVE : admin activates
    ACTIVE --> SUSPENDED : suspend
    SUSPENDED --> ACTIVE : reinstate
    ACTIVE --> DEACTIVATED : deactivate
    SUSPENDED --> DEACTIVATED : deactivate
    DEACTIVATED --> [*]
```

| From | Allowed to |
| --- | --- |
| PENDING | ACTIVE |
| ACTIVE | SUSPENDED, DEACTIVATED |
| SUSPENDED | ACTIVE, DEACTIVATED |
| DEACTIVATED | *(terminal)* |

Only `ACTIVE` users may authenticate; login checks status and returns
`AUTH_ACCOUNT_INACTIVE` otherwise.
