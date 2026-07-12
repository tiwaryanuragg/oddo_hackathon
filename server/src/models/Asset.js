import mongoose from 'mongoose';
import { ASSET_STATUS, ASSET_CONDITION } from '../constants.js';

const assetSchema = new mongoose.Schema(
  {
    tag: { type: String, required: true, unique: true, index: true }, // AF-0001
    name: { type: String, required: true, trim: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    serialNumber: { type: String, default: '', trim: true },
    acquisitionDate: { type: Date, default: null },
    acquisitionCost: { type: Number, default: 0 }, // ranking/reports only, not accounting
    condition: { type: String, enum: ASSET_CONDITION, default: 'Good' },
    location: { type: String, default: '', trim: true },
    photoUrl: { type: String, default: '' },
    bookable: { type: Boolean, default: false }, // shared/bookable resource flag

    status: {
      type: String,
      enum: Object.values(ASSET_STATUS),
      default: ASSET_STATUS.AVAILABLE,
      index: true,
    },

    // Denormalised holder for quick reads; source of truth is the active Allocation.
    currentHolder: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    currentDepartment: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },

    // Free-form values for the category's custom fields.
    customValues: { type: Map, of: String, default: {} },
  },
  { timestamps: true }
);

export default mongoose.model('Asset', assetSchema);