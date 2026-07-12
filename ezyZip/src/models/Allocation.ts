import mongoose, { Schema, Document } from "mongoose";

export interface IAllocation extends Document {
  asset: mongoose.Types.ObjectId; // Ref Asset
  allocatedTo?: mongoose.Types.ObjectId; // Ref User
  allocatedToDepartment?: mongoose.Types.ObjectId; // Ref Department
  allocatedBy: mongoose.Types.ObjectId; // Ref User
  allocatedDate: Date;
  expectedReturnDate?: Date;
  actualReturnDate?: Date;
  returnConditionNotes?: string;
  status: "Active" | "Returned" | "Overdue" | "TransferPending";
  createdAt: Date;
  updatedAt: Date;
}

const AllocationSchema = new Schema<IAllocation>(
  {
    asset: { type: Schema.Types.ObjectId, ref: "Asset", required: true },
    allocatedTo: { type: Schema.Types.ObjectId, ref: "User" },
    allocatedToDepartment: { type: Schema.Types.ObjectId, ref: "Department" },
    allocatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    allocatedDate: { type: Date, default: Date.now },
    expectedReturnDate: { type: Date },
    actualReturnDate: { type: Date },
    returnConditionNotes: { type: String },
    status: {
      type: String,
      enum: ["Active", "Returned", "Overdue", "TransferPending"],
      default: "Active",
    },
  },
  { timestamps: true }
);

export default mongoose.models.Allocation || mongoose.model<IAllocation>("Allocation", AllocationSchema);
