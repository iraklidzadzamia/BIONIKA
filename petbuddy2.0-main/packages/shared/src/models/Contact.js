import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },

    // Basic contact information
    fullName: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },

    // Social media identifiers
    social: {
      facebookId: { type: String, trim: true },
      instagramId: { type: String, trim: true },
      whatsapp: { type: String, trim: true },
    },

    // Profile info from social platforms
    profile: {
      name: { type: String, trim: true },
      picture: { type: String, trim: true },
      gender: { type: String, trim: true },
      locale: { type: String, trim: true },
      timezone: { type: String, trim: true },
    },

    // Social network name (automatically populated from profile.name)
    // This is the name shown on the social platform (e.g., Instagram/Facebook username)
    socialNetworkName: {
      type: String,
      trim: true,
      maxlength: 100,
    },

    // Contact lifecycle status
    contactStatus: {
      type: String,
      enum: ['lead', 'customer'],
      default: 'lead',
      required: true,
      index: true,
    },

    // Lead-specific fields (only used when contactStatus='lead')
    leadSource: {
      type: String,
      enum: ['facebook', 'instagram', 'whatsapp', 'telegram', 'web', 'other'],
    },
    leadStage: {
      type: String,
      enum: ['new', 'contacted', 'qualified', 'lost'],
      default: 'new',
    },

    // Customer-specific fields (only used when contactStatus='customer')
    consents: {
      sms: { type: Boolean, default: false },
      email: { type: Boolean, default: false },
      marketing: { type: Boolean, default: false },
      smsConsentedAt: { type: Date },
      emailConsentedAt: { type: Date },
      marketingConsentedAt: { type: Date },
    },
    preferredLocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
    },
    lastVisitedLocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
    },

    // Shared fields for all contacts
    botSuspended: { type: Boolean, default: false },
    botSuspendUntil: { type: Date },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },

    // Conversation tracking
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    messageCount: {
      type: Number,
      default: 0,
    },

    // Conversion tracking
    convertedToCustomerAt: {
      type: Date,
    },

    // Interests (for leads)
    interestedServices: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
contactSchema.index({ companyId: 1, contactStatus: 1 });
contactSchema.index({ companyId: 1, 'social.facebookId': 1 });
contactSchema.index({ companyId: 1, 'social.instagramId': 1 });
contactSchema.index({ companyId: 1, 'social.whatsapp': 1 });
contactSchema.index({ companyId: 1, phone: 1 });
contactSchema.index({ companyId: 1, email: 1 });
contactSchema.index({ companyId: 1, createdAt: -1 });
contactSchema.index({ companyId: 1, lastMessageAt: -1 });

// Virtual for checking if contact is a lead
contactSchema.virtual('isLead').get(function () {
  return this.contactStatus === 'lead';
});

// Virtual for checking if contact is a customer
contactSchema.virtual('isCustomer').get(function () {
  return this.contactStatus === 'customer';
});

// Method to convert lead to customer
contactSchema.methods.convertToCustomer = function () {
  this.contactStatus = 'customer';
  this.convertedToCustomerAt = new Date();
  this.leadStage = undefined;
  return this.save();
};

contactSchema.set('toJSON', { virtuals: true });

export default mongoose.model('Contact', contactSchema);
