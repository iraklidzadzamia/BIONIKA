/**
 * MessageProcessor - Processes messages with retry logic and circuit breaker
 *
 * Manages handler registry and orchestrates message processing with:
 * - Timeout enforcement
 * - Circuit breaker pattern for failing handlers
 * - Structured error handling
 * - Handler lifecycle hooks
 *
 * @module workbuffer/core/MessageProcessor
 */

import { ERROR_CODES, CIRCUIT_STATE } from '../config/bufferConfig.js';
import logger from '../../utils/logger.js';

/**
 * Circuit breaker state per handler
 */
class CircuitBreaker {
  constructor(config) {
    this.threshold = config.circuitBreakerThreshold;
    this.timeout = config.circuitBreakerTimeout;
    this.state = CIRCUIT_STATE.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.nextRetryTime = null;
  }

  recordSuccess() {
    this.failureCount = 0;
    if (this.state === CIRCUIT_STATE.HALF_OPEN) {
      this.state = CIRCUIT_STATE.CLOSED;
      logger.info('[CircuitBreaker] Circuit closed after successful execution');
    }
  }

  recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CIRCUIT_STATE.HALF_OPEN) {
      this.open();
    } else if (this.failureCount >= this.threshold) {
      this.open();
    }
  }

  open() {
    this.state = CIRCUIT_STATE.OPEN;
    this.nextRetryTime = Date.now() + this.timeout;
    logger.warn('[CircuitBreaker] Circuit opened', {
      failureCount: this.failureCount,
      nextRetryTime: new Date(this.nextRetryTime),
    });
  }

  allowRequest() {
    if (this.state === CIRCUIT_STATE.CLOSED) return true;
    if (this.state === CIRCUIT_STATE.OPEN) {
      if (Date.now() >= this.nextRetryTime) {
        this.state = CIRCUIT_STATE.HALF_OPEN;
        logger.info('[CircuitBreaker] Circuit half-open, attempting test request');
        return true;
      }
      return false;
    }
    return true;
  }

  getState() {
    return this.state;
  }
}

export class MessageProcessor {
  constructor(options = {}) {
    this.config = options.config;
    this.handlers = new Map();
    this.circuitBreakers = new Map();
    this.logPrefix = '[MessageProcessor]';
  }

  registerHandler(handler) {
    if (!handler || !handler.type) {
      throw new Error('Handler must have a type');
    }
    if (this.handlers.has(handler.type)) {
      logger.warn(\`\${this.logPrefix} Handler \${handler.type} already registered, replacing\`);
    }
    this.handlers.set(handler.type, handler);
    if (this.config.circuitBreakerEnabled) {
      this.circuitBreakers.set(handler.type, new CircuitBreaker(this.config));
    }
    logger.info(\`\${this.logPrefix} Handler registered\`, { type: handler.type });
  }

  getHandlerTypes() {
    return Array.from(this.handlers.keys());
  }

  async process(message, context = {}) {
    const handler = this.handlers.get(message.type);
    if (!handler) {
      const error = new Error(\`No handler registered for type: \${message.type}\`);
      error.code = ERROR_CODES.HANDLER_NOT_FOUND;
      throw error;
    }

    if (this.config.circuitBreakerEnabled) {
      const breaker = this.circuitBreakers.get(message.type);
      if (!breaker.allowRequest()) {
        const error = new Error(\`Circuit breaker open for handler: \${message.type}\`);
        error.code = ERROR_CODES.CIRCUIT_OPEN;
        throw error;
      }
    }

    try {
      await handler.validate(message.payload);
      await handler.onBeforeProcess(message);
      const timeout = handler.timeout || this.config.messageTimeout;
      const result = await this.processWithTimeout(handler, message, context, timeout);
      await handler.onAfterProcess(message, result);

      if (this.config.circuitBreakerEnabled) {
        const breaker = this.circuitBreakers.get(message.type);
        breaker.recordSuccess();
      }
      return result;
    } catch (error) {
      if (this.config.circuitBreakerEnabled) {
        const breaker = this.circuitBreakers.get(message.type);
        breaker.recordFailure();
      }
      const shouldRetry = await handler.onError(error, message);
      if (!shouldRetry) error.noRetry = true;
      throw error;
    }
  }

  async processWithTimeout(handler, message, context, timeout) {
    const controller = new AbortController();
    const combinedSignal = this.combineAbortSignals([context.signal, controller.signal]);
    const processingContext = { ...context, signal: combinedSignal };

    return Promise.race([
      handler.process(message, processingContext),
      new Promise((_, reject) =>
        setTimeout(() => {
          controller.abort();
          const error = new Error('Message processing timeout');
          error.code = ERROR_CODES.MESSAGE_TIMEOUT;
          reject(error);
        }, timeout)
      ),
    ]);
  }

  combineAbortSignals(signals) {
    const controller = new AbortController();
    for (const signal of signals) {
      if (signal?.aborted) {
        controller.abort();
        break;
      }
      signal?.addEventListener('abort', () => controller.abort(), { once: true });
    }
    return controller.signal;
  }

  getCircuitState(type) {
    const breaker = this.circuitBreakers.get(type);
    return breaker ? breaker.getState() : null;
  }

  resetCircuitBreaker(type) {
    const breaker = this.circuitBreakers.get(type);
    if (breaker) {
      breaker.state = CIRCUIT_STATE.CLOSED;
      breaker.failureCount = 0;
      logger.info(\`\${this.logPrefix} Circuit breaker reset\`, { type });
      return true;
    }
    return false;
  }

  getStats() {
    const handlers = Array.from(this.handlers.keys());
    const circuits = {};
    for (const [type, breaker] of this.circuitBreakers.entries()) {
      circuits[type] = {
        state: breaker.getState(),
        failureCount: breaker.failureCount,
        lastFailureTime: breaker.lastFailureTime,
      };
    }
    return { registeredHandlers: handlers, handlerCount: handlers.length, circuitBreakers: circuits };
  }
}

export default MessageProcessor;
