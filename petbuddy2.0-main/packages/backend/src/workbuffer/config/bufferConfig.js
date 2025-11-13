/**
 * Work Buffer Configuration
 *
 * Central configuration for the work buffer message system.
 * All values can be overridden via environment variables or constructor options.
 *
 * @module workbuffer/config
 */

/**
 * Default configuration for WorkBuffer
 * @typedef {Object} BufferConfig
 */
export const DEFAULT_CONFIG = {
  // Worker pool configuration
  concurrency: parseInt(process.env.BUFFER_CONCURRENCY, 10) || 10,
  maxConcurrency: 100,
  minConcurrency: 1,

  // Retry configuration
  maxRetries: parseInt(process.env.BUFFER_MAX_RETRIES, 10) || 5,
  retryBackoffBase: parseInt(process.env.BUFFER_RETRY_BACKOFF_MS, 10) || 1000, // 1 second base
  retryBackoffMax: parseInt(process.env.BUFFER_RETRY_BACKOFF_MAX_MS, 10) || 60000, // 1 minute max
  retryBackoffMultiplier: parseFloat(process.env.BUFFER_RETRY_MULTIPLIER) || 2, // exponential

  // Message lifecycle timeouts
  messageTimeout: parseInt(process.env.BUFFER_MESSAGE_TIMEOUT_MS, 10) || 30000, // 30 seconds
  visibilityTimeout: parseInt(process.env.BUFFER_VISIBILITY_TIMEOUT_MS, 10) || 60000, // 1 minute
  heartbeatInterval: parseInt(process.env.BUFFER_HEARTBEAT_INTERVAL_MS, 10) || 5000, // 5 seconds

  // Queue management
  maxQueueSize: parseInt(process.env.BUFFER_MAX_QUEUE_SIZE, 10) || 10000,
  pollInterval: parseInt(process.env.BUFFER_POLL_INTERVAL_MS, 10) || 100, // 100ms between polls
  batchSize: parseInt(process.env.BUFFER_BATCH_SIZE, 10) || 10, // messages per batch load

  // Persistence
  persistenceEnabled: process.env.BUFFER_PERSISTENCE_ENABLED !== 'false', // default true
  persistenceCollection: process.env.BUFFER_COLLECTION || 'work_buffer_messages',
  dlqCollection: process.env.BUFFER_DLQ_COLLECTION || 'work_buffer_dlq',

  // Graceful shutdown
  shutdownTimeout: parseInt(process.env.BUFFER_SHUTDOWN_TIMEOUT_MS, 10) || 30000, // 30 seconds
  drainOnShutdown: process.env.BUFFER_DRAIN_ON_SHUTDOWN !== 'false', // default true

  // Circuit breaker
  circuitBreakerThreshold: parseInt(process.env.BUFFER_CIRCUIT_BREAKER_THRESHOLD, 10) || 5,
  circuitBreakerTimeout: parseInt(process.env.BUFFER_CIRCUIT_BREAKER_TIMEOUT_MS, 10) || 60000, // 1 minute
  circuitBreakerEnabled: process.env.BUFFER_CIRCUIT_BREAKER_ENABLED !== 'false', // default true

  // Monitoring
  metricsEnabled: process.env.BUFFER_METRICS_ENABLED !== 'false', // default true
  metricsInterval: parseInt(process.env.BUFFER_METRICS_INTERVAL_MS, 10) || 30000, // 30 seconds
  logLevel: process.env.BUFFER_LOG_LEVEL || 'info', // error, warn, info, debug

  // Priority lanes
  priorityLevels: {
    CRITICAL: 0,
    HIGH: 1,
    NORMAL: 2,
    LOW: 3,
  },
  defaultPriority: 2, // NORMAL

  // Idempotency
  idempotencyEnabled: process.env.BUFFER_IDEMPOTENCY_ENABLED !== 'false', // default true
  idempotencyTTL: parseInt(process.env.BUFFER_IDEMPOTENCY_TTL_MS, 10) || 86400000, // 24 hours
};

/**
 * Priority levels for message processing
 */
