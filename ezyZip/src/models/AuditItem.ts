import mongoose, { Schema, Document } from "mongoose";

export interface IAuditItem extends Document {
  auditCycle: mongoose.Types.ObjectId; // Ref AuditCycle
  asset: mongoose.Types.ObjectId; // Ref Asset
  expectedLocation?: string;
  verification: "Pending" | "Verified" | "Missing" | "Damaged";
  verifiedBy?: mongoose.Types.ObjectId; // Ref User
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AuditItemSchema = new Schema<IAuditItem>(
  {
    auditCycle: { type: Schema.Types.ObjectId, ref: "AuditCycle", required: true },
    asset: { type: Schema.Types.ObjectId, ref: "Asset", required: true },
    expectedLocation: { type: String },
    verification: {
      type: String,
      enum: ["Pending", "Verified", "Missing", "Damaged"],
      default: "Pending",
    },
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
    verifiedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.AuditItem || mongoose.model<IAuditItem>("AuditItem", AuditItemSchema);
