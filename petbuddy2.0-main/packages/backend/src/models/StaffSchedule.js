import mongoose from 'mongoose';

const breakWindowSchema = new mongoose.Schema({
  start: {
    type: String,
    required: true,
    match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, // HH:mm format
  },
  end: {
    type: String,
    required: true,
    match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, // HH:mm format
  },
});

const staffScheduleSchema = new mongoose.Schema(
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
    // Location this schedule applies to
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      required: true,
    },
    weekday: {
      type: Number,
      required: true,
      min: 0,
      max: 6, // 0 = Sunday, 6 = Saturday
    },
    startTime: {
      type: String,
      required: true,
      match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, // HH:mm format
    },
    endTime: {
      type: String,
      required: true,
      match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, // HH:mm format
    },
    breakWindows: [breakWindowSchema],
  },
  {
    timestamps: true,
  }
);

// Compound index for unique schedule per user per weekday per location
staffScheduleSchema.index({ companyId: 1, userId: 1, locationId: 1, weekday: 1 }, { unique: true });

export default mongoose.model('StaffSchedule', staffScheduleSchema);
