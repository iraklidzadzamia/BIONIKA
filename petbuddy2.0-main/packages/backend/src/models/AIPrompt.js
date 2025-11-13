import mongoose from 'mongoose';

const aiPromptSchema = new mongoose.Schema(
  {
    // Basic identification
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    // Categorization for easy discovery
    category: {
      type: String,
      required: true,
      enum: [
        'pet_grooming',
        'veterinary',
        'pet_sitting',
        'pet_training',
        'pet_supplies',
        'general_pet_care',
      ],
      index: true,
    },

    businessType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },

    // User-friendly description
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    // Core prompt components
    systemInstruction: {
      type: String,
      required: true,
      maxlength: 5000,
    },

    role: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    // Detailed behavior rules
    givenInformationRules: {
      type: String,
      required: false,
      maxlength: 1000,
    },

    informationCollectionRules: {
      type: String,
      required: false,
      maxlength: 1000,
    },

    customerSupportRules: {
      type: String,
      required: false,
      maxlength: 1000,
    },

    // Conversation examples for better understanding
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

    // Search and discovery
    tags: [
      {
        type: String,
        trim: true,
        maxlength: 30,
      },
    ],

    // Status and metadata
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    isDefault: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Usage statistics
    usageCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Versioning and updates
    version: {
      type: Number,
      default: 1,
      min: 1,
    },

    // Timestamps
    createdAt: {
      type: Date,
      default: Date.now,
    },

    updatedAt: {
      type: Date,
      default: Date.now,
    },

    createdBy: {
      type: String,
      default: 'system',
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for efficient querying
aiPromptSchema.index({ category: 1, isActive: 1 });
aiPromptSchema.index({ businessType: 1, isActive: 1 });
aiPromptSchema.index({ tags: 1, isActive: 1 });
aiPromptSchema.index({ isDefault: 1, isActive: 1 });

// Virtual for full prompt text
aiPromptSchema.virtual('fullPrompt').get(function () {
  let prompt = this.systemInstruction;

  if (this.role) {
    prompt = `Role: ${this.role}\n\n${prompt}`;
  }

  if (this.givenInformationRules) {
    prompt += `\n\nGiven Information Rules:\n${this.givenInformationRules}`;
  }

  if (this.informationCollectionRules) {
    prompt += `\n\nInformation Collection Rules:\n${this.informationCollectionRules}`;
  }

  if (this.customerSupportRules) {
    prompt += `\n\nCustomer Support Rules:\n${this.customerSupportRules}`;
  }

  return prompt;
});

// Pre-save middleware to update version
aiPromptSchema.pre('save', function (next) {
  if (
    this.isModified('systemInstruction') ||
    this.isModified('role') ||
    this.isModified('givenInformationRules') ||
    this.isModified('informationCollectionRules') ||
    this.isModified('customerSupportRules')
  ) {
    this.version += 1;
  }
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('AIPrompt', aiPromptSchema);
