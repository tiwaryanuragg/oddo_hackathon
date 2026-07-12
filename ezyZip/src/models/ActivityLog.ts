import mongoose, { Schema, Document } from "mongoose";

export interface IActivityLog extends Document {
  user?: mongoose.Types.ObjectId; // Ref User
  action: string;
  description: string;
  entityType?: string; // e.g., "Asset", "MaintenanceRequest"
  entityId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User" },
    action: { type: String, required: true },
    description: { type: String, required: true },
    entityType: { type: String },
    entityId: { type: Schema.Types.ObjectId },
  },
  { timestamps: true }
);

export default mongoose.models.ActivityLog || mongoose.model<IActivityLog>("ActivityLog", ActivityLogSchema);
