import mongoose from 'mongoose';

// Category-specific custom field definitions (e.g. warranty period for Electronics).
const customFieldSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    type: { type: String, enum: ['text', 'number', 'date'], default: 'text' },
  },
  { _id: false }
);

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    customFields: { type: [customFieldSchema], default: [] },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  },
  { timestamps: true }
);

export default mongoose.model('Category', categorySchema);