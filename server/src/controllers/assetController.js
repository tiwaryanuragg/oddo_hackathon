import Asset from '../models/Asset.js';
import Allocation from '../models/Allocation.js';
import { ASSET_STATUS } from '../constants.js';
import { asyncHandler, ApiError, logActivity, nextAssetTag } from '../utils/helpers.js';

// GET /api/assets — search & filter by tag/serial/QR, category, status, department, location.
export const listAssets = asyncHandler(async (req, res) => {
  const { q, category, status, department, location, bookable } = req.query;
  const filter = {};
  if (category) filter.category = category;
  if (status) filter.status = status;
  if (department) filter.currentDepartment = department;
  if (location) filter.location = { $regex: location, $options: 'i' };
  if (bookable !== undefined) filter.bookable = bookable === 'true';
  if (q) {
    filter.$or = [
      { tag: { $regex: q, $options: 'i' } },
      { serialNumber: { $regex: q, $options: 'i' } },
      { name: { $regex: q, $options: 'i' } },
    ];
  }

  const assets = await Asset.find(filter)
    .populate('category', 'name')
    .populate('currentHolder', 'name email')
    .populate('currentDepartment', 'name')
    .sort({ createdAt: -1 });
  res.json({ assets });
});

export const getAsset = asyncHandler(async (req, res) => {
  const asset = await Asset.findById(req.params.id)
    .populate('category', 'name customFields')
    .populate('currentHolder', 'name email')
    .populate('currentDepartment', 'name');
  if (!asset) throw new ApiError(404, 'Asset not found');

  const allocationHistory = await Allocation.find({ asset: asset._id })
    .populate('employee', 'name')
    .populate('department', 'name')
    .populate('allocatedBy', 'name')
    .sort({ createdAt: -1 });

  res.json({ asset, allocationHistory });
});

// POST /api/assets — register a new asset (Asset Manager / Admin). Enters as Available.
export const createAsset = asyncHandler(async (req, res) => {
  const {
    name, category, serialNumber, acquisitionDate, acquisitionCost,
    condition, location, photoUrl, bookable, customValues,
  } = req.body;

  if (!name || !category) throw new ApiError(400, 'Name and category are required');

  const tag = await nextAssetTag();
  const asset = await Asset.create({
    tag,
    name,
    category,
    serialNumber: serialNumber || '',
    acquisitionDate: acquisitionDate || null,
    acquisitionCost: acquisitionCost || 0,
    condition: condition || 'Good',
    location: location || '',
    photoUrl: photoUrl || '',
    bookable: !!bookable,
    customValues: customValues || {},
    status: ASSET_STATUS.AVAILABLE,
  });

  await logActivity({
    actor: req.user._id,
    action: 'asset.register',
    message: `Registered asset ${tag} — ${name}`,
    entityType: 'Asset',
    entityId: asset._id,
  });

  res.status(201).json({ asset });
});

export const updateAsset = asyncHandler(async (req, res) => {
  const asset = await Asset.findById(req.params.id);
  if (!asset) throw new ApiError(404, 'Asset not found');

  const editable = [
    'name', 'serialNumber', 'acquisitionDate', 'acquisitionCost',
    'condition', 'location', 'photoUrl', 'bookable', 'customValues',
  ];
  for (const key of editable) {
    if (req.body[key] !== undefined) asset[key] = req.body[key];
  }
  // Allow explicit lifecycle transitions (e.g. Retired, Disposed) for managers.
  if (req.body.status && Object.values(ASSET_STATUS).includes(req.body.status)) {
    asset.status = req.body.status;
  }
  await asset.save();
  res.json({ asset });
});