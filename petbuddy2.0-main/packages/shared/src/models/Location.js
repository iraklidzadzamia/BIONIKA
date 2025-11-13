import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    address: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    googleLocationUrl: { type: String, trim: true },
    phone: { type: String, trim: true, maxlength: 20 },
    timezone: { type: String, trim: true },
    isMain: { type: Boolean, default: false },
    workHours: [
      new mongoose.Schema(
        {
          weekday: { type: Number, min: 0, max: 6, required: true },
          startTime: {
            type: String,
            required: true,
            match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
          },
          endTime: {
            type: String,
            required: true,
            match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
          },
        },
        { _id: false }
      ),
    ],
    holidays: [{ type: Date }],
  },
  { timestamps: true }
);

locationSchema.index({ companyId: 1, label: 1 }, { unique: false });
locationSchema.index({ companyId: 1, isMain: 1 });

export default mongoose.model('Location', locationSchema);
