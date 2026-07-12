import mongoose, { Schema, Document } from "mongoose";

export interface IAssetCategory extends Document {
  name: string;
  description?: string;
  customFields?: Record<string, unknown>; // e.g., { warrantyPeriod: "12 months" }
  createdAt: Date;
  updatedAt: Date;
}

const AssetCategorySchema = new Schema<IAssetCategory>(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
    customFields: { type: Schema.Types.Mixed }, // Flexible key-value pairs
  },
  { timestamps: true }
);

export default mongoose.models.AssetCategory || mongoose.model<IAssetCategory>("AssetCategory", AssetCategorySchema);
