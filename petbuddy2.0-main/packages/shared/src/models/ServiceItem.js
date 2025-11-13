import mongoose from 'mongoose';

const serviceItemSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    serviceCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceCategory',
      required: true,
      index: true,
    },
    size: {
      type: String,
      enum: ['S', 'M', 'L', 'XL', 'all'],
      required: true,
    },
    label: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    coatType: {
      type: String,
      enum: ['short', 'medium', 'long', 'curly', 'double', 'wire', 'hairless', 'unknown', 'all'],
      default: 'all',
    },
    durationMinutes: {
      type: Number,
      min: 10,
      max: 480,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    active: {
      type: Boolean,
      default: true,
    },
    requiredResources: {
      type: [
        {
          resourceTypeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ResourceType',
            required: true,
          },
          quantity: { type: Number, min: 1, default: 1 },
          durationMinutes: {
            type: Number,
            required: true,
            min: 10,
            max: 480,
          },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

serviceItemSchema.index({ companyId: 1, serviceCategoryId: 1, size: 1, coatType: 1 });
serviceItemSchema.index({ companyId: 1, serviceCategoryId: 1, active: 1 });

export default mongoose.model('ServiceItem', serviceItemSchema);
