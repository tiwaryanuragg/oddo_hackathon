/**
 * Single source of truth for authorization.
 *
 * Permissions use a `resource:action` convention. The API's `authorize()`
 * middleware and the web client's `<Can>` guard both read from PERMISSIONS,
 * so a button is only ever rendered when the corresponding endpoint would
 * actually allow the call.
 */
import { Role } from './enums.js';

export type Permission =
  // Organization
  | 'department:read'
  | 'department:manage'
  | 'category:read'
  | 'category:manage'
  | 'user:read'
  | 'user:manage'
  | 'user:promote'
  // Assets
  | 'asset:read'
  | 'asset:manage'
  | 'asset:retire'
  // Allocation
  | 'allocation:read'
  | 'allocation:create'
  | 'allocation:approve'
  | 'transfer:request'
  | 'transfer:approve'
  | 'return:process'
  // Booking
  | 'booking:read'
  | 'booking:create'
  | 'booking:manage_any'
  // Maintenance
  | 'maintenance:read'
  | 'maintenance:request'
  | 'maintenance:approve'
  | 'maintenance:assign'
  | 'maintenance:work'
  // Audit
  | 'audit:read'
  | 'audit:manage'
  | 'audit:verify'
  // Reports
  | 'report:read'
  | 'report:export'
  // System
  | 'activity:read';

/** Base grants per role. SUPER_ADMIN is handled as a wildcard in code. */
const EMPLOYEE_PERMS: Permission[] = [
  'department:read',
  'category:read',
  'user:read',
  'asset:read',
  'allocation:read',
  'allocation:create',
  'transfer:request',
  'return:process',
  'booking:read',
  'booking:create',
  'maintenance:read',
  'maintenance:request',
];

const TECHNICIAN_PERMS: Permission[] = [
  ...EMPLOYEE_PERMS,
  'maintenance:work',
];

const AUDITOR_PERMS: Permission[] = [
  ...EMPLOYEE_PERMS,
  'audit:read',
  'audit:verify',
  'report:read',
];

const MANAGER_PERMS: Permission[] = [
  ...EMPLOYEE_PERMS,
  'department:manage',
  'category:manage',
  'asset:manage',
  'allocation:approve',
  'transfer:approve',
  'booking:manage_any',
  'maintenance:approve',
  'maintenance:assign',
  'audit:read',
  'report:read',
  'report:export',
  'activity:read',
];

const ADMIN_PERMS: Permission[] = [
  ...MANAGER_PERMS,
  ...AUDITOR_PERMS,
  ...TECHNICIAN_PERMS,
  'user:manage',
  'user:promote',
  'asset:retire',
  'audit:manage',
];

export const PERMISSIONS: Record<Role, Permission[]> = {
  [Role.SUPER_ADMIN]: [], // wildcard — see hasPermission()
  [Role.ADMIN]: dedupe(ADMIN_PERMS),
  [Role.MANAGER]: dedupe(MANAGER_PERMS),
  [Role.AUDITOR]: dedupe(AUDITOR_PERMS),
  [Role.TECHNICIAN]: dedupe(TECHNICIAN_PERMS),
  [Role.EMPLOYEE]: dedupe(EMPLOYEE_PERMS),
};

export function hasPermission(role: Role, permission: Permission): boolean {
  if (role === Role.SUPER_ADMIN) return true;
  return PERMISSIONS[role].includes(permission);
}

function dedupe(perms: Permission[]): Permission[] {
  return [...new Set(perms)];
}
