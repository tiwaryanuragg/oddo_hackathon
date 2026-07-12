import mongoose, { Schema, Document } from "mongoose";

export interface IMaintenanceRequest extends Document {
  asset: mongoose.Types.ObjectId; // Ref Asset
  raisedBy: mongoose.Types.ObjectId; // Ref User
  description: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  photoUrl?: string;
  status: "Pending" | "Approved" | "Rejected" | "TechnicianAssigned" | "InProgress" | "Resolved";
  approvedBy?: mongoose.Types.ObjectId; // Ref User
  technicianName?: string;
  resolutionNotes?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MaintenanceRequestSchema = new Schema<IMaintenanceRequest>(
  {
    asset: { type: Schema.Types.ObjectId, ref: "Asset", required: true },
    raisedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    description: { type: String, required: true },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
    },
    photoUrl: { type: String },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "TechnicianAssigned", "InProgress", "Resolved"],
      default: "Pending",
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    technicianName: { type: String },
    resolutionNotes: { type: String },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.MaintenanceRequest || mongoose.model<IMaintenanceRequest>("MaintenanceRequest", MaintenanceRequestSchema);
