import Asset from '../models/Asset.js';
import Booking, { BOOKING_STATUS } from '../models/Booking.js';
import { asyncHandler, ApiError, logActivity } from '../utils/helpers.js';

function overlaps(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

export const listBookings = asyncHandler(async (req, res) => {
  const { date, assetId } = req.query;
  const filter = { status: BOOKING_STATUS.CONFIRMED };
  if (assetId) filter.asset = assetId;

  if (date) {
    const day = new Date(date);
    if (!Number.isNaN(day.getTime())) {
      const start = new Date(day);
      start.setHours(0, 0, 0, 0);
      const end = new Date(day);
      end.setHours(23, 59, 59, 999);
      filter.startAt = { $lte: end };
      filter.endAt = { $gte: start };
    }
  }

  const bookings = await Booking.find(filter)
    .populate('asset', 'tag name location')
    .populate('requestedBy', 'name email')
    .sort({ startAt: 1 });

  res.json({ bookings });
});

// GET /api/bookings/availability?assetId=...&date=YYYY-MM-DD
export const getAvailability = asyncHandler(async (req, res) => {
  const { assetId, date } = req.query;
  if (!assetId || !date) throw new ApiError(400, 'assetId and date are required');

  const day = new Date(date);
  if (Number.isNaN(day.getTime())) throw new ApiError(400, 'Invalid date format');

  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(day);
  end.setHours(23, 59, 59, 999);

  const bookings = await Booking.find({
    asset: assetId,
    status: BOOKING_STATUS.CONFIRMED,
    startAt: { $lte: end },
    endAt: { $gte: start },
  })
    .populate('requestedBy', 'name email')
    .sort({ startAt: 1 });

  res.json({
    assetId,
    date: start.toISOString().slice(0, 10),
    bookings,
  });
});

export const createBooking = asyncHandler(async (req, res) => {
  const { assetId, startAt, endAt, purpose } = req.body;
  if (!assetId || !startAt || !endAt) {
    throw new ApiError(400, 'Asset, start time and end time are required');
  }

  const start = new Date(startAt);
  const end = new Date(endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    throw new ApiError(400, 'Invalid booking time range');
  }

  const asset = await Asset.findById(assetId);
  if (!asset) throw new ApiError(404, 'Asset not found');
  if (!asset.bookable) throw new ApiError(400, 'This asset is not configured as bookable');

  const conflicts = await Booking.find({
    asset: assetId,
    status: BOOKING_STATUS.CONFIRMED,
    startAt: { $lt: end },
    endAt: { $gt: start },
  }).limit(5);

  if (conflicts.some((b) => overlaps(start, end, b.startAt, b.endAt))) {
    return res.status(409).json({
      error: 'BOOKING_CONFLICT',
      message: 'Requested slot is unavailable',
      conflicts,
    });
  }

  const booking = await Booking.create({
    asset: assetId,
    requestedBy: req.user._id,
    startAt: start,
    endAt: end,
    purpose: purpose || '',
  });

  await logActivity({
    actor: req.user._id,
    action: 'booking.created',
    message: `Booked ${asset.tag} from ${start.toISOString()} to ${end.toISOString()}`,
    entityType: 'Asset',
    entityId: asset._id,
  });

  res.status(201).json({ booking });
});

export const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate('asset', 'tag');
  if (!booking) throw new ApiError(404, 'Booking not found');
  if (booking.status === BOOKING_STATUS.CANCELLED) return res.json({ booking });

  const isOwner = String(booking.requestedBy) === String(req.user._id);
  const canOverride = ['admin', 'asset_manager', 'department_head'].includes(req.user.role);
  if (!isOwner && !canOverride) throw new ApiError(403, 'You cannot cancel this booking');

  booking.status = BOOKING_STATUS.CANCELLED;
  booking.cancelledBy = req.user._id;
  booking.cancelledAt = new Date();
  await booking.save();

  await logActivity({
    actor: req.user._id,
    action: 'booking.cancelled',
    message: `Cancelled booking for ${booking.asset?.tag || 'asset'}`,
    entityType: 'Booking',
    entityId: booking._id,
  });

  res.json({ booking });
});
