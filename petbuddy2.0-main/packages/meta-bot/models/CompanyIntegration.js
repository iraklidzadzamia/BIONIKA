import mongoose from "mongoose";

const companyIntegrationSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
      unique: true,
    },
    facebookChatId: { type: String, trim: true },
    instagramChatId: { type: String, trim: true },
    facebookAccessToken: { type: String, trim: true },
    facebookAppAccessToken: { type: String, trim: true },
    openaiApiKey: { type: String, trim: true, maxlength: 100 },
    geminiApiKey: { type: String, trim: true, maxlength: 100 },
    aiProvider: {
      type: String,
      enum: ["openai", "gemini"],
      default: "openai",
      trim: true,
    },
    googleAccessToken: { type: String, trim: true },
    googleRefreshToken: { type: String, trim: true },

    // Escalation/Human Handoff Configuration
    facebookAdminChatId: { type: String, trim: true },
    facebookAdminToken: { type: String, trim: true },
    instagramAdminChatId: { type: String, trim: true },
    instagramAdminToken: { type: String, trim: true },
  },
  { timestamps: true }
);

// Indexes for efficient webhook processing
// These are critical for performance when looking up company by Facebook/Instagram page ID
companyIntegrationSchema.index({ facebookChatId: 1 });
companyIntegrationSchema.index({ instagramChatId: 1 });

export default mongoose.model("CompanyIntegration", companyIntegrationSchema);
