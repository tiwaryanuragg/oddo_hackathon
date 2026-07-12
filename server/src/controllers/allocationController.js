import Asset from '../models/Asset.js';
import Allocation from '../models/Allocation.js';
import TransferRequest from '../models/TransferRequest.js';
import User from '../models/User.js';
import {
  ASSET_STATUS, ALLOCATION_STATUS, TRANSFER_STATUS, NOTIF_TYPES,
} from '../constants.js';
import { asyncHandler, ApiError, logActivity, notify } from '../utils/helpers.js';

// Statuses that block a fresh allocation.
const NON_ALLOCATABLE = [
  ASSET_STATUS.UNDER_MAINTENANCE, ASSET_STATUS.LOST,
  ASSET_STATUS.RETIRED, ASSET_STATUS.DISPOSED,
];

async function activeAllocation(assetId) {
  return Allocation.findOne({ asset: assetId, status: ALLOCATION_STATUS.ACTIVE })
    .populate('employee', 'name email')
    .populate('department', 'name');
}

// POST /api/allocations — allocate an asset. Blocks if already held (spec conflict rule).
export const allocate = asyncHandler(async (req, res) => {
  const { assetId, employeeId, departmentId, expectedReturnDate } = req.body;
  if (!assetId || (!employeeId && !departmentId)) {
    throw new ApiError(400, 'Asset and an employee or department are required');
  }

  const asset = await Asset.findById(assetId);
  if (!asset) throw new ApiError(404, 'Asset not found');
  if (NON_ALLOCATABLE.includes(asset.status)) {
    throw new ApiError(409, `Asset is ${asset.status} and cannot be allocated`);
  }

  // Conflict rule: an asset already held can't be re-allocated directly.
  const existing = await activeAllocation(assetId);
  if (existing) {
    const holder = existing.employee?.name || existing.department?.name || 'someone';
    return res.status(409).json({
      error: 'ASSET_ALREADY_ALLOCATED',
      message: `Currently held by ${holder}`,
      currentHolder: existing.employee || null,
      currentDepartment: existing.department || null,
      hint: 'Submit a transfer request instead.',
    });
  }

  const allocation = await Allocation.create({
    asset: assetId,
    employee: employeeId || null,
    department: departmentId || null,
    allocatedBy: req.user._id,
    expectedReturnDate: expectedReturnDate || null,
  });

  asset.status = ASSET_STATUS.ALLOCATED;
  asset.currentHolder = employeeId || null;
  asset.currentDepartment = departmentId || null;
  await asset.save();

  const holderUser = employeeId ? await User.findById(employeeId) : null;
  await logActivity({
    actor: req.user._id,
    action: 'asset.allocated',
    message: `${asset.tag} allocated to ${holderUser?.name || 'a department'}`,
    entityType: 'Asset',
    entityId: asset._id,
  });
  if (holderUser) {
    await notify({
      user: holderUser._id,
      type: NOTIF_TYPES.ASSET_ASSIGNED,
      category: 'Info',
      message: `${asset.tag} — ${asset.name} was assigned to you`,
    });
  }

  res.status(201).json({ allocation, asset });
});

// POST /api/allocations/:assetId/return — return flow with condition check-in.
export const returnAsset = asyncHandler(async (req, res) => {
  const { condition, notes } = req.body;
  const asset = await Asset.findById(req.params.assetId);
  if (!asset) throw new ApiError(404, 'Asset not found');

  const allocation = await Allocation.findOne({
    asset: asset._id,
    status: ALLOCATION_STATUS.ACTIVE,
  });
  if (!allocation) throw new ApiError(400, 'Asset is not currently allocated');

  allocation.status = ALLOCATION_STATUS.RETURNED;
  allocation.returnedAt = new Date();
  allocation.returnedBy = req.user._id;
  allocation.checkInCondition = condition || '';
  allocation.checkInNotes = notes || '';
  await allocation.save();

  asset.status = ASSET_STATUS.AVAILABLE;
  asset.currentHolder = null;
  asset.currentDepartment = null;
  if (condition) asset.condition = condition;
  await asset.save();

  await logActivity({
    actor: req.user._id,
    action: 'asset.returned',
    message: `${asset.tag} returned and set Available`,
    entityType: 'Asset',
    entityId: asset._id,
  });

  res.json({ allocation, asset });
});

