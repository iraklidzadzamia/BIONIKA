import mongoose from 'mongoose';

const petSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contact',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    species: {
      type: String,
      enum: ['dog', 'cat', 'other'],
      required: true,
    },
    breed: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    size: {
      type: String,
      enum: ['S', 'M', 'L', 'XL'],
      required: false,
    },
    coatType: {
      type: String,
      enum: ['short', 'medium', 'long', 'curly', 'double', 'wire', 'hairless', 'unknown'],
      default: 'unknown',
    },
    allergies: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    sex: {
      type: String,
      enum: ['male', 'female', 'unknown'],
      required: true,
    },
    weightKg: {
      type: Number,
      min: 0,
      max: 200,
    },
    ageYears: {
      type: Number,
      min: 0,
      max: 30,
    },
    temperament: {
      type: String,
      enum: ['calm', 'normal', 'anxious', 'aggressive'],
      default: 'normal',
    },
    medicalNotes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
petSchema.index({ companyId: 1, customerId: 1 });
petSchema.index({ companyId: 1, species: 1 });
petSchema.index({ companyId: 1, name: 1 });
petSchema.index({ companyId: 1, size: 1 });

export default mongoose.model('Pet', petSchema);
