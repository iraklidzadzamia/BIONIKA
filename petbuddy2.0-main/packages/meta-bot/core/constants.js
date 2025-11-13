/**
 * Shared Constants
 * All constants used across the meta-bot application
 */

// Bot signature - invisible zero-width joiner to mark bot messages
export const BOT_SIGNATURE = "\u200D";

// Timing configurations
export const RESPONSE_DELAY_MS = 4000; // Default delay before bot responds
export const BUFFER_CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutes
export const STALE_BUFFER_THRESHOLD = 5 * 60 * 1000; // 5 minutes

// Limits
export const MAX_ATTACHMENTS = 10; // Maximum attachments per message
export const MAX_MESSAGE_HISTORY = 100; // Maximum messages to load for context
export const MAX_PROCESSED_IDS = 1000; // Maximum duplicate message IDs to track

// Bot suspension durations
export const ADMIN_REPLY_SUSPENSION_DAYS = 14; // Days to suspend bot after admin reply
export const ERROR_SUSPENSION_MINUTES = 30; // Minutes to suspend bot after error
export const RATE_LIMIT_SUSPENSION_HOURS = 1; // Hours to suspend bot after rate limit

// Message types
export const MESSAGE_DIRECTION = {
  INBOUND: "inbound",
  OUTBOUND: "outbound",
};

export const MESSAGE_ROLE = {
  USER: "user",
  ASSISTANT: "assistant",
};

// Platform names
export const PLATFORM = {
  FACEBOOK: "facebook",
  INSTAGRAM: "instagram",
};
