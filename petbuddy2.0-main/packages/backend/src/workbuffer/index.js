/**
 * Work Buffer System - Main entry point
 *
 * @module workbuffer
 */

export { WorkBuffer } from './core/WorkBuffer.js';
export { MessageProcessor } from './core/MessageProcessor.js';
export { MessageHandler } from './handlers/MessageHandler.js';
export { SocketEmissionHandler } from './handlers/SocketEmissionHandler.js';
export { MetaBotForwardingHandler } from './handlers/MetaBotForwardingHandler.js';
export { BufferStore } from './storage/BufferStore.js';
export { DeadLetterQueue } from './dlq/DeadLetterQueue.js';
export { MetricsCollector } from './utils/metrics.js';
export {
  DEFAULT_CONFIG,
  PRIORITY,
  MESSAGE_STATE,
  CIRCUIT_STATE,
  ERROR_CODES,
  validateConfig,
  calculateBackoff,
  normalizePriority,
} from './config/bufferConfig.js';
export { default as BufferMessage } from './models/BufferMessage.js';

// Re-export for convenience
export default {
  WorkBuffer,
  MessageHandler,
  BufferStore,
  DeadLetterQueue,
};
