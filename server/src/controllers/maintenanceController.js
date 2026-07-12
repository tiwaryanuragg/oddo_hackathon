import Asset from '../models/Asset.js';
import MaintenanceRequest, { MAINTENANCE_STATUS } from '../models/MaintenanceRequest.js';
import { ASSET_STATUS, NOTIF_TYPES } from '../constants.js';
import { asyncHandler, ApiError, logActivity, notify } from '../utils/helpers.js';

export const listMaintenance = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = {};
  if (status) filter.status = status;

  const requests = await MaintenanceRequest.find(filter)
    .populate('asset', 'tag name status')
    .populate('requestedBy', 'name email')
    .populate('decidedBy', 'name')
    .sort({ createdAt: -1 });

  res.json({ requests });
});

export const requestMaintenance = asyncHandler(async (req, res) => {
  const { assetId, issue } = req.body;
  if (!assetId || !issue) throw new ApiError(400, 'Asset and issue are required');

  const asset = await Asset.findById(assetId);
  if (!asset) throw new ApiError(404, 'Asset not found');

  const request = await MaintenanceRequest.create({
    asset: assetId,
    issue,
    requestedBy: req.user._id,
  });

  await logActivity({
    actor: req.user._id,
    action: 'maintenance.requested',
    message: `Maintenance requested for ${asset.tag}`,
    entityType: 'Asset',
    entityId: asset._id,
  });

  res.status(201).json({ request });
});

export const decideMaintenance = asyncHandler(async (req, res) => {
  const { decision, note } = req.body; // approve | reject
  if (!['approve', 'reject'].includes(decision)) {
    throw new ApiError(400, 'Decision must be approve or reject');
  }
  const request = await MaintenanceRequest.findById(req.params.id).populate('asset requestedBy');
  if (!request) throw new ApiError(404, 'Maintenance request not found');
  if (request.status !== MAINTENANCE_STATUS.PENDING) {
    throw new ApiError(400, 'Only pending requests can be decided');
  }

  request.decidedBy = req.user._id;
  request.decidedAt = new Date();
  request.decisionNote = note || '';

  if (decision === 'approve') {
    request.status = MAINTENANCE_STATUS.APPROVED;
    request.asset.status = ASSET_STATUS.UNDER_MAINTENANCE;
    await request.asset.save();

    await notify({
      user: request.requestedBy?._id,
      type: NOTIF_TYPES.MAINTENANCE_APPROVED,
      category: 'Approval',
      message: `Maintenance approved for ${request.asset.tag}`,
    });

    await logActivity({
      actor: req.user._id,
      action: 'maintenance.approved',
      message: `Maintenance approved for ${request.asset.tag}`,
      entityType: 'Asset',
      entityId: request.asset._id,
    });
  } else {
    request.status = MAINTENANCE_STATUS.REJECTED;

    await notify({
      user: request.requestedBy?._id,
      type: NOTIF_TYPES.MAINTENANCE_REJECTED,
      category: 'Approval',
      message: `Maintenance rejected for ${request.asset.tag}`,
    });

    await logActivity({
      actor: req.user._id,
      action: 'maintenance.rejected',
      message: `Maintenance rejected for ${request.asset.tag}`,
      entityType: 'Asset',
      entityId: request.asset._id,
    });
  }

  await request.save();
  res.json({ request });
});

export const assignTechnician = asyncHandler(async (req, res) => {
  const { technician } = req.body;
  if (!technician) throw new ApiError(400, 'Technician name is required');

  const request = await MaintenanceRequest.findById(req.params.id).populate('asset');
  if (!request) throw new ApiError(404, 'Maintenance request not found');
  if (![MAINTENANCE_STATUS.APPROVED, MAINTENANCE_STATUS.TECHNICIAN_ASSIGNED].includes(request.status)) {
    throw new ApiError(400, 'Technician can only be assigned after approval');
  }

  request.assignedTechnician = technician;
  request.status = MAINTENANCE_STATUS.TECHNICIAN_ASSIGNED;
  await request.save();

  await logActivity({
    actor: req.user._id,
    action: 'maintenance.technician_assigned',
    message: `${technician} assigned for ${request.asset.tag}`,
    entityType: 'Asset',
    entityId: request.asset._id,
  });

  res.json({ request });
});

export const updateMaintenanceStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const allowed = [MAINTENANCE_STATUS.IN_PROGRESS, MAINTENANCE_STATUS.RESOLVED];
  if (!allowed.includes(status)) throw new ApiError(400, 'Invalid status transition');

  const request = await MaintenanceRequest.findById(req.params.id).populate('asset');
  if (!request) throw new ApiError(404, 'Maintenance request not found');
  if ([MAINTENANCE_STATUS.REJECTED, MAINTENANCE_STATUS.RESOLVED].includes(request.status)) {
    throw new ApiError(400, 'This request is already closed');
  }

  request.status = status;
  if (status === MAINTENANCE_STATUS.RESOLVED) {
    request.resolvedAt = new Date();
    request.asset.status = request.asset.currentHolder ? ASSET_STATUS.ALLOCATED : ASSET_STATUS.AVAILABLE;
    await request.asset.save();
  }
  await request.save();

  await logActivity({
    actor: req.user._id,
    action: 'maintenance.status_changed',
    message: `Maintenance moved to ${status} for ${request.asset.tag}`,
    entityType: 'Asset',
    entityId: request.asset._id,
  });

  res.json({ request });
});
