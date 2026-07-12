// Central enums so client + server stay in sync with the spec.

export const ROLES = {
  ADMIN: 'admin',
  ASSET_MANAGER: 'asset_manager',
  DEPARTMENT_HEAD: 'department_head',
  EMPLOYEE: 'employee',
};

// Roles an Admin may assign from the Employee Directory (spec: only place roles are set).
export const ASSIGNABLE_ROLES = [ROLES.ASSET_MANAGER, ROLES.DEPARTMENT_HEAD, ROLES.EMPLOYEE];

export const ASSET_STATUS = {
  AVAILABLE: 'Available',
  ALLOCATED: 'Allocated',
  RESERVED: 'Reserved',
  UNDER_MAINTENANCE: 'Under Maintenance',
  LOST: 'Lost',
  RETIRED: 'Retired',
  DISPOSED: 'Disposed',
};

export const ASSET_CONDITION = ['New', 'Good', 'Fair', 'Poor', 'Damaged'];

export const TRANSFER_STATUS = {
  REQUESTED: 'Requested',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  COMPLETED: 'Completed',
};

export const ALLOCATION_STATUS = {
  ACTIVE: 'Active',
  RETURNED: 'Returned',
};

export const NOTIF_TYPES = {
  ASSET_ASSIGNED: 'Asset Assigned',
  TRANSFER_APPROVED: 'Transfer Approved',
  TRANSFER_REQUESTED: 'Transfer Requested',
  OVERDUE_RETURN: 'Overdue Return Alert',
  MAINTENANCE_APPROVED: 'Maintenance Approved',
  MAINTENANCE_REJECTED: 'Maintenance Rejected',
  BOOKING_CONFIRMED: 'Booking Confirmed',
  AUDIT_DISCREPANCY: 'Audit Discrepancy Flagged',
};