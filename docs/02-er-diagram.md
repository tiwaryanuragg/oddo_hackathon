# 02 — Entity Relationship Diagram

Rendered from the authoritative `apps/api/prisma/schema.prisma`. View on any
Mermaid-capable renderer (GitHub, VS Code Mermaid preview).

## 2.1 Full ER diagram

```mermaid
erDiagram
    User ||--o{ Asset : "registers"
    User ||--o{ Asset : "is assigned"
    User }o--o| Department : "belongs to"
    Department ||--o{ User : "has members"
    Department }o--o| User : "managed by"
    Category ||--o{ Category : "parent of"
    Category ||--o{ Asset : "classifies"
    Department ||--o{ Asset : "owns"

    User ||--o{ RefreshToken : "has"
    User ||--o{ PasswordResetToken : "has"
    User ||--o{ RoleChangeLog : "target of"

    Asset ||--o{ AssetEvent : "history"
    Asset ||--o{ Allocation : "allocated via"
    Asset ||--o{ TransferRequest : "transferred via"
    Asset ||--o{ Booking : "booked via"
    Asset ||--o{ MaintenanceRequest : "maintained via"
    Asset ||--o{ AuditRecord : "audited via"

    Allocation ||--o{ TransferRequest : "spawns"
    Allocation ||--o{ Return : "closed by"
    User ||--o{ Allocation : "holds"
    User ||--o{ Allocation : "issues"

    User ||--o{ Booking : "owns"

    MaintenanceRequest ||--o{ MaintenanceLog : "progress"
    User ||--o{ MaintenanceRequest : "reports"
    User ||--o{ MaintenanceRequest : "approves"
    User ||--o{ MaintenanceRequest : "assigned technician"

    AuditCycle ||--o{ AuditAssignment : "scopes"
    AuditCycle ||--o{ AuditRecord : "contains"
    AuditRecord ||--o| DiscrepancyReport : "may raise"
    User ||--o{ AuditCycle : "creates"
    User ||--o{ AuditAssignment : "assigned as auditor"
    User ||--o{ AuditRecord : "verifies"

    User ||--o{ Notification : "receives"
    User ||--o{ ActivityLog : "actor of"
```

## 2.2 Core entities (fields abbreviated)

```mermaid
erDiagram
    User {
        string   id PK
        string   email UK
        string   passwordHash
        string   firstName
        string   lastName
        Role     role
        UserStatus status
        string   departmentId FK
        datetime lastLoginAt
    }
    Department {
        string id PK
        string name UK
        string code UK
        string managerId FK
    }
    Category {
        string  id PK
        string  slug UK
        string  parentId FK
        decimal defaultDepreciationRate
    }
    Asset {
        string         id PK
        string         assetTag UK
        string         name
        AssetStatus    status
        AssetCondition condition
        string         serialNumber UK
        string         categoryId FK
        string         departmentId FK
        string         assignedToId FK
        string         registeredById FK
        decimal        purchaseCost
        string         qrCodeUrl
    }
    Allocation {
        string           id PK
        string           assetId FK
        string           holderId FK
        string           issuedById FK
        AllocationStatus status
        datetime         dueDate
        datetime         returnedAt
    }
    Booking {
        string        id PK
        string        assetId FK
        string        ownerId FK
        BookingStatus status
        datetime      startTime
        datetime      endTime
    }
    MaintenanceRequest {
        string              id PK
        string              assetId FK
        MaintenanceStatus   status
        MaintenancePriority priority
        string              technicianId FK
    }
    AuditRecord {
        string            id PK
        string            auditCycleId FK
        string            assetId FK
        AuditRecordStatus status
        string            auditorId FK
    }

    User          ||--o{ Allocation : holds
    Asset         ||--o{ Allocation : has
    Asset         ||--o{ Booking : has
    Asset         ||--o{ MaintenanceRequest : has
    Asset         ||--o{ AuditRecord : has
    Department    ||--o{ User : contains
    Category      ||--o{ Asset : classifies
```

## 2.3 Relationship notes

- **Asset ↔ Allocation** is one-to-many historically, but a DB partial unique
  index enforces **at most one `ACTIVE` allocation per asset**. `Asset.assignedToId`
  is a denormalized cache of the current holder for fast "my assets" queries.
- **Category** is a self-referential tree (`parentId`) enabling
  `IT › Laptops › Ultrabooks`.
- **AssetEvent** is an append-only ledger — never updated or deleted — giving a
  complete, tamper-evident asset history.
- **AuditRecord** is unique per `(auditCycleId, assetId)`: one verification line
  per asset per cycle. A `DiscrepancyReport` is a 1:1 optional child raised only
  when the observed state diverges from the record.
- Actor foreign keys (registeredBy, issuedBy, approver…) use `RESTRICT`/`SetNull`
  to preserve audit trails even if a user is later deactivated.
