import mongoose, { Schema, Document } from "mongoose";

export interface IDepartment extends Document {
  name: string;
  head?: mongoose.Types.ObjectId; // Reference to User
  parentDepartment?: mongoose.Types.ObjectId; // Reference to another Department
  status: "Active" | "Inactive";
  createdAt: Date;
  updatedAt: Date;
}

const DepartmentSchema = new Schema<IDepartment>(
  {
    name: { type: String, required: true, unique: true },
    head: { type: Schema.Types.ObjectId, ref: "User" },
    parentDepartment: { type: Schema.Types.ObjectId, ref: "Department" },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  },
  { timestamps: true }
);

export default mongoose.models.Department || mongoose.model<IDepartment>("Department", DepartmentSchema);
