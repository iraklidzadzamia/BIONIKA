import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  // Link to the contact (unified model for leads and customers)
  contact_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contact',
    required: true,
  },

  // Who sent the message: "user", "operator", "bot", etc.
  role: {
    type: String,
    enum: ['user', 'operator', 'assistant'],
    required: true,
  },

  // Platform/channel where the message was sent or received
  platform: {
    type: String,
    enum: ['instagram', 'facebook', 'telegram', 'whatsapp', 'web', 'other'],
    required: true,
  },

  // Main content (text) of the message
  content: { type: String, default: '' },

  // Array of file attachments (for future-proofing, e.g. PDF, DOCX)
  attachments: [
    {
      type: {
        type: String, // "image", "video", "file", etc.
        required: true,
      },
      url: { type: String, required: true },
      file_description: { type: String },
    },
  ],

  // Message direction
  direction: { type: String, enum: ['inbound', 'outbound'], required: true },

  // Unique ID from external platforms (if syncing with IG/FB/Telegram APIs)
  external_message_id: { type: String },

  // True if the message has been delivered/read (optional, good for CRM UIs)
  delivered: { type: Boolean, default: false },
  read: { type: Boolean, default: false },
  read_at: { type: Date },

  // Optional: Reply/Threading (for platforms that support it)
  reply_to: { type: String }, // message ID if this is a reply

  // Timestamps
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
});

// Indexes for efficient querying (by contact, platform, and time)
MessageSchema.index({ contact_id: 1, platform: 1, created_at: 1 });
MessageSchema.index({ company_id: 1, platform: 1, created_at: -1 });
MessageSchema.index({ contact_id: 1, created_at: -1 });

// Optional: Text index for content search
MessageSchema.index({ content: 'text' });

export default mongoose.model('Message', MessageSchema);
