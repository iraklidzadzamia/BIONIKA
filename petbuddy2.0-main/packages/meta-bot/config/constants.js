/**
 * Centralized Constants for Meta-Bot
 *
 * All magic numbers and hard-coded strings should be defined here
 * for easy configuration and maintenance.
 */

// ===== MESSAGE PROCESSING =====

export const MESSAGE_CONSTANTS = {
  /**
   * Maximum number of attachments to process per message
   * @type {number}
   */
  MAX_ATTACHMENTS: 10,

  /**
   * Maximum conversation history messages to send to AI
   * @type {number}
   */
  MAX_MESSAGE_HISTORY: 50,

  /**
   * Default response delay in milliseconds (4 seconds)
   * Can be overridden by company settings
   * @type {number}
   */
  DEFAULT_RESPONSE_DELAY_MS: 4000,

  /**
   * Invisible zero-width character to mark bot messages
   * Used to distinguish bot messages from human replies
   * @type {string}
   */
  BOT_SIGNATURE: "\u200D",

  /**
   * Number of days to auto-suspend bot when admin replies
   * @type {number}
   */
  BOT_SUSPENSION_DAYS: 14,
};

// ===== TIMEOUTS =====

export const TIMEOUT_CONSTANTS = {
  /**
   * Timeout for socket.io emit operations (5 seconds)
   * @type {number}
   */
  SOCKET_EMIT_TIMEOUT: 5000,

  /**
   * Timeout for graceful shutdown (30 seconds)
   * @type {number}
   */
  GRACEFUL_SHUTDOWN_TIMEOUT: 30000,

  /**
   * Timeout for image processing with vision API (10 seconds)
   * @type {number}
   */
  IMAGE_PROCESSING_TIMEOUT: 10000,

  /**
   * Timeout for external API calls (15 seconds)
   * @type {number}
   */
  EXTERNAL_API_TIMEOUT: 15000,
};

// ===== ERROR CODES =====

export const ERROR_CODES = {
  /**
   * Facebook error codes
   */
  FACEBOOK: {
    TOKEN_EXPIRED: 190,
    RATE_LIMIT: [4, 80007],
    TOKEN_EXPIRATION_SUBCODES: [463, 467],
  },

  /**
   * Instagram error codes (same as Facebook but separated for clarity)
   */
  INSTAGRAM: {
    TOKEN_EXPIRED: 190,
    RATE_LIMIT: [4, 80007],
    TOKEN_EXPIRATION_SUBCODES: [463, 467],
  },

  /**
   * HTTP status codes for health checks
   */
  HTTP: {
    OK: 200,
    SERVICE_UNAVAILABLE: 503,
    BAD_REQUEST: 400,
    INTERNAL_SERVER_ERROR: 500,
  },
};

// ===== RETRY CONFIGURATION =====

export const RETRY_CONSTANTS = {
  /**
   * Maximum number of retry attempts for failed operations
   * @type {number}
   */
  MAX_RETRIES: 3,

  /**
   * Initial delay for exponential backoff (1 second)
   * @type {number}
   */
  INITIAL_DELAY_MS: 1000,

  /**
   * Maximum delay for exponential backoff (10 seconds)
   * @type {number}
   */
  MAX_DELAY_MS: 10000,
};

// ===== CIRCUIT BREAKER =====

export const CIRCUIT_BREAKER_CONSTANTS = {
  /**
   * Number of consecutive failures before circuit opens
   * @type {number}
   */
  FAILURE_THRESHOLD: 5,

  /**
   * Time in milliseconds before attempting to close circuit (30 seconds)
   * @type {number}
   */
  RESET_TIMEOUT: 30000,
};

// ===== LANGGRAPH =====

export const LANGGRAPH_CONSTANTS = {
  /**
   * Maximum recursion depth for LangGraph execution
   * Prevents infinite loops
   * @type {number}
   */
  MAX_RECURSION_LIMIT: 25,

  /**
   * Timeout for LangGraph execution (30 seconds)
   * @type {number}
   */
  EXECUTION_TIMEOUT: 30000,
};

// ===== RATE LIMITING =====

export const RATE_LIMIT_CONSTANTS = {
  /**
   * Time window for rate limiting in milliseconds (1 minute)
   * @type {number}
   */
  WINDOW_MS: 60000,

  /**
   * Maximum requests per window
   * @type {number}
   */
  MAX_REQUESTS_PER_WINDOW: 100,

  /**
   * Auto-suspension duration when rate limited (1 hour)
   * @type {number}
   */
  AUTO_SUSPEND_DURATION_MS: 3600000,
};

// ===== LOGGING =====

export const LOGGING_CONSTANTS = {
  /**
   * Maximum log file size in bytes (10 MB)
   * @type {number}
   */
  MAX_LOG_FILE_SIZE: 10 * 1024 * 1024,

  /**
   * Maximum number of log files to retain
   * @type {number}
   */
  MAX_LOG_FILES: 14,

  /**
   * Log levels
   */
  LEVELS: {
    ERROR: "error",
    WARN: "warn",
    INFO: "info",
    DEBUG: "debug",
  },
};

// ===== VALIDATION =====

export const VALIDATION_CONSTANTS = {
  /**
   * Minimum length for customer name
   * @type {number}
   */
  MIN_NAME_LENGTH: 2,

  /**
   * Maximum length for customer name
   * @type {number}
   */
  MAX_NAME_LENGTH: 100,

  /**
   * Phone number regex pattern (E.164 format)
   * @type {RegExp}
   */
  PHONE_NUMBER_PATTERN: /^\+?[1-9]\d{1,14}$/,

  /**
   * Maximum message length (Facebook/Instagram limit)
   * @type {number}
   */
  MAX_MESSAGE_LENGTH: 2000,
};

// ===== PLATFORM-SPECIFIC =====

export const PLATFORM_CONSTANTS = {
  /**
   * Supported platforms
   */
  PLATFORMS: {
    FACEBOOK: "facebook",
    INSTAGRAM: "instagram",
  },

  /**
   * Facebook Graph API version
   * @type {string}
   */
  FACEBOOK_API_VERSION: "v18.0",

  /**
   * Instagram Graph API version
   * @type {string}
   */
  INSTAGRAM_API_VERSION: "v18.0",
};

// ===== DATABASE =====

export const DATABASE_CONSTANTS = {
  /**
   * Connection states
   */
  CONNECTION_STATES: {
    DISCONNECTED: 0,
    CONNECTED: 1,
    CONNECTING: 2,
    DISCONNECTING: 3,
  },

  /**
   * Default query timeout (10 seconds)
   * @type {number}
   */
  QUERY_TIMEOUT: 10000,

  /**
   * Maximum retries for database operations
   * @type {number}
   */
  MAX_DB_RETRIES: 3,
};
