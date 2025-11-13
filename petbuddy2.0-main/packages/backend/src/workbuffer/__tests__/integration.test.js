/**
 * WorkBuffer integration tests
 *
 * These tests require a running MongoDB instance.
 * Run with: npm test -- workbuffer/__tests__/integration.test.js
 */

import mongoose from 'mongoose';
import { WorkBuffer } from '../core/WorkBuffer.js';
import { MessageHandler } from '../handlers/MessageHandler.js';
import { BufferStore } from '../storage/BufferStore.js';
import { DeadLetterQueue } from '../utils/DeadLetterQueue.js';
import BufferMessage from '../models/BufferMessage.js';
import { PRIORITY, MESSAGE_STATE } from '../config/bufferConfig.js';

// Test handlers
class EchoHandler extends MessageHandler {
  constructor() {
    super('echo', { timeout: 1000, idempotent: true });
    this.processedMessages = [];
  }

  async process(message) {
    this.processedMessages.push(message);
    return { echoed: message.payload };
  }
}

class SlowHandler extends MessageHandler {
  constructor() {
    super('slow', { timeout: 5000 });
  }

  async process(message) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { processed: true };
  }
}

class ErrorHandler extends MessageHandler {
  constructor() {
    super('error', { timeout: 1000, maxRetries: 3 });
    this.attemptCounts = [];
  }

  async process(message) {
    this.attemptCounts.push(message.attemptCount);
    if (message.attemptCount < 3) {
      throw new Error('Simulated transient error');
    }
    return { recovered: true };
  }

  async onError(error, message) {
    // Retry on our simulated error
    return error.message.includes('Simulated');
  }
}

class PermanentErrorHandler extends MessageHandler {
  constructor() {
    super('permanent-error', { timeout: 1000 });
  }

  async process(message) {
    throw new Error('Permanent error');
  }

  async onError(error, message) {
    // Never retry
    return false;
  }
}

