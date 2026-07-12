import Counter from '../models/Counter.js';
import ActivityLog from '../models/ActivityLog.js';
import Notification from '../models/Notification.js';

// Wrap async route handlers so thrown errors reach the error middleware.
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Throwable API error carrying an HTTP status.
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// AF-0001, AF-0002, ... (zero-padded to 4).
export async function nextAssetTag() {
  const seq = await Counter.next('assetTag');
  return `AF-${String(seq).padStart(4, '0')}`;
}

export async function logActivity({ actor, action, message, entityType, entityId, meta }) {
  try {
    await ActivityLog.create({ actor, action, message, entityType, entityId, meta });
  } catch (err) {
    console.error('[activity] failed to log:', err.message);
  }
}

export async function notify({ user, type, category = 'Info', message, link = '' }) {
  if (!user) return;
  try {
    await Notification.create({ user, type, category, message, link });
  } catch (err) {
    console.error('[notify] failed:', err.message);
  }
}