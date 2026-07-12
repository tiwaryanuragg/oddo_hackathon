import mongoose from 'mongoose';

// Full audit log of who did what, when (Screen 10).
const activityLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    action: { type: String, required: true }, // e.g. 'asset.allocated'
    message: { type: String, required: true }, // human-readable summary
    entityType: { type: String, default: '' },
    entityId: { type: mongoose.Schema.Types.ObjectId, default: null },
    meta: { type: Object, default: {} },
  },
  { timestamps: true }
);

export default mongoose.model('ActivityLog', activityLogSchema);