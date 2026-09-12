import mongoose from 'mongoose';

const ShiftSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true }, // e.g., 'Morning Shift'
  startTime: { type: String, required: true },        // '07:00'
  endTime: { type: String, required: true },          // '14:00'
  price: { type: Number, required: true, min: 0 }     // In INR / base currency
});

const LibrarySchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    address: {
      street: { type: String, trim: true },
      locality: { type: String, trim: true },
      city: { type: String, trim: true, index: true },
      pincode: { type: String, trim: true },
      location: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point'
        },
        coordinates: {
          type: [Number], // [longitude, latitude]
          required: true
        }
      }
    },
    amenities: [
      {
        type: String,
        enum: ['wifi', 'ac', 'power_socket', 'locker', 'cafeteria', 'silent_zone', 'ro_water']
      }
    ],
    shifts: [ShiftSchema],
    photos: [{ type: String }],
    rules: [{ type: String }],
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// 2dsphere index for radius-based proximity searches
LibrarySchema.index({ 'address.location': '2dsphere' });

export default mongoose.model('Library', LibrarySchema);