import mongoose from 'mongoose';

const workHoursSchema = new mongoose.Schema({
  weekday: {
    type: Number,
    required: true,
    min: 0,
    max: 6,
  },
  startTime: {
    type: String,
    required: true,
    match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, // HH:mm format
  },
  endTime: {
    type: String,
    required: true,
    match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, // HH:mm format
  },
});

// Optional chatbot configuration (non-secret runtime controls)
const botConfigSchema = new mongoose.Schema(
  {
    conversationExamples: [
      {
        user: {
          type: String,
          required: true,
          maxlength: 500,
        },
        assistant: {
          type: String,
          required: true,
          maxlength: 500,
        },
      },
    ],
    services: [
      {
        type: String,
        trim: true,
        maxlength: 200,
      },
    ],
    systemInstruction: { type: String, trim: true, maxlength: 500000 },
    active: { type: Boolean, default: false },
    activeHours: {
      intervalActive: { type: Boolean, default: false },
      startTime: {
        type: String,
        match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
      },
      endTime: {
        type: String,
        match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
      },
      timezone: {
        type: String,
        default: 'Asia/Tbilisi',
      },
    },
    // AI Prompt integration
    selectedPromptId: { type: mongoose.Schema.Types.ObjectId, ref: 'AIPrompt' },
    selectedPromptName: { type: String, trim: true, maxlength: 100 },
    selectedPromptCategory: { type: String, trim: true, maxlength: 50 },
    // Message buffer delay settings (in milliseconds)
    responseDelay: {
      standard: { type: Number, default: 4000, min: 500, max: 10000 }, // Standard delay for mid-sentence messages
      sentenceEnd: { type: Number, default: 1000, min: 250, max: 5000 }, // Shorter delay when message ends with punctuation
    },
  },
  { _id: false }
);

const integrationConfigSchema = new mongoose.Schema({
  // Kept only for backward compatibility fields used in UI (page IDs)
  fbPageId: { type: String, trim: true, maxlength: 100 },
  instagramPageId: { type: String, trim: true, maxlength: 100 },
  // Note: tokens and Google settings moved to CompanyIntegration
});

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true, // Ensure company email is unique across all companies
    },
    phone: {
      type: String,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },
    // Legacy single address field (kept for backward compatibility)
    address: {
      type: String,
      trim: true,
    },
    timezone: {
      type: String,
      required: true,
      default: 'UTC',
    },
    businessTypes: {
      type: [String],
      enum: ['grooming', 'vet', 'boarding', 'daycare', 'training', 'other'],
      default: [],
    },
    mainCurrency: {
      type: String,
      required: true,
      default: 'USD',
    },
    // Branding
    logo: { type: String, trim: true },
    ringLogo: { type: String, trim: true },
    // Legal/registration
    registrationId: { type: String, trim: true },
    registrationName: { type: String, trim: true },
    // Business configuration
    paymentMethods: {
      type: [
        {
          bankName: { type: String, trim: true },
          accountNumber: { type: String, trim: true },
          accountName: { type: String, trim: true },
          sortCode: { type: String, trim: true },
          swiftCode: { type: String, trim: true },
          iban: { type: String, trim: true },
          bic: { type: String, trim: true },
          paypalEmail: { type: String, trim: true },
        },
      ],
      default: [],
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },
    // Bot/automation config
    bot: botConfigSchema,
    integration: integrationConfigSchema,
    settings: {
      workHours: [workHoursSchema],
      holidays: [
        {
          type: Date,
          default: [],
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
companySchema.index({ timezone: 1 });
companySchema.index({ status: 1 });

export default mongoose.model('Company', companySchema);
