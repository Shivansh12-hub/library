import mongoose from 'mongoose';

const ReviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    library: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Library',
      required: true,
      index: true
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      unique: true // One review per booking
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    noiseLevel: {
      type: String,
      enum: ['pin_drop_silent', 'moderate', 'noisy'],
      default: 'pin_drop_silent'
    },
    wifiQuality: {
      type: String,
      enum: ['excellent', 'good', 'poor'],
      default: 'good'
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 500
    }
  },
  { timestamps: true }
);

export default mongoose.model('Review', ReviewSchema);