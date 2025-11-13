import mongoose from 'mongoose';

const resourceTypeSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    active: {
      type: Boolean,
      default: true,
    },
    color: {
      type: String,
      trim: true,
      maxlength: 7, // Hex color code
      default: '#6B7280',
    },
    icon: {
      type: String,
      trim: true,
      maxlength: 50,
      default: 'cube',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
resourceTypeSchema.index({ companyId: 1, name: 1 });
resourceTypeSchema.index({ companyId: 1, category: 1 });
resourceTypeSchema.index({ companyId: 1, active: 1 });

// Virtual for resources of this type
resourceTypeSchema.virtual('resources', {
  ref: 'Resource',
  localField: '_id',
  foreignField: 'resourceTypeId',
  justOne: false,
});

// Ensure virtuals are included when converting to JSON
resourceTypeSchema.set('toJSON', { virtuals: true });
resourceTypeSchema.set('toObject', { virtuals: true });

export default mongoose.model('ResourceType', resourceTypeSchema);
