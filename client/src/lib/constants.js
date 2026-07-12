// Mirrors server/src/constants.js so the client stays aligned with the spec.

export const ROLES = {
  ADMIN: 'admin',
  ASSET_MANAGER: 'asset_manager',
  DEPARTMENT_HEAD: 'department_head',
  EMPLOYEE: 'employee',
};

export const ROLE_LABEL = {
  admin: 'Admin',
  asset_manager: 'Asset Manager',
  department_head: 'Department Head',
  employee: 'Employee',
};

export const ASSIGNABLE_ROLES = ['asset_manager', 'department_head', 'employee'];

export const ASSET_STATUS = [
  'Available',
  'Allocated',
  'Reserved',
  'Under Maintenance',
  'Lost',
  'Retired',
  'Disposed',
];

export const ASSET_CONDITION = ['New', 'Good', 'Fair', 'Poor', 'Damaged'];

export const MAINTENANCE_STATUS = [
  'Pending',
  'Approved',
  'Technician Assigned',
  'In Progress',
  'Resolved',
  'Rejected',
];

export const AUDIT_ENTRY_STATUS = ['Pending', 'Verified', 'Missing', 'Damaged'];

// Roles allowed to approve / manage (matches APPROVER on the server).
export const MANAGER_ROLES = ['admin', 'asset_manager'];
export const APPROVER_ROLES = ['admin', 'asset_manager', 'department_head'];

// Maps a status/condition string to a pill color class.
export function statusColor(status) {
  switch (status) {
    case 'Available':
    case 'Verified':
    case 'Approved':
    case 'Confirmed':
    case 'Resolved':
    case 'Completed':
    case 'New':
    case 'Good':
      return 'green';
    case 'Allocated':
    case 'Reserved':
    case 'In Progress':
    case 'Technician Assigned':
    case 'Requested':
    case 'Pending':
    case 'Fair':
      return 'blue';
    case 'Under Maintenance':
    case 'Open':
    case 'Poor':
      return 'amber';
    case 'Lost':
    case 'Damaged':
    case 'Missing':
    case 'Rejected':
    case 'Cancelled':
    case 'Retired':
    case 'Disposed':
      return 'red';
    default:
      return 'grey';
  }
}