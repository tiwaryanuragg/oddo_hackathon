/**
 * Canonical domain enums.
 *
 * These MUST stay in lock-step with the enums declared in
 * `apps/api/prisma/schema.prisma`. Prisma generates its own TypeScript enums,
 * but those are server-only; the web client imports the copies below. A schema
 * drift test (Phase 2+) asserts the two sets are identical.
 */

export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  AUDITOR = 'AUDITOR',
  TECHNICIAN = 'TECHNICIAN',
  EMPLOYEE = 'EMPLOYEE',
}

/** Ordered privilege ranking. Higher number == more privilege. Used by the
 *  role-promotion rules: an actor may only promote up to (their rank - 1). */
export const ROLE_RANK: Record<Role, number> = {
  [Role.SUPER_ADMIN]: 100,
  [Role.ADMIN]: 80,
  [Role.MANAGER]: 60,
  [Role.AUDITOR]: 40,
  [Role.TECHNICIAN]: 40,
  [Role.EMPLOYEE]: 20,
};

export enum UserStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DEACTIVATED = 'DEACTIVATED',
}

export enum AssetStatus {
  DRAFT = 'DRAFT',
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  ALLOCATED = 'ALLOCATED',
  IN_MAINTENANCE = 'IN_MAINTENANCE',
  UNDER_AUDIT = 'UNDER_AUDIT',
  RETIRED = 'RETIRED',
  LOST = 'LOST',
}

export enum AssetCondition {
  NEW = 'NEW',
  GOOD = 'GOOD',
  FAIR = 'FAIR',
  POOR = 'POOR',
  DAMAGED = 'DAMAGED',
}

export enum AssetEventType {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  ALLOCATED = 'ALLOCATED',
  TRANSFERRED = 'TRANSFERRED',
  RETURNED = 'RETURNED',
  BOOKED = 'BOOKED',
  MAINTENANCE_STARTED = 'MAINTENANCE_STARTED',
  MAINTENANCE_COMPLETED = 'MAINTENANCE_COMPLETED',
  AUDITED = 'AUDITED',
  RETIRED = 'RETIRED',
}

export enum AllocationStatus {
  ACTIVE = 'ACTIVE',
  RETURN_REQUESTED = 'RETURN_REQUESTED',
  RETURNED = 'RETURNED',
  OVERDUE = 'OVERDUE',
  REVOKED = 'REVOKED',
}

export enum TransferStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export enum ReturnStatus {
  REQUESTED = 'REQUESTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  COMPLETED = 'COMPLETED',
}

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  RESCHEDULED = 'RESCHEDULED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  NO_SHOW = 'NO_SHOW',
}

export enum MaintenanceStatus {
  REQUESTED = 'REQUESTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum MaintenancePriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum AuditCycleStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum AuditRecordStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  DISCREPANCY = 'DISCREPANCY',
  MISSING = 'MISSING',
}

export enum DiscrepancyType {
  LOCATION_MISMATCH = 'LOCATION_MISMATCH',
  CONDITION_MISMATCH = 'CONDITION_MISMATCH',
  OWNERSHIP_MISMATCH = 'OWNERSHIP_MISMATCH',
  MISSING_ASSET = 'MISSING_ASSET',
  UNREGISTERED_ASSET = 'UNREGISTERED_ASSET',
}

export enum DiscrepancySeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum NotificationType {
  ALLOCATION = 'ALLOCATION',
  TRANSFER_REQUEST = 'TRANSFER_REQUEST',
  RETURN = 'RETURN',
  BOOKING = 'BOOKING',
  BOOKING_REMINDER = 'BOOKING_REMINDER',
  MAINTENANCE = 'MAINTENANCE',
  AUDIT = 'AUDIT',
  ROLE_CHANGE = 'ROLE_CHANGE',
  SYSTEM = 'SYSTEM',
}
