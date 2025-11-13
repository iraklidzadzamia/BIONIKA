/**
 * WorkBuffer - Core work buffer with worker pool
 *
 * Manages in-memory queue, worker pool, and orchestrates message processing.
 * Provides configurable concurrency, backpressure, and graceful shutdown.
 *
 * @module workbuffer/core/WorkBuffer
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { BufferStore } from '../storage/BufferStore.js';
import { MessageProcessor } from './MessageProcessor.js';
import {
  validateConfig,
  calculateBackoff,
  ERROR_CODES,
  MESSAGE_STATE,
  PRIORITY,
} from '../config/bufferConfig.js';
import logger from '../../utils/logger.js';

/**
 * WorkBuffer class - Main entry point for work buffer system
 *
 * @extends EventEmitter
 * @emits enqueued - When a message is enqueued
 * @emits processing - When a message starts processing
 * @emits completed - When a message completes successfully
 * @emits failed - When a message fails
 * @emits dlq - When a message moves to dead letter queue
 * @emits error - When a system error occurs
 * @emits metrics - Periodic metrics emission
 */
export class WorkBuffer extends EventEmitter {
  /**
   * @param {Object} options - Configuration options
   * @param {Object} [options.config] - Buffer configuration (see bufferConfig.js)
   * @param {BufferStore} [options.store] - Custom store instance
   * @param {MessageProcessor} [options.processor] - Custom processor instance
   */
  constructor(options = {}) {
    super();

    this.config = validateConfig(options.config || {});
    this.store = options.store || new BufferStore({
      enableIdempotency: this.config.idempotencyEnabled,
    });
    this.processor = options.processor || new MessageProcessor({
      config: this.config,
    });

    // Worker pool state
    this.workerId = uuidv4();
    this.workers = new Map(); // workerId -> { promise, controller, message }
    this.isRunning = false;
    this.isShuttingDown = false;
    this.pollTimer = null;
    this.stuckMessageTimer = null;
    this.metricsTimer = null;
    this.cleanupTimer = null;

    // Metrics
    this.metrics = {
      enqueued: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      dlq: 0,
      retries: 0,
      errors: 0,
      avgProcessingTimeMs: 0,
      lastProcessingTimeMs: 0,
    };

    this.logPrefix = '[WorkBuffer]';

    logger.info(`${this.logPrefix} WorkBuffer initialized`, {
      workerId: this.workerId,
      concurrency: this.config.concurrency,
      maxRetries: this.config.maxRetries,
    });
  }

  /**
   * Start the work buffer
   *
   * Begins polling for messages and processing them with the worker pool.
   *
   * @returns {Promise<void>}
   */
  async start() {
    if (this.isRunning) {
      logger.warn(`${this.logPrefix} Already running`);
      return;
    }

    logger.info(`${this.logPrefix} Starting work buffer`, {
      workerId: this.workerId,
      concurrency: this.config.concurrency,
    });

    this.isRunning = true;
    this.isShuttingDown = false;

    // Start polling for messages
    this.pollForMessages();

    // Start background jobs
    this.startStuckMessageMonitor();
    if (this.config.metricsEnabled) {
      this.startMetricsEmitter();
    }
    this.startCleanupJob();

    this.emit('started', { workerId: this.workerId });
  }

  /**
   * Stop the work buffer gracefully
   *
   * Stops accepting new messages and waits for current messages to complete.
   *
   * @param {Object} [options={}] - Shutdown options
   * @param {boolean} [options.drain=true] - Wait for current messages to complete
   * @param {number} [options.timeout] - Shutdown timeout (default from config)
   * @returns {Promise<void>}
   */
  async stop(options = {}) {
    const drain = options.drain ?? this.config.drainOnShutdown;
    const timeout = options.timeout ?? this.config.shutdownTimeout;

    logger.info(`${this.logPrefix} Stopping work buffer`, {
      workerId: this.workerId,
      drain,
      timeout,
      activeWorkers: this.workers.size,
    });

    this.isShuttingDown = true;
    this.isRunning = false;

    // Stop polling
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }

    // Stop background jobs
    if (this.stuckMessageTimer) {
      clearInterval(this.stuckMessageTimer);
      this.stuckMessageTimer = null;
    }
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = null;
    }
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    // Wait for workers to finish if draining
    if (drain && this.workers.size > 0) {
      logger.info(`${this.logPrefix} Draining ${this.workers.size} active workers`);

      try {
        await Promise.race([
          this.waitForWorkers(),
          new Promise((resolve) => setTimeout(resolve, timeout)),
        ]);
      } catch (error) {
        logger.error(`${this.logPrefix} Error during drain`, { error });
      }
    }

    // Cancel any remaining workers
    for (const [workerId, worker] of this.workers.entries()) {
      logger.warn(`${this.logPrefix} Cancelling worker`, { workerId });
      worker.controller.abort();
    }

    this.workers.clear();

    logger.info(`${this.logPrefix} Work buffer stopped`, {
      workerId: this.workerId,
    });

    this.emit('stopped', { workerId: this.workerId });
  }

  /**
   * Enqueue a new message for processing
   *
   * @param {Object} message - Message to enqueue
   * @param {string} message.type - Message type/handler name
   * @param {*} message.payload - Message payload
   * @param {number|string} [message.priority='NORMAL'] - Priority level
   * @param {Object} [message.metadata] - Optional metadata
   * @param {string} [message.idempotencyKey] - Optional idempotency key
   * @param {number} [message.maxRetries] - Override default max retries
   * @param {number} [message.visibilityDelayMs=0] - Delay before message is visible
   * @returns {Promise<Object>} Created message with messageId
   * @throws {Error} If queue is full or shutting down
   */
  async enqueue(message) {
    if (this.isShuttingDown) {
      throw new Error(ERROR_CODES.SHUTDOWN_IN_PROGRESS);
    }

    // Check queue size
    const stats = await this.store.getStats();
    if (stats.pending >= this.config.maxQueueSize) {
      logger.error(`${this.logPrefix} Queue full`, {
        pending: stats.pending,
        maxQueueSize: this.config.maxQueueSize,
      });
      throw new Error(ERROR_CODES.QUEUE_FULL);
    }

    // Normalize priority
    const priority = typeof message.priority === 'number'
      ? message.priority
      : PRIORITY[message.priority?.toUpperCase()] ?? PRIORITY.NORMAL;

    try {
      // Create message in store
      const created = await this.store.create({
        type: message.type,
        payload: message.payload,
        priority,
        metadata: message.metadata || {},
        idempotencyKey: message.idempotencyKey,
        maxRetries: message.maxRetries ?? this.config.maxRetries,
        visibilityDelayMs: message.visibilityDelayMs || 0,
      });

      this.metrics.enqueued++;

      logger.debug(`${this.logPrefix} Message enqueued`, {
        messageId: created.messageId,
        type: created.type,
        priority: created.priority,
      });

      this.emit('enqueued', {
        messageId: created.messageId,
        type: created.type,
        priority: created.priority,
      });

      // Trigger immediate poll if workers are idle
      if (this.workers.size < this.config.concurrency) {
        setImmediate(() => this.pollForMessages());
      }

      return {
        messageId: created.messageId,
        type: created.type,
        state: created.state,
      };
    } catch (error) {
      if (error.message === ERROR_CODES.DUPLICATE_MESSAGE) {
        logger.warn(`${this.logPrefix} Duplicate message rejected`, {
          idempotencyKey: message.idempotencyKey,
        });
        // Return the existing message
        const existing = await this.store.findByIdempotencyKey(message.idempotencyKey);
        return {
          messageId: existing.messageId,
          type: existing.type,
          state: existing.state,
          duplicate: true,
        };
      }
      throw error;
    }
  }

  /**
   * Poll for messages and spawn workers
   * @private
   */
  pollForMessages() {
    if (!this.isRunning || this.isShuttingDown) {
      return;
    }

    // Check if we have capacity
    const availableWorkers = this.config.concurrency - this.workers.size;
    if (availableWorkers <= 0) {
      // Schedule next poll
      this.pollTimer = setTimeout(
        () => this.pollForMessages(),
        this.config.pollInterval
      );
      return;
    }

    // Claim messages from store
    this.store
      .claimNextBatch(availableWorkers, this.workerId, this.config.visibilityTimeout)
      .then((messages) => {
        // Spawn workers for each message
        for (const message of messages) {
          this.spawnWorker(message);
        }

        // Schedule next poll
        this.pollTimer = setTimeout(
          () => this.pollForMessages(),
          this.config.pollInterval
        );
      })
      .catch((error) => {
        logger.error(`${this.logPrefix} Error polling for messages`, { error });
        this.emit('error', error);

        // Retry after longer delay on error
        this.pollTimer = setTimeout(
          () => this.pollForMessages(),
          this.config.pollInterval * 5
        );
      });
  }

  /**
   * Spawn a worker to process a message
   * @private
   */
  spawnWorker(message) {
    const workerId = uuidv4();
    const controller = new AbortController();

    logger.debug(`${this.logPrefix} Spawning worker`, {
      workerId,
      messageId: message.messageId,
      type: message.type,
      attemptCount: message.attemptCount,
    });

    this.metrics.processing++;
    this.emit('processing', {
      messageId: message.messageId,
      type: message.type,
      attemptCount: message.attemptCount,
    });

    const startTime = Date.now();

    const promise = this.processor
      .process(message, { signal: controller.signal })
      .then(async (result) => {
        // Success
        const processingTime = Date.now() - startTime;
        this.metrics.lastProcessingTimeMs = processingTime;
        this.metrics.avgProcessingTimeMs =
          (this.metrics.avgProcessingTimeMs * this.metrics.completed +
            processingTime) /
          (this.metrics.completed + 1);

        await this.store.markCompleted(message.messageId, result);

        this.metrics.processing--;
        this.metrics.completed++;

        logger.info(`${this.logPrefix} Message completed`, {
          messageId: message.messageId,
          type: message.type,
          processingTime,
        });

        this.emit('completed', {
          messageId: message.messageId,
          type: message.type,
          result,
          processingTime,
        });
      })
      .catch(async (error) => {
        // Failure
        const processingTime = Date.now() - startTime;

        // Calculate retry delay
        const retryDelay = calculateBackoff(message.attemptCount, this.config);

        // Mark as failed (will retry if attempts remaining)
        const { willRetry } = await this.store.markFailed(
          message.messageId,
          error,
          retryDelay
        );

        this.metrics.processing--;

        if (willRetry) {
          this.metrics.retries++;
          logger.warn(`${this.logPrefix} Message failed, will retry`, {
            messageId: message.messageId,
            type: message.type,
            attemptCount: message.attemptCount,
            retryDelay,
            error: error.message,
          });

          this.emit('failed', {
            messageId: message.messageId,
            type: message.type,
            error: error.message,
            willRetry: true,
            retryDelay,
          });
        } else {
          this.metrics.failed++;
          logger.error(`${this.logPrefix} Message failed permanently`, {
            messageId: message.messageId,
            type: message.type,
            attemptCount: message.attemptCount,
            error: error.message,
          });

          this.emit('failed', {
            messageId: message.messageId,
            type: message.type,
            error: error.message,
            willRetry: false,
          });

          // Check if should move to DLQ
          if (message.attemptCount >= message.maxRetries) {
            await this.store.moveToDLQ(
              message.messageId,
              `Max retries (${message.maxRetries}) exceeded`
            );

            this.metrics.dlq++;
            this.emit('dlq', {
              messageId: message.messageId,
              type: message.type,
              reason: 'Max retries exceeded',
            });
          }
        }
      })
      .finally(() => {
        // Remove worker from pool
        this.workers.delete(workerId);
      });

    // Track worker
    this.workers.set(workerId, { promise, controller, message });
  }

  /**
   * Wait for all workers to complete
   * @private
   */
  async waitForWorkers() {
    const promises = Array.from(this.workers.values()).map((w) => w.promise);
    await Promise.allSettled(promises);
  }

  /**
   * Monitor and release stuck messages
   * @private
   */
  startStuckMessageMonitor() {
    this.stuckMessageTimer = setInterval(async () => {
      try {
        const released = await this.store.releaseStuckMessages(
          this.config.visibilityTimeout
        );
        if (released > 0) {
          logger.warn(`${this.logPrefix} Released ${released} stuck messages`);
        }
      } catch (error) {
        logger.error(`${this.logPrefix} Error releasing stuck messages`, { error });
      }
    }, this.config.visibilityTimeout / 2);
  }

  /**
   * Emit metrics periodically
   * @private
   */
  startMetricsEmitter() {
    this.metricsTimer = setInterval(async () => {
      try {
        const stats = await this.store.getStats();
        const metrics = {
          ...this.metrics,
          queueDepth: stats.pending,
          activeWorkers: this.workers.size,
          timestamp: new Date(),
        };

        this.emit('metrics', metrics);

        logger.debug(`${this.logPrefix} Metrics`, metrics);
      } catch (error) {
        logger.error(`${this.logPrefix} Error emitting metrics`, { error });
      }
    }, this.config.metricsInterval);
  }

  /**
   * Periodic cleanup of old messages
   * @private
   */
  startCleanupJob() {
    // Run cleanup every hour
    this.cleanupTimer = setInterval(async () => {
      try {
        const deleted = await this.store.cleanup();
        if (deleted > 0) {
          logger.info(`${this.logPrefix} Cleaned up ${deleted} old messages`);
        }
      } catch (error) {
        logger.error(`${this.logPrefix} Error during cleanup`, { error });
      }
    }, 3600000); // 1 hour
  }

  /**
   * Get current buffer statistics
   * @returns {Promise<Object>}
   */
  async getStats() {
    const storeStats = await this.store.getStats();
    return {
      ...storeStats,
      activeWorkers: this.workers.size,
      metrics: this.metrics,
      isRunning: this.isRunning,
      isShuttingDown: this.isShuttingDown,
    };
  }

  /**
   * Register a message handler
   * @param {MessageHandler} handler - Handler instance
   */
  registerHandler(handler) {
    this.processor.registerHandler(handler);
  }

  /**
   * Get registered handler types
   * @returns {string[]}
   */
  getHandlerTypes() {
    return this.processor.getHandlerTypes();
  }
}

export default WorkBuffer;
