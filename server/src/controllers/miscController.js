import Notification from '../models/Notification.js';
import ActivityLog from '../models/ActivityLog.js';
import { asyncHandler } from '../utils/helpers.js';

// GET /api/notifications — current user's feed, optional category filter.
export const listNotifications = asyncHandler(async (req, res) => {
  const { category } = req.query;
  const filter = { user: req.user._id };
  if (category && category !== 'All') filter.category = category;
  const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(100);
  const unread = await Notification.countDocuments({ user: req.user._id, read: false });
  res.json({ notifications, unread });
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  await Notification.updateOne({ _id: req.params.id, user: req.user._id }, { read: true });
  res.json({ ok: true });
});

export const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  res.json({ ok: true });
});

// GET /api/activity — full audit log (managers/admin).
export const listActivity = asyncHandler(async (_req, res) => {
  const activity = await ActivityLog.find()
    .populate('actor', 'name role')
    .sort({ createdAt: -1 })
    .limit(200);
  res.json({ activity });
});