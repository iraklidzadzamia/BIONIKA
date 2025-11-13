import mongoose from 'mongoose';

const resourceReservationSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    // Location context for this reservation
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      required: true,
      index: true,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      index: true,
    },
    appointmentItemId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    resourceTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ResourceType',
      required: true,
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resource',
      required: false,
    },
    start: {
      type: Date,
      required: true,
    },
    end: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

resourceReservationSchema.index({ companyId: 1, locationId: 1, resourceTypeId: 1, start: 1 });
resourceReservationSchema.index({ companyId: 1, locationId: 1, resourceId: 1, start: 1 });
// Optimized compound index to speed up overlap queries by type across a day
resourceReservationSchema.index({
  companyId: 1,
  locationId: 1,
  resourceTypeId: 1,
  start: 1,
  end: 1,
});

export default mongoose.model('ResourceReservation', resourceReservationSchema);
