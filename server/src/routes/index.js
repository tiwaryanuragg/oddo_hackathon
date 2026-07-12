import { Router } from 'express';
import { ROLES } from '../constants.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

import * as auth from '../controllers/authController.js';
import * as org from '../controllers/orgController.js';
import * as asset from '../controllers/assetController.js';
import * as alloc from '../controllers/allocationController.js';
import * as dash from '../controllers/dashboardController.js';
import * as misc from '../controllers/miscController.js';
import * as booking from '../controllers/bookingController.js';
import * as maintenance from '../controllers/maintenanceController.js';
import * as audit from '../controllers/auditController.js';
import * as reports from '../controllers/reportController.js';

const router = Router();

const MANAGER = [ROLES.ADMIN, ROLES.ASSET_MANAGER];
const APPROVER = [ROLES.ADMIN, ROLES.ASSET_MANAGER, ROLES.DEPARTMENT_HEAD];

/* ---- Auth ---- */
router.post('/auth/signup', auth.signup);
router.post('/auth/login', auth.login);
router.post('/auth/forgot-password', auth.forgotPassword);
router.post('/auth/reset-password', auth.resetPassword);
router.get('/auth/me', requireAuth, auth.me);

/* ---- Organization setup (Admin only for writes) ---- */
router.get('/org/departments', requireAuth, org.listDepartments);
router.post('/org/departments', requireAuth, requireRole(ROLES.ADMIN), org.createDepartment);
router.patch('/org/departments/:id', requireAuth, requireRole(ROLES.ADMIN), org.updateDepartment);

router.get('/org/categories', requireAuth, org.listCategories);
router.post('/org/categories', requireAuth, requireRole(ROLES.ADMIN), org.createCategory);
router.patch('/org/categories/:id', requireAuth, requireRole(ROLES.ADMIN), org.updateCategory);

router.get('/org/employees', requireAuth, org.listEmployees);
// Role assignment is admin-only and the single source of role changes.
router.patch('/org/employees/:id', requireAuth, requireRole(ROLES.ADMIN), org.updateEmployee);

/* ---- Assets ---- */
router.get('/assets', requireAuth, asset.listAssets);
router.get('/assets/:id', requireAuth, asset.getAsset);
router.post('/assets', requireAuth, requireRole(...MANAGER), asset.createAsset);
router.patch('/assets/:id', requireAuth, requireRole(...MANAGER), asset.updateAsset);

/* ---- Allocation & Transfer ---- */
router.post('/allocations', requireAuth, requireRole(...APPROVER), alloc.allocate);
router.post('/allocations/:assetId/return', requireAuth, requireRole(...APPROVER), alloc.returnAsset);

router.get('/transfers', requireAuth, alloc.listTransfers);
router.post('/transfers', requireAuth, alloc.requestTransfer); // any authed user may request
router.patch('/transfers/:id', requireAuth, requireRole(...APPROVER), alloc.decideTransfer);

/* ---- Resource booking ---- */
router.get('/bookings', requireAuth, booking.listBookings);
router.get('/bookings/availability', requireAuth, booking.getAvailability);
router.post('/bookings', requireAuth, booking.createBooking);
router.patch('/bookings/:id/cancel', requireAuth, booking.cancelBooking);

/* ---- Maintenance ---- */
router.get('/maintenance', requireAuth, maintenance.listMaintenance);
router.post('/maintenance', requireAuth, maintenance.requestMaintenance);
router.patch('/maintenance/:id/decision', requireAuth, requireRole(...APPROVER), maintenance.decideMaintenance);
router.patch('/maintenance/:id/assign', requireAuth, requireRole(...APPROVER), maintenance.assignTechnician);
router.patch('/maintenance/:id/status', requireAuth, requireRole(...APPROVER), maintenance.updateMaintenanceStatus);

/* ---- Audit ---- */
router.get('/audits', requireAuth, requireRole(...APPROVER), audit.listAudits);
router.post('/audits/start', requireAuth, requireRole(...APPROVER), audit.startAudit);
router.get('/audits/:id', requireAuth, requireRole(...APPROVER), audit.getAudit);
router.patch('/audits/:id/assets/:assetId', requireAuth, requireRole(...APPROVER), audit.verifyAuditEntry);
router.post('/audits/:id/close', requireAuth, requireRole(...APPROVER), audit.closeAudit);

/* ---- Reports ---- */
router.get('/reports/summary', requireAuth, requireRole(...APPROVER), reports.getSummary);

/* ---- Dashboard / notifications / activity ---- */
router.get('/dashboard', requireAuth, dash.getDashboard);
router.get('/notifications', requireAuth, misc.listNotifications);
router.patch('/notifications/:id/read', requireAuth, misc.markNotificationRead);
router.post('/notifications/read-all', requireAuth, misc.markAllRead);
router.get('/activity', requireAuth, requireRole(...APPROVER), misc.listActivity);

export default router;