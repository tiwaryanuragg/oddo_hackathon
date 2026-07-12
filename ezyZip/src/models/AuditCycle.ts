import mongoose, { Schema, Document } from "mongoose";

export interface IAuditCycle extends Document {
  name: string;
  scope: "Department" | "Location";
  scopeDepartment?: mongoose.Types.ObjectId; // Ref Department
  scopeLocation?: string;
  startDate: Date;
  endDate: Date;
  auditors: mongoose.Types.ObjectId[]; // Ref User
  status: "Open" | "Closed";
  createdAt: Date;
  updatedAt: Date;
}

const AuditCycleSchema = new Schema<IAuditCycle>(
  {
    name: { type: String, required: true },
    scope: { type: String, enum: ["Department", "Location"], required: true },
    scopeDepartment: { type: Schema.Types.ObjectId, ref: "Department" },
    scopeLocation: { type: String },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    auditors: [{ type: Schema.Types.ObjectId, ref: "User" }],
    status: { type: String, enum: ["Open", "Closed"], default: "Open" },
  },
  { timestamps: true }
);

export default mongoose.models.AuditCycle || mongoose.model<IAuditCycle>("AuditCycle", AuditCycleSchema);
