import mongoose, { Schema, Document } from "mongoose";

export interface ITransferRequest extends Document {
  asset: mongoose.Types.ObjectId; // Ref Asset
  fromUser?: mongoose.Types.ObjectId; // Ref User (Current holder, optional for new allocations)
  toUser: mongoose.Types.ObjectId; // Ref User (New holder)
  reason?: string;
  status: "Requested" | "Approved" | "Rejected" | "Completed";
  approvedBy?: mongoose.Types.ObjectId; // Ref User (AssetManager or DeptHead)
  createdAt: Date;
  updatedAt: Date;
}

const TransferRequestSchema = new Schema<ITransferRequest>(
  {
    asset: { type: Schema.Types.ObjectId, ref: "Asset", required: true },
    fromUser: { type: Schema.Types.ObjectId, ref: "User" },
    toUser: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reason: { type: String },
    status: {
      type: String,
      enum: ["Requested", "Approved", "Rejected", "Completed"],
      default: "Requested",
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Clear cached model to ensure schema updates take effect during Next.js HMR
delete mongoose.models.TransferRequest;

export default mongoose.model<ITransferRequest>("TransferRequest", TransferRequestSchema);
