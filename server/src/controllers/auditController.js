import Asset from '../models/Asset.js';
import AuditCycle, { AUDIT_STATUS, AUDIT_ENTRY_STATUS } from '../models/AuditCycle.js';
import { asyncHandler, ApiError, logActivity } from '../utils/helpers.js';

export const listAudits = asyncHandler(async (_req, res) => {
  const audits = await AuditCycle.find()
    .populate('department', 'name')
    .populate('startedBy', 'name')
    .sort({ createdAt: -1 });
  res.json({ audits });
});

export const startAudit = asyncHandler(async (req, res) => {
  const { title, departmentId, assetIds } = req.body;
  if (!title) throw new ApiError(400, 'Audit title is required');

  let assets;
  if (Array.isArray(assetIds) && assetIds.length) {
    assets = await Asset.find({ _id: { $in: assetIds } });
  } else if (departmentId) {
    assets = await Asset.find({ currentDepartment: departmentId });
  } else {
    assets = await Asset.find();
  }

  const entries = assets.map((asset) => ({
    asset: asset._id,
    expectedLocation: asset.location || '',
    verificationStatus: AUDIT_ENTRY_STATUS.PENDING,
  }));

  const audit = await AuditCycle.create({
    title,
    department: departmentId || null,
    startedBy: req.user._id,
    entries,
  });

  await logActivity({
    actor: req.user._id,
    action: 'audit.started',
    message: `Started audit \"${title}\" with ${entries.length} assets`,
    entityType: 'AuditCycle',
    entityId: audit._id,
  });

  res.status(201).json({ audit });
});

export const getAudit = asyncHandler(async (req, res) => {
  const audit = await AuditCycle.findById(req.params.id)
    .populate('department', 'name')
    .populate('startedBy', 'name')
    .populate('entries.asset', 'tag name location status')
    .populate('entries.verifiedBy', 'name');

  if (!audit) throw new ApiError(404, 'Audit not found');
  res.json({ audit });
});

export const verifyAuditEntry = asyncHandler(async (req, res) => {
  const { status, notes } = req.body;
  if (!Object.values(AUDIT_ENTRY_STATUS).includes(status)) {
    throw new ApiError(400, 'Invalid verification status');
  }

  const audit = await AuditCycle.findById(req.params.id);
  if (!audit) throw new ApiError(404, 'Audit not found');
  if (audit.status === AUDIT_STATUS.CLOSED) throw new ApiError(400, 'Audit is already closed');

  const entry = audit.entries.find((e) => String(e.asset) === String(req.params.assetId));
  if (!entry) throw new ApiError(404, 'Asset entry not found in this audit');

  entry.verificationStatus = status;
  entry.notes = notes || '';
  entry.verifiedBy = req.user._id;
  entry.verifiedAt = new Date();
  await audit.save();

  res.json({ audit });
});

export const closeAudit = asyncHandler(async (req, res) => {
  const audit = await AuditCycle.findById(req.params.id);
  if (!audit) throw new ApiError(404, 'Audit not found');
  if (audit.status === AUDIT_STATUS.CLOSED) return res.json({ audit });

  const discrepancyCount = audit.entries.filter((entry) =>
    [AUDIT_ENTRY_STATUS.MISSING, AUDIT_ENTRY_STATUS.DAMAGED].includes(entry.verificationStatus)
  ).length;

  audit.status = AUDIT_STATUS.CLOSED;
  audit.closedAt = new Date();
  audit.discrepancyCount = discrepancyCount;
  await audit.save();

  await logActivity({
    actor: req.user._id,
    action: 'audit.closed',
    message: `Closed audit \"${audit.title}\" with ${discrepancyCount} discrepancies`,
    entityType: 'AuditCycle',
    entityId: audit._id,
  });

  res.json({ audit });
});
