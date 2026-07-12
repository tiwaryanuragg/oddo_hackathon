import mongoose, { Schema, Document } from "mongoose";

export interface IBooking extends Document {
  asset: mongoose.Types.ObjectId; // Ref Asset (must be isBookable = true)
  bookedBy: mongoose.Types.ObjectId; // Ref User
  date: Date;
  startTime: string; // e.g., "09:00"
  endTime: string;   // e.g., "10:00"
  purpose?: string;
  status: "Upcoming" | "Ongoing" | "Completed" | "Cancelled";
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    asset: { type: Schema.Types.ObjectId, ref: "Asset", required: true },
    bookedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    purpose: { type: String },
    status: {
      type: String,
      enum: ["Upcoming", "Ongoing", "Completed", "Cancelled"],
      default: "Upcoming",
    },
  },
  { timestamps: true }
);

export default mongoose.models.Booking || mongoose.model<IBooking>("Booking", BookingSchema);
