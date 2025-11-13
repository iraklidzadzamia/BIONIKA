import mongoose from 'mongoose';

/**
 * CompanyIntegration Model
 *
 * SECURITY WARNING: This model stores sensitive tokens in plaintext.
 *
 * CRITICAL TODO: Implement encryption at rest for the following fields:
 *   - facebookAccessToken
 *   - facebookAppAccessToken
 *   - openaiApiKey
 *   - googleAccessToken
 *   - googleRefreshToken
 *
 * Recommended approach:
 *   1. Use a library like 'mongoose-encryption' or '@47ng/opaque'
 *   2. Implement field-level encryption with a secure master key stored in environment
 *   3. Add token rotation mechanism for expired tokens
 *   4. Consider using a secrets management service (AWS Secrets Manager, HashiCorp Vault)
 *
 * References:
 *   - https://www.npmjs.com/package/mongoose-field-encryption
 *   - https://docs.mongodb.com/manual/core/security-client-side-encryption/
 */
const companyIntegrationSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
      unique: true,
    },
    facebookChatId: { type: String, trim: true },
    instagramChatId: { type: String, trim: true },
    // WARNING: Stored in plaintext - should be encrypted
    facebookAccessToken: { type: String, trim: true },
    // WARNING: Stored in plaintext - should be encrypted
    facebookAppAccessToken: { type: String, trim: true },
    // Metadata about the currently stored Facebook Page access token
    facebookTokenSource: {
      type: String,
      enum: ['user_long_lived', 'system_user', 'unknown'],
      default: 'unknown',
    },
    facebookTokenExpiresAt: { type: Date },
    facebookTokenScopes: { type: [String], default: [] },
    // WARNING: Stored in plaintext - should be encrypted
    openaiApiKey: { type: String, trim: true, maxlength: 100 },
    // WARNING: Stored in plaintext - should be encrypted
    googleAccessToken: { type: String, trim: true },
    // WARNING: Stored in plaintext - should be encrypted
    googleRefreshToken: { type: String, trim: true },
    googleAccountEmail: { type: String, trim: true },
    // Google Calendar selection and preferences
    googleCalendarId: { type: String, trim: true },
    googleCalendarSummary: { type: String, trim: true },
    googleAutoSync: { type: Boolean, default: true },
    lastGoogleSyncAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model('CompanyIntegration', companyIntegrationSchema);
