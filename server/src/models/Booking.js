import mongoose from 'mongoose';

const BOOKING_STATUS = {
  CONFIRMED: 'Confirmed',
  CANCELLED: 'Cancelled',
};

const bookingSchema = new mongoose.Schema(
  {
    asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true, index: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    startAt: { type: Date, required: true, index: true },
    endAt: { type: Date, required: true, index: true },
    purpose: { type: String, default: '' },
    status: {
      type: String,
      enum: Object.values(BOOKING_STATUS),
      default: BOOKING_STATUS.CONFIRMED,
      index: true,
    },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: true }
);

bookingSchema.index({ asset: 1, status: 1, startAt: 1, endAt: 1 });

export { BOOKING_STATUS };
export default mongoose.model('Booking', bookingSchema);
