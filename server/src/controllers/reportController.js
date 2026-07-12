import Asset from '../models/Asset.js';
import Allocation from '../models/Allocation.js';
import MaintenanceRequest from '../models/MaintenanceRequest.js';
import Department from '../models/Department.js';
import Booking, { BOOKING_STATUS } from '../models/Booking.js';
import AuditCycle from '../models/AuditCycle.js';
import { ALLOCATION_STATUS } from '../constants.js';
import { asyncHandler } from '../utils/helpers.js';

export const getSummary = asyncHandler(async (_req, res) => {
  const [departments, assets, allocations, maintenance, bookings, audits] = await Promise.all([
    Department.find({}, { _id: 1, name: 1 }),
    Asset.find({}, { _id: 1, tag: 1, name: 1, status: 1, acquisitionDate: 1, updatedAt: 1 }),
    Allocation.find({}, { asset: 1, department: 1, status: 1, createdAt: 1, returnedAt: 1 })
      .populate('asset', 'tag name')
      .populate('department', 'name'),
    MaintenanceRequest.find({}, { asset: 1, status: 1, createdAt: 1 }).populate('asset', 'tag name'),
    Booking.find({ status: BOOKING_STATUS.CONFIRMED }, { startAt: 1, endAt: 1 }),
    AuditCycle.find({}, { title: 1, discrepancyCount: 1, closedAt: 1, entries: 1 })
      .sort({ closedAt: -1 })
      .limit(5)
      .populate('entries.asset', 'tag name'),
  ]);

  const utilizationByDepartment = departments.map((dept) => {
    const active = allocations.filter(
      (a) =>
        a.status === ALLOCATION_STATUS.ACTIVE
        && String(a.department?._id || a.department) === String(dept._id)
    ).length;
    return { department: dept.name, activeAllocations: active };
  });

  const usageMap = new Map();
  allocations.forEach((a) => {
    const key = String(a.asset?._id || a.asset);
    const prev = usageMap.get(key) || { count: 0, asset: a.asset };
    prev.count += 1;
    usageMap.set(key, prev);
  });

  const mostUsedAssets = [...usageMap.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((entry) => ({
      assetId: entry.asset?._id,
      tag: entry.asset?.tag || '',
      name: entry.asset?.name || '',
      allocations: entry.count,
    }));

  const maintenanceMap = new Map();
  maintenance.forEach((m) => {
    const key = String(m.asset?._id || m.asset);
    const prev = maintenanceMap.get(key) || { count: 0, asset: m.asset };
    prev.count += 1;
    maintenanceMap.set(key, prev);
  });

  const maintenanceFrequency = [...maintenanceMap.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((entry) => ({
      assetId: entry.asset?._id,
      tag: entry.asset?.tag || '',
      name: entry.asset?.name || '',
      requests: entry.count,
    }));

  const now = Date.now();
  const idleAssets = assets
    .filter((a) => a.status === 'Available')
    .map((a) => ({
      assetId: a._id,
      tag: a.tag,
      name: a.name,
      idleDays: Math.floor((now - new Date(a.updatedAt).getTime()) / (1000 * 60 * 60 * 24)),
    }))
    .sort((a, b) => b.idleDays - a.idleDays)
    .slice(0, 5);

  const nearRetirement = assets
    .filter((a) => {
      if (!a.acquisitionDate) return false;
      const years = (now - new Date(a.acquisitionDate).getTime()) / (1000 * 60 * 60 * 24 * 365);
      return years >= 4;
    })
    .map((a) => ({
      assetId: a._id,
      tag: a.tag,
      name: a.name,
      yearsInService: Number(((now - new Date(a.acquisitionDate).getTime()) / (1000 * 60 * 60 * 24 * 365)).toFixed(1)),
    }))
    .sort((a, b) => b.yearsInService - a.yearsInService)
    .slice(0, 10);

  const bookingHeatmap = Array.from({ length: 24 }, (_, hour) => ({ hour, bookings: 0 }));
  bookings.forEach((booking) => {
    const startHour = new Date(booking.startAt).getHours();
    const endHour = new Date(booking.endAt).getHours();
    const lastHour = endHour >= startHour ? endHour : startHour;
    for (let hour = startHour; hour <= lastHour; hour += 1) {
      if (bookingHeatmap[hour]) bookingHeatmap[hour].bookings += 1;
    }
  });

  const recentAuditDiscrepancies = audits.map((audit) => {
    const discrepancies = (audit.entries || []).filter((entry) =>
      ['Missing', 'Damaged'].includes(entry.verificationStatus)
    );
    return {
      auditId: audit._id,
      title: audit.title,
      closedAt: audit.closedAt,
      discrepancyCount: discrepancies.length || audit.discrepancyCount || 0,
      items: discrepancies.slice(0, 10).map((entry) => ({
        assetId: entry.asset?._id,
        tag: entry.asset?.tag || '',
        name: entry.asset?.name || '',
        status: entry.verificationStatus,
        notes: entry.notes || '',
      })),
    };
  });

  res.json({
    utilizationByDepartment,
    maintenanceFrequency,
    mostUsedAssets,
    idleAssets,
    nearRetirement,
    bookingHeatmap,
    recentAuditDiscrepancies,
  });
});
