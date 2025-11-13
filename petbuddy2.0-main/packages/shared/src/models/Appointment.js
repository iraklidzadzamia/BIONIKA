import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    // Location scoping
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      required: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contact',
      required: true,
    },
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    petId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pet',
      required: true,
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceCategory',
      required: true,
    },
    serviceItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceItem',
    },
    start: {
      type: Date,
      required: true,
    },
    end: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['scheduled', 'checked_in', 'in_progress', 'completed', 'canceled', 'no_show'],
      default: 'scheduled',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    source: {
      type: String,
      enum: ['online', 'phone', 'walk_in', 'social'],
      default: 'online',
    },
    // Added for Google Calendar synchronization
    googleCalendarEventId: { type: String, trim: true },
    audit: {
      scheduledByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      canceledByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      cancelReason: {
        type: String,
        trim: true,
        maxlength: 300,
        enum: {
          values: [
            'customer_requested',
            'staff_unavailable',
            'resource_unavailable',
            'weather_conditions',
            'pet_health_issue',
            'business_closed',
            'double_booking_error',
            'system_error',
            'other',
          ],
          message:
            'Invalid cancel reason. Must be one of: customer_requested, staff_unavailable, resource_unavailable, weather_conditions, pet_health_issue, business_closed, double_booking_error, system_error, other',
        },
      },
      rescheduleReason: {
        type: String,
        trim: true,
        maxlength: 300,
        enum: {
          values: [
            'customer_requested',
            'staff_unavailable',
            'resource_unavailable',
            'weather_conditions',
            'pet_health_issue',
            'business_closed',
            'double_booking_error',
            'system_error',
            'other',
          ],
          message:
            'Invalid reschedule reason. Must be one of: customer_requested, staff_unavailable, resource_unavailable, weather_conditions, pet_health_issue, business_closed, double_booking_error, system_error, other',
        },
      },
      noShowReason: {
        type: String,
        trim: true,
        maxlength: 300,
        enum: {
          values: [
            'customer_forgot',
            'customer_emergency',
            'transportation_issue',
            'weather_conditions',
            'pet_health_issue',
            'customer_unreachable',
            'other',
          ],
          message:
            'Invalid no-show reason. Must be one of: customer_forgot, customer_emergency, transportation_issue, weather_conditions, pet_health_issue, customer_unreachable, other',
        },
      },
    },
    // Status change timestamps
    checkedInAt: Date,
    startedAt: Date,
    completedAt: Date,
    canceledAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries (location-aware)
appointmentSchema.index({ companyId: 1, locationId: 1, staffId: 1, start: 1, end: 1 });
appointmentSchema.index({ companyId: 1, locationId: 1, customerId: 1 });
appointmentSchema.index({ companyId: 1, locationId: 1, status: 1 });
appointmentSchema.index({ companyId: 1, locationId: 1, start: 1 });
appointmentSchema.index({ companyId: 1, updatedAt: -1 });
// Index to quickly look up by Google event id
appointmentSchema.index({ companyId: 1, googleCalendarEventId: 1 });

// Performance index for daily appointment queries
appointmentSchema.index({ companyId: 1, locationId: 1, start: 1, status: 1 });

// Ensure end is after start
appointmentSchema.pre('validate', function (next) {
  if (this.start >= this.end) {
    return next(new Error('End time must be after start time'));
  }
  return next();
});

// Ensure cancel/no-show reasons are provided when status changes
appointmentSchema.pre('validate', function (next) {
  if (this.isModified('status')) {
    if (this.status === 'canceled' && !this.audit?.cancelReason) {
      return next(new Error('Cancel reason is required when appointment is canceled'));
    }
    if (this.status === 'no_show' && !this.audit?.noShowReason) {
      return next(new Error('No-show reason is required when appointment is marked as no-show'));
    }
  }
  return next();
});

// Update status timestamps
appointmentSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    const now = new Date();

    switch (this.status) {
      case 'checked_in':
        this.checkedInAt = now;
        break;
      case 'in_progress':
        this.startedAt = now;
        break;
      case 'completed':
        this.completedAt = now;
        break;
      case 'canceled':
        this.canceledAt = now;
        break;
    }
  }
  next();
});

export default mongoose.model('Appointment', appointmentSchema);
