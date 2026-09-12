import mongoose from 'mongoose';

const CheckInLogSchema = new mongoose.Schema(
  {
    timestamp: { type: Date, default: Date.now },
    type: { type: String, enum: ['in', 'out'], required: true },
    scannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { _id: false }
);

const BookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    library: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Library',
      required: true,
      index: true
    },
    seat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seat',
      required: true,
      index: true
    },
    shiftId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    bookingType: {
      type: String,
      enum: ['hourly', 'daily', 'monthly'],
      default: 'monthly'
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    amountPaid: {
      type: Number,
      required: true,
      min: 0
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
      index: true
    },
    paymentReferenceId: {
      type: String,
      trim: true
    },
    qrPassCode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['active', 'cancelled', 'expired'],
      default: 'active',
      index: true
    },
    checkInLogs: [CheckInLogSchema]
  },
  { timestamps: true }
);

// High-speed lookup for conflict checks during checkout
BookingSchema.index({ seat: 1, shiftId: 1, status: 1, startDate: 1, endDate: 1 });

// User active bookings query optimization
BookingSchema.index({ user: 1, status: 1, createdAt: -1 });

export default mongoose.model('Booking', BookingSchema);