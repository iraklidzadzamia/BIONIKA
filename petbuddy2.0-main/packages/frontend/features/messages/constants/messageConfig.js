/**
 * Message Feature Configuration
 * Centralized configuration for the messages feature
 */

// Platforms supported
export const PLATFORMS = {
  INSTAGRAM: "instagram",
  FACEBOOK: "facebook",
};

// Contact types
export const CONTACT_TYPES = {
  CUSTOMER: "customer",
  LEAD: "lead",
  ALL: "all",
};

// Lead statuses
export const LEAD_STATUSES = {
  NEW: "new",
  CONTACTED: "contacted",
  QUALIFIED: "qualified",
  CONVERTED: "converted",
  LOST: "lost",
};

// Message directions
export const MESSAGE_DIRECTIONS = {
  INBOUND: "inbound",
  OUTBOUND: "outbound",
};

// Filter options for conversations
export const FILTER_OPTIONS = [
  { value: CONTACT_TYPES.ALL, label: "✓ All Conversations" },
  { value: CONTACT_TYPES.CUSTOMER, label: "Customers Only" },
  { value: CONTACT_TYPES.LEAD, label: "Leads Only" },
];

// Textarea configuration
export const TEXTAREA_CONFIG = {
  minHeight: "48px",
  maxHeight: "128px", // max-h-32 in pixels
  placeholder: "Type your message...",
};

// Auto-refresh interval (optional - for future use)
export const REFRESH_INTERVAL = {
  conversations: 30000, // 30 seconds
  messages: 10000, // 10 seconds
};

// Pagination (if needed in future)
export const PAGINATION = {
  conversationsPerPage: 50,
  messagesPerPage: 100,
};

// Validation
export const VALIDATION = {
  minMessageLength: 1,
  maxMessageLength: 5000,
};