/* --------------------------- Transfer workflow ---------------------------- */

// POST /api/transfers — request a transfer for an already-held asset.
export const requestTransfer = asyncHandler(async (req, res) => {
  const { assetId, toUserId, toDepartmentId, reason } = req.body;
  if (!assetId || (!toUserId && !toDepartmentId)) {
    throw new ApiError(400, 'Asset and a target employee or department are required');
  }
  const asset = await Asset.findById(assetId);
  if (!asset) throw new ApiError(404, 'Asset not found');

  const existing = await activeAllocation(assetId);
  const transfer = await TransferRequest.create({
    asset: assetId,
    fromUser: existing?.employee?._id || null,
    toUser: toUserId || null,
    toDepartment: toDepartmentId || null,
    requestedBy: req.user._id,
    reason: reason || '',
  });

  await logActivity({
    actor: req.user._id,
    action: 'transfer.requested',
    message: `Transfer requested for ${asset.tag}`,
    entityType: 'Asset',
    entityId: asset._id,
  });

  res.status(201).json({ transfer });
});

export const listTransfers = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = {};
  if (status) filter.status = status;
  const transfers = await TransferRequest.find(filter)
    .populate('asset', 'tag name')
    .populate('fromUser', 'name department')
    .populate('toUser', 'name department')
    .populate('toDepartment', 'name')
    .populate('requestedBy', 'name')
    .sort({ createdAt: -1 });
  res.json({ transfers });
});

// PATCH /api/transfers/:id — approve/reject. Approval re-allocates automatically.
export const decideTransfer = asyncHandler(async (req, res) => {
  const { decision, note } = req.body; // 'approve' | 'reject'
  const transfer = await TransferRequest.findById(req.params.id).populate('asset');
  if (!transfer) throw new ApiError(404, 'Transfer request not found');
  if (transfer.status !== TRANSFER_STATUS.REQUESTED) {
    throw new ApiError(400, 'This request has already been decided');
  }

  transfer.decidedBy = req.user._id;
  transfer.decidedAt = new Date();
  transfer.decisionNote = note || '';

  if (decision === 'approve') {
    const asset = transfer.asset;
    // Close any existing active allocation, then create the new one.
    await Allocation.updateMany(
      { asset: asset._id, status: ALLOCATION_STATUS.ACTIVE },
      { $set: { status: ALLOCATION_STATUS.RETURNED, returnedAt: new Date(), returnedBy: req.user._id } }
    );
    await Allocation.create({
      asset: asset._id,
      employee: transfer.toUser || null,
      department: transfer.toDepartment || null,
      allocatedBy: req.user._id,
    });
    asset.status = ASSET_STATUS.ALLOCATED;
    asset.currentHolder = transfer.toUser || null;
    asset.currentDepartment = transfer.toDepartment || null;
    await asset.save();

    transfer.status = TRANSFER_STATUS.COMPLETED;
    await transfer.save();

    await logActivity({
      actor: req.user._id,
      action: 'transfer.approved',
      message: `Transfer approved for ${asset.tag}`,
      entityType: 'Asset',
      entityId: asset._id,
    });
    if (transfer.toUser) {
      await notify({
        user: transfer.toUser,
        type: NOTIF_TYPES.TRANSFER_APPROVED,
        category: 'Approval',
        message: `Transfer approved: ${asset.tag} is now allocated to you`,
      });
    }
  } else {
    transfer.status = TRANSFER_STATUS.REJECTED;
    await transfer.save();
    await logActivity({
      actor: req.user._id,
      action: 'transfer.rejected',
      message: `Transfer rejected for ${transfer.asset.tag}`,
      entityType: 'Asset',
      entityId: transfer.asset._id,
    });
  }

  res.json({ transfer });
});