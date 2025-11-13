import mongoose from 'mongoose';

const mediaSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      enum: ['pet', 'appointment', 'customer'],
      required: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    kind: {
      type: String,
      enum: ['image', 'video'],
      default: 'image',
    },
    caption: {
      type: String,
      trim: true,
      maxlength: 200,
    },
  },
  { timestamps: true }
);

mediaSchema.index({ companyId: 1, entityType: 1, entityId: 1 });

export default mongoose.model('Media', mediaSchema);
