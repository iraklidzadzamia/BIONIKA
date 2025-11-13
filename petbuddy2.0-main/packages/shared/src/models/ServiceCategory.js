import mongoose from 'mongoose';
import { STAFF_ROLE_VALUES } from '../constants/index.js';

const serviceCategorySchema = new mongoose.Schema(
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
    species: {
      type: String,
      enum: ['dog', 'cat', 'dog&cat', 'other'],
      required: true,
    },
    requiresBath: {
      type: Boolean,
      default: false,
    },
    color: {
      type: String,
      trim: true,
      maxlength: 7, // Hex color code
    },
    allowedRoles: {
      type: [String],
      default: ['groomer'],
      enum: STAFF_ROLE_VALUES,
      validate: {
        validator: function(roles) {
          return Array.isArray(roles) && roles.length > 0;
        },
        message: 'At least one role must be allowed',
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
serviceCategorySchema.index({ companyId: 1, name: 1 });
serviceCategorySchema.index({ companyId: 1, species: 1 });
serviceCategorySchema.index({ companyId: 1, active: 1 });

// Virtual for service items
serviceCategorySchema.virtual('serviceItems', {
  ref: 'ServiceItem',
  localField: '_id',
  foreignField: 'serviceCategoryId',
  justOne: false,
});

// Ensure virtuals are included when converting to JSON
serviceCategorySchema.set('toJSON', { virtuals: true });
serviceCategorySchema.set('toObject', { virtuals: true });

export default mongoose.model('ServiceCategory', serviceCategorySchema);
