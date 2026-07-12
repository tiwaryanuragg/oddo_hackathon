import Asset from '../models/Asset.js';
import Allocation from '../models/Allocation.js';
import TransferRequest from '../models/TransferRequest.js';
import ActivityLog from '../models/ActivityLog.js';
import Booking, { BOOKING_STATUS } from '../models/Booking.js';
import MaintenanceRequest from '../models/MaintenanceRequest.js';
import AuditCycle from '../models/AuditCycle.js';
import { ASSET_STATUS, ALLOCATION_STATUS, TRANSFER_STATUS } from '../constants.js';
import { asyncHandler } from '../utils/helpers.js';

// GET /api/dashboard — KPI cards, overdue returns, upcoming returns, recent activity.
export const getDashboard = asyncHandler(async (_req, res) => {
  const now = new Date();
  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now); endOfDay.setHours(23, 59, 59, 999);
  const soon = new Date(now); soon.setDate(soon.getDate() + 7);

  const [
    available, allocated, underMaintenance, activeBookings, pendingTransfers,
    overdueDocs, upcomingDocs, recent, maintenanceBoard, openAudits,
  ] = await Promise.all([
    Asset.countDocuments({ status: ASSET_STATUS.AVAILABLE }),
    Asset.countDocuments({ status: ASSET_STATUS.ALLOCATED }),
    Asset.countDocuments({ status: ASSET_STATUS.UNDER_MAINTENANCE }),
    Booking.countDocuments({ status: BOOKING_STATUS.CONFIRMED, endAt: { $gte: now } }),
    TransferRequest.countDocuments({ status: TRANSFER_STATUS.REQUESTED }),
    Allocation.find({
      status: ALLOCATION_STATUS.ACTIVE,
      expectedReturnDate: { $ne: null, $lt: startOfDay },
    }).populate('asset', 'tag name').populate('employee', 'name'),
    Allocation.find({
      status: ALLOCATION_STATUS.ACTIVE,
      expectedReturnDate: { $gte: startOfDay, $lte: soon },
    }).populate('asset', 'tag name').populate('employee', 'name'),
    ActivityLog.find().populate('actor', 'name').sort({ createdAt: -1 }).limit(10),
    MaintenanceRequest.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    AuditCycle.find({ status: 'Open' }, { discrepancyCount: 1 }),
  ]);

  const maintenanceByStatus = maintenanceBoard.reduce((acc, row) => {
    acc[row._id] = row.count;
    return acc;
  }, {});
  const openAuditDiscrepancies = openAudits.reduce(
    (sum, cycle) => sum + (cycle.discrepancyCount || 0),
    0
  );

  res.json({
    kpis: {
      available,
      allocated,
      maintenanceToday: underMaintenance,
      activeBookings,
      pendingTransfers,
      upcomingReturns: upcomingDocs.length,
    },
    overdue: overdueDocs.map((a) => ({
      id: a._id,
      asset: a.asset,
      holder: a.employee?.name || null,
      expectedReturnDate: a.expectedReturnDate,
    })),
    upcoming: upcomingDocs.map((a) => ({
      id: a._id,
      asset: a.asset,
      holder: a.employee?.name || null,
      expectedReturnDate: a.expectedReturnDate,
    })),
    recentActivity: recent.map((r) => ({
      id: r._id,
      message: r.message,
      actor: r.actor?.name || 'System',
      at: r.createdAt,
    })),
    maintenanceBoard: {
      pending: maintenanceByStatus.Pending || 0,
      approved: maintenanceByStatus.Approved || 0,
      technicianAssigned: maintenanceByStatus['Technician Assigned'] || 0,
      inProgress: maintenanceByStatus['In Progress'] || 0,
      resolved: maintenanceByStatus.Resolved || 0,
    },
    openAuditDiscrepancies,
  });
});