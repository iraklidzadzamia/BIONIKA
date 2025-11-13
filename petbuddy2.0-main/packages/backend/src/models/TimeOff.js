import mongoose from 'mongoose';

const timeOffSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    start: {
      type: Date,
      required: true,
    },
    end: {
      type: Date,
      required: true,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    color: {
      type: String,
      trim: true,
      maxlength: 7, // Hex color code
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
timeOffSchema.index({ companyId: 1, userId: 1 });
timeOffSchema.index({ companyId: 1, start: 1, end: 1 });

// Ensure end is after start
timeOffSchema.pre('validate', function (next) {
  if (this.start >= this.end) {
    next(new Error('End time must be after start time'));
  } else {
    next();
  }
});

export default mongoose.model('TimeOff', timeOffSchema);
