import mongoose, { Schema, Document } from "mongoose";

export type AssetStatus = 
  | "Available" 
  | "Allocated" 
  | "Reserved" 
  | "Under Maintenance" 
  | "Lost" 
  | "Retired" 
  | "Disposed";

export interface IAsset extends Document {
  name: string;
  assetTag: string; // e.g. AF-0001
  serialNumber?: string;
  category: mongoose.Types.ObjectId; // Ref AssetCategory
  acquisitionDate?: Date;
  acquisitionCost?: number;
  condition: "New" | "Good" | "Fair" | "Poor";
  location?: string;
  status: AssetStatus;
  isBookable: boolean; // Flag for shared resources
  photoUrl?: string;
  department?: mongoose.Types.ObjectId; // Ref Department (if assigned to dept instead of individual)
  createdAt: Date;
  updatedAt: Date;
}

const AssetSchema = new Schema<IAsset>(
  {
    name: { type: String, required: true },
    assetTag: { type: String, required: true, unique: true },
    serialNumber: { type: String },
    category: { type: Schema.Types.ObjectId, ref: "AssetCategory", required: true },
    acquisitionDate: { type: Date },
    acquisitionCost: { type: Number },
    condition: { 
      type: String, 
      enum: ["New", "Good", "Fair", "Poor"], 
      default: "Good" 
    },
    location: { type: String },
    status: { 
      type: String, 
      enum: ["Available", "Allocated", "Reserved", "Under Maintenance", "Lost", "Retired", "Disposed"],
      default: "Available"
    },
    isBookable: { type: Boolean, default: false },
    photoUrl: { type: String },
    department: { type: Schema.Types.ObjectId, ref: "Department" },
  },
  { timestamps: true }
);

export default mongoose.models.Asset || mongoose.model<IAsset>("Asset", AssetSchema);