describe('WorkBuffer Integration Tests', () => {
  let buffer;
  let store;
  let dlq;

  beforeAll(async () => {
    // Connect to test database
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/petbuddy-test';
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear collections
    await BufferMessage.deleteMany({});

    store = new BufferStore();
    dlq = new DeadLetterQueue();

    buffer = new WorkBuffer({
      config: {
        concurrency: 5,
        maxRetries: 5,
        pollInterval: 50,
        metricsEnabled: false,
      },
      store,
    });
  });

  afterEach(async () => {
    if (buffer.isRunning) {
      await buffer.stop({ drain: false });
    }
  });

  describe('Basic message flow', () => {
    it('should enqueue and process a message end-to-end', async () => {
      const handler = new EchoHandler();
      buffer.registerHandler(handler);

      await buffer.start();

      const result = await buffer.enqueue({
        type: 'echo',
        payload: { text: 'Hello, World!' },
        priority: 'NORMAL',
      });

      expect(result.messageId).toBeDefined();

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(handler.processedMessages).toHaveLength(1);
      expect(handler.processedMessages[0].payload.text).toBe('Hello, World!');

      // Verify in database
      const message = await BufferMessage.findOne({ messageId: result.messageId });
      expect(message.state).toBe(MESSAGE_STATE.COMPLETED);
    });

    it('should process multiple messages concurrently', async () => {
      const handler = new EchoHandler();
      buffer.registerHandler(handler);

      await buffer.start();

      // Enqueue 10 messages
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          buffer.enqueue({
            type: 'echo',
            payload: { index: i },
            priority: 'NORMAL',
          })
        );
      }

      await Promise.all(promises);

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(handler.processedMessages).toHaveLength(10);

      // Verify all completed
      const stats = await store.getStats();
      expect(stats.completed).toBe(10);
      expect(stats.pending).toBe(0);
    });

    it('should respect priority ordering', async () => {
      const handler = new SlowHandler();
      buffer.registerHandler(handler);

      // Don't start buffer yet - queue messages first
      const messages = [];

      messages.push(
        await buffer.enqueue({
          type: 'slow',
          payload: { priority: 'low' },
          priority: PRIORITY.LOW,
        })
      );

      messages.push(
        await buffer.enqueue({
          type: 'slow',
          payload: { priority: 'critical' },
          priority: PRIORITY.CRITICAL,
        })
      );

      messages.push(
        await buffer.enqueue({
          type: 'slow',
          payload: { priority: 'high' },
          priority: PRIORITY.HIGH,
        })
      );

      // Now start processing
      await buffer.start();

      // Wait for all to complete
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Verify processing order by checking completion times
      const critical = await BufferMessage.findOne({ messageId: messages[1].messageId });
      const high = await BufferMessage.findOne({ messageId: messages[2].messageId });
      const low = await BufferMessage.findOne({ messageId: messages[0].messageId });

      // Critical should complete before low
      expect(critical.completedAt.getTime()).toBeLessThan(low.completedAt.getTime());
      // High should complete before low
      expect(high.completedAt.getTime()).toBeLessThan(low.completedAt.getTime());
    });
  });

  describe('Idempotency', () => {
    it('should reject duplicate idempotency keys', async () => {
      const handler = new EchoHandler();
      buffer.registerHandler(handler);

      await buffer.start();

      const first = await buffer.enqueue({
        type: 'echo',
        payload: { data: 'first' },
        idempotencyKey: 'unique-key-123',
      });

      // Try to enqueue duplicate
      const second = await buffer.enqueue({
        type: 'echo',
        payload: { data: 'second' },
        idempotencyKey: 'unique-key-123',
      });

      expect(second.duplicate).toBe(true);
      expect(second.messageId).toBe(first.messageId);

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Should only process once
      expect(handler.processedMessages).toHaveLength(1);
    });
  });

  describe('Retry logic', () => {
    it('should retry failed messages with backoff', async () => {
      const handler = new ErrorHandler();
      buffer.registerHandler(handler);

      await buffer.start();

      const result = await buffer.enqueue({
        type: 'error',
        payload: { data: 'test' },
      });

      // Wait for retries
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Should have attempted 3 times and then succeeded
      expect(handler.attemptCounts.length).toBeGreaterThanOrEqual(3);

      // Verify final state
      const message = await BufferMessage.findOne({ messageId: result.messageId });
      expect(message.state).toBe(MESSAGE_STATE.COMPLETED);
    }, 10000);

    it('should move to DLQ after max retries', async () => {
      const handler = new PermanentErrorHandler();
      buffer.registerHandler(handler);

      await buffer.start();

      const result = await buffer.enqueue({
        type: 'permanent-error',
        payload: { data: 'test' },
        maxRetries: 2,
      });

      // Wait for retries and DLQ
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Verify in DLQ
      const message = await BufferMessage.findOne({ messageId: result.messageId });
      expect(message.state).toBe(MESSAGE_STATE.DLQ);

      // Verify via DLQ interface
      const dlqCount = await dlq.count();
      expect(dlqCount).toBe(1);

      const dlqMessages = await dlq.list();
      expect(dlqMessages).toHaveLength(1);
      expect(dlqMessages[0].messageId).toBe(result.messageId);
    }, 10000);
  });

  describe('Dead Letter Queue', () => {
    it('should retry messages from DLQ', async () => {
      const handler = new ErrorHandler();
      buffer.registerHandler(handler);

      await buffer.start();

      // Create a message that will go to DLQ
      const dlqHandler = new PermanentErrorHandler();
      buffer.registerHandler(dlqHandler);

      const result = await buffer.enqueue({
        type: 'permanent-error',
        payload: { data: 'test' },
        maxRetries: 1,
      });

      // Wait for DLQ
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Verify in DLQ
      let message = await BufferMessage.findOne({ messageId: result.messageId });
      expect(message.state).toBe(MESSAGE_STATE.DLQ);

      // Retry from DLQ (but change type to working handler)
      await dlq.retry(result.messageId, {
        resetAttempts: true,
        maxRetries: 5,
      });

      // Manually change type for testing
      await BufferMessage.updateOne(
        { messageId: result.messageId },
        { type: 'error' }
      );

      // Wait for reprocessing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Should now be completed
      message = await BufferMessage.findOne({ messageId: result.messageId });
      expect(message.state).toBe(MESSAGE_STATE.COMPLETED);
    }, 10000);

    it('should delete messages from DLQ', async () => {
      // Manually create a DLQ message
      const message = new BufferMessage({
        messageId: 'dlq-test',
        type: 'test',
        state: MESSAGE_STATE.DLQ,
        payload: { data: 'test' },
        priority: 2,
        attemptCount: 5,
        maxRetries: 5,
      });
      await message.save();

      const deleted = await dlq.delete('dlq-test');
      expect(deleted).toBe(true);

      const found = await BufferMessage.findOne({ messageId: 'dlq-test' });
      expect(found).toBeNull();
    });

    it('should get DLQ statistics', async () => {
      // Create some DLQ messages
      for (let i = 0; i < 5; i++) {
        const message = new BufferMessage({
          messageId: `dlq-${i}`,
          type: i < 3 ? 'type-a' : 'type-b',
          state: MESSAGE_STATE.DLQ,
          payload: { data: `test-${i}` },
          priority: 2,
          attemptCount: 5,
          maxRetries: 5,
        });
        await message.save();
      }

      const stats = await dlq.getStats();
      expect(stats.total).toBe(5);
      expect(stats.byType['type-a']).toBe(3);
      expect(stats.byType['type-b']).toBe(2);
    });
  });

  describe('Graceful shutdown', () => {
    it('should wait for in-flight messages on drain', async () => {
      const handler = new SlowHandler();
      buffer.registerHandler(handler);

      await buffer.start();

      // Enqueue messages
      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(
          buffer.enqueue({
            type: 'slow',
            payload: { index: i },
          })
        );
      }

      await Promise.all(promises);

      // Wait for processing to start
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Stop with drain
      await buffer.stop({ drain: true, timeout: 5000 });

      // All messages should be completed
      const stats = await store.getStats();
      expect(stats.completed).toBe(3);
      expect(stats.processing).toBe(0);
    }, 10000);
  });

  describe('Metrics', () => {
    it('should emit metrics events', async () => {
      const handler = new EchoHandler();
      buffer.registerHandler(handler);

      const metricsEvents = [];
      buffer.on('metrics', (data) => metricsEvents.push(data));

      // Enable metrics
      buffer.config.metricsEnabled = true;

      await buffer.start();

      // Enqueue some messages
      for (let i = 0; i < 5; i++) {
        await buffer.enqueue({
          type: 'echo',
          payload: { index: i },
        });
      }

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 500));

      const stats = await buffer.getStats();
      expect(stats.metrics.enqueued).toBeGreaterThan(0);
      expect(stats.metrics.completed).toBeGreaterThan(0);
    });
  });
});
