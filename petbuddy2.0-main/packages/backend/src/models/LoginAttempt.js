import mongoose from 'mongoose';

const loginAttemptSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    ip: {
      type: String,
      required: true,
      index: true,
    },
    successful: {
      type: Boolean,
      default: false,
    },
    lockedUntil: {
      type: Date,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient lookups
loginAttemptSchema.index({ email: 1, createdAt: -1 });
loginAttemptSchema.index({ ip: 1, createdAt: -1 });

// TTL index to auto-delete old attempts after 30 minutes
loginAttemptSchema.index({ createdAt: 1 }, { expireAfterSeconds: 1800 });

export default mongoose.model('LoginAttempt', loginAttemptSchema);
