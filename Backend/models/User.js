import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    password: { type: String, select: false }, // Hidden by default from queries
    role: {
      type: String,
      enum: ['user', 'owner', 'admin'],
      default: 'user'
    },
    savedLibraries: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Library' }],
    isVerified: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Hash password automatically before saving if modified
UserSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// Compare password helper for login
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('User', UserSchema);