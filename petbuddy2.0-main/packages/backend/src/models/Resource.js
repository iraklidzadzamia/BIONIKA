import mongoose from 'mongoose';

const resourceSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    // Location where the resource resides
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      required: true,
      index: true,
    },
    resourceTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ResourceType',
      required: true,
      index: true,
    },
    species: {
      type: [String],
      enum: ['dog', 'cat', 'all', 'other'],
      required: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

resourceSchema.index({ companyId: 1, locationId: 1, resourceTypeId: 1, active: 1 });

// Virtual for resource type details
resourceSchema.virtual('resourceType', {
  ref: 'ResourceType',
  localField: 'resourceTypeId',
  foreignField: '_id',
  justOne: true,
});

// Ensure virtuals are included when converting to JSON
resourceSchema.set('toJSON', { virtuals: true });
resourceSchema.set('toObject', { virtuals: true });

export default mongoose.model('Resource', resourceSchema);
