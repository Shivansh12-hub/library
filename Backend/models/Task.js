import mongoose from 'mongoose';

const TaskSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    timeBlock: {
      type: String, // e.g., "09:00 - 11:00"
      default: '',
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
  },
  { timestamps: true }
);

export default mongoose.model('Task', TaskSchema);