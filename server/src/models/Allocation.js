import mongoose from 'mongoose';
import { ALLOCATION_STATUS } from '../constants.js';

// One row per allocation event; also serves as the per-asset allocation history.
const allocationSchema = new mongoose.Schema(
  {
    asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true, index: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    allocatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    allocatedAt: { type: Date, default: Date.now },
    expectedReturnDate: { type: Date, default: null },

    status: {
      type: String,
      enum: Object.values(ALLOCATION_STATUS),
      default: ALLOCATION_STATUS.ACTIVE,
      index: true,
    },

    returnedAt: { type: Date, default: null },
    returnedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    checkInCondition: { type: String, default: '' },
    checkInNotes: { type: String, default: '' },
  },
  { timestamps: true }
);

// Only one ACTIVE allocation may exist per asset — enforces the double-allocation block.
allocationSchema.index(
  { asset: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: ALLOCATION_STATUS.ACTIVE } }
);

export default mongoose.model('Allocation', allocationSchema);