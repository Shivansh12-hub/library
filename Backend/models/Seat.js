import mongoose from "mongoose";

const seatSchema = new mongoose.Schema(
  {
    library: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Library",
      required: true,
      index: true,
    },
    seatNumber: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["regular", "cabin", "corner"],
      default: "regular",
    },
    hasSocket: {
      type: Boolean,
      default: true,
    },
    hasLocker: {
      type: Boolean,
      default: false,
    },
    isMaintenance: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Seat", seatSchema);