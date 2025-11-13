import mongoose from 'mongoose';

const tentativeSchema = new mongoose.Schema(
  {
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resourceTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ResourceType',
      required: true,
    },
    start: { type: Date, required: true },
    end: { type: Date, required: true },
  },
  { _id: false }
);

const bookingHoldSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
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
    tentative: [tentativeSchema],
    createdBy: { type: String, enum: ['web', 'operator', 'assistant'], default: 'web' },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

bookingHoldSchema.index({ companyId: 1, expiresAt: 1 }, { expireAfterSeconds: 0 });
// Support querying tentative by resourceTypeId and overlap
bookingHoldSchema.index({
  companyId: 1,
  locationId: 1,
  'tentative.resourceTypeId': 1,
  'tentative.start': 1,
  'tentative.end': 1,
});

export default mongoose.model('BookingHold', bookingHoldSchema);
