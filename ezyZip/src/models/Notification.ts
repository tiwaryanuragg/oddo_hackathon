import mongoose, { Schema, Document } from "mongoose";

export interface INotification extends Document {
  user: mongoose.Types.ObjectId; // Ref User (Recipient)
  type: string; // e.g. "Booking Reminder", "Overdue Return"
  message: string;
  relatedEntity?: mongoose.Types.ObjectId;
  relatedEntityType?: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, required: true },
    message: { type: String, required: true },
    relatedEntity: { type: Schema.Types.ObjectId },
    relatedEntityType: { type: String },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.Notification || mongoose.model<INotification>("Notification", NotificationSchema);