export const PRIORITY = {
  CRITICAL: 0, // Process immediately (e.g., payment confirmations)
  HIGH: 1,     // Process within seconds (e.g., appointment notifications)
  NORMAL: 2,   // Standard priority (e.g., email sends)
  LOW: 3,      // Background tasks (e.g., analytics)
};

/**
 * Message states
 */
export const MESSAGE_STATE = {
  PENDING: 'pending',       // Waiting to be processed
  PROCESSING: 'processing', // Currently being processed
  COMPLETED: 'completed',   // Successfully processed
  FAILED: 'failed',         // Failed after max retries
  DLQ: 'dlq',              // Moved to dead letter queue
  TIMEOUT: 'timeout',       // Processing timed out
};

/**
 * Circuit breaker states
 */
export const CIRCUIT_STATE = {
  CLOSED: 'closed',   // Normal operation
  OPEN: 'open',       // Circuit open, fast-fail
  HALF_OPEN: 'half_open', // Testing if service recovered
};

/**
 * Error codes for buffer operations
 */
export const ERROR_CODES = {
  QUEUE_FULL: 'QUEUE_FULL',
  MESSAGE_TIMEOUT: 'MESSAGE_TIMEOUT',
  INVALID_MESSAGE: 'INVALID_MESSAGE',
  HANDLER_NOT_FOUND: 'HANDLER_NOT_FOUND',
  PERSISTENCE_FAILURE: 'PERSISTENCE_FAILURE',
  MAX_RETRIES_EXCEEDED: 'MAX_RETRIES_EXCEEDED',
  CIRCUIT_OPEN: 'CIRCUIT_OPEN',
  SHUTDOWN_IN_PROGRESS: 'SHUTDOWN_IN_PROGRESS',
  DUPLICATE_MESSAGE: 'DUPLICATE_MESSAGE',
};

/**
 * Validate and merge configuration
 * @param {Partial<BufferConfig>} userConfig - User-provided configuration
 * @returns {BufferConfig} Validated configuration
 * @throws {Error} If configuration is invalid
 */
export function validateConfig(userConfig = {}) {
  const config = { ...DEFAULT_CONFIG, ...userConfig };

  // Validate concurrency
  if (config.concurrency < config.minConcurrency) {
    throw new Error(`Concurrency must be at least ${config.minConcurrency}`);
  }
  if (config.concurrency > config.maxConcurrency) {
    throw new Error(`Concurrency must not exceed ${config.maxConcurrency}`);
  }

  // Validate retry configuration
  if (config.maxRetries < 0) {
    throw new Error('maxRetries must be non-negative');
  }
  if (config.retryBackoffBase < 0) {
    throw new Error('retryBackoffBase must be non-negative');
  }
  if (config.retryBackoffMultiplier <= 1) {
    throw new Error('retryBackoffMultiplier must be greater than 1');
  }

  // Validate timeouts
  if (config.messageTimeout <= 0) {
    throw new Error('messageTimeout must be positive');
  }
  if (config.visibilityTimeout <= config.messageTimeout) {
    throw new Error('visibilityTimeout must be greater than messageTimeout');
  }

  // Validate queue size
  if (config.maxQueueSize <= 0) {
    throw new Error('maxQueueSize must be positive');
  }

  // Validate circuit breaker
  if (config.circuitBreakerThreshold < 1) {
    throw new Error('circuitBreakerThreshold must be at least 1');
  }

  return config;
}

/**
 * Calculate exponential backoff delay
 * @param {number} attemptNumber - Current attempt (0-indexed)
 * @param {BufferConfig} config - Buffer configuration
 * @returns {number} Delay in milliseconds
 */
export function calculateBackoff(attemptNumber, config = DEFAULT_CONFIG) {
  const delay = config.retryBackoffBase * Math.pow(config.retryBackoffMultiplier, attemptNumber);
  return Math.min(delay, config.retryBackoffMax);
}

/**
 * Get priority value from string or number
 * @param {string|number} priority - Priority level
 * @returns {number} Priority value
 */
export function normalizePriority(priority) {
  if (typeof priority === 'number') {
    return priority;
  }
  return PRIORITY[priority?.toUpperCase()] ?? DEFAULT_CONFIG.defaultPriority;
}
