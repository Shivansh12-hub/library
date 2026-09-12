import mongoose from 'mongoose';

const SeatSchema = new mongoose.Schema(
  {
    library: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Library',
      required: true,
      index: true
    },
    seatNumber: {
      type: String,
      required: true,
      trim: true
    }, // e.g., "A-12"
    type: {
      type: String,
      enum: ['regular', 'corner', 'cabin', 'window'],
      default: 'regular'
    },
    hasSocket: { type: Boolean, default: true },
    hasLocker: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// Prevent duplicate seat numbers within the same library
SeatSchema.index({ library: 1, seatNumber: 1 }, { unique: true });

export default mongoose.model('Seat', SeatSchema);