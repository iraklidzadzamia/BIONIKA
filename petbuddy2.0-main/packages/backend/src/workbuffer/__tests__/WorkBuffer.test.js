/**
 * WorkBuffer integration tests
 */

import { WorkBuffer } from '../core/WorkBuffer.js';
import { MessageHandler } from '../handlers/MessageHandler.js';
import { BufferStore } from '../storage/BufferStore.js';
import { MessageProcessor } from '../core/MessageProcessor.js';
import { PRIORITY, MESSAGE_STATE } from '../config/bufferConfig.js';

// Mock dependencies
jest.mock('../../utils/logger.js', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// Test handler
class TestHandler extends MessageHandler {
  constructor(processingTime = 10) {
    super('test', { timeout: 5000 });
    this.processingTime = processingTime;
    this.processedMessages = [];
  }

  async process(message, context) {
    await new Promise((resolve) => setTimeout(resolve, this.processingTime));
    this.processedMessages.push(message);
    return { success: true };
  }
}

// Failing handler
class FailingHandler extends MessageHandler {
  constructor() {
    super('failing', { timeout: 5000 });
    this.attemptCounts = [];
  }

  async process(message, context) {
    this.attemptCounts.push(message.attemptCount);
    throw new Error('Simulated failure');
  }
}

describe('WorkBuffer', () => {
  let buffer;
  let mockStore;
  let mockProcessor;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock store
    mockStore = {
      create: jest.fn(),
      claimNextBatch: jest.fn().mockResolvedValue([]),
      markCompleted: jest.fn().mockResolvedValue({}),
      markFailed: jest.fn().mockResolvedValue({ willRetry: false }),
      moveToDLQ: jest.fn().mockResolvedValue({}),
      releaseStuckMessages: jest.fn().mockResolvedValue(0),
      getStats: jest.fn().mockResolvedValue({
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        dlq: 0,
        total: 0,
      }),
      cleanup: jest.fn().mockResolvedValue(0),
    };

    // Mock processor
    mockProcessor = new MessageProcessor({ config: {} });

    buffer = new WorkBuffer({
      config: {
        concurrency: 2,
        pollInterval: 50,
        metricsEnabled: false,
      },
      store: mockStore,
      processor: mockProcessor,
    });
  });

  afterEach(async () => {
    if (buffer.isRunning) {
      await buffer.stop({ drain: false });
    }
  });

  describe('start/stop', () => {
    it('should start and stop cleanly', async () => {
      await buffer.start();
      expect(buffer.isRunning).toBe(true);

      await buffer.stop();
      expect(buffer.isRunning).toBe(false);
    });

    it('should not start twice', async () => {
      await buffer.start();
      await buffer.start(); // Should be no-op
      expect(buffer.isRunning).toBe(true);
    });

    it('should drain workers on stop', async () => {
      const handler = new TestHandler(100);
      buffer.registerHandler(handler);

      // Mock a message being claimed
      mockStore.claimNextBatch = jest.fn().mockResolvedValueOnce([
        {
          messageId: 'test-1',
          type: 'test',
          payload: { data: 'test' },
          attemptCount: 1,
        },
      ]).mockResolvedValue([]);

      await buffer.start();

      // Wait for message to be claimed
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Stop should wait for processing
      await buffer.stop({ drain: true, timeout: 500 });

      expect(handler.processedMessages).toHaveLength(1);
    });
  });

  describe('enqueue', () => {
    it('should enqueue a message successfully', async () => {
      const mockMessage = {
        messageId: 'test-id',
        type: 'test',
        state: MESSAGE_STATE.PENDING,
        payload: { data: 'test' },
      };

      mockStore.create.mockResolvedValue(mockMessage);
      mockStore.getStats.mockResolvedValue({
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        dlq: 0,
        total: 0,
      });

      const result = await buffer.enqueue({
        type: 'test',
        payload: { data: 'test' },
        priority: 'HIGH',
      });

      expect(result.messageId).toBe('test-id');
      expect(mockStore.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'test',
          payload: { data: 'test' },
          priority: PRIORITY.HIGH,
        })
      );
    });

    it('should reject enqueue when shutting down', async () => {
      buffer.isShuttingDown = true;

      await expect(
        buffer.enqueue({
          type: 'test',
          payload: { data: 'test' },
        })
      ).rejects.toThrow('SHUTDOWN_IN_PROGRESS');
    });

    it('should reject enqueue when queue is full', async () => {
      mockStore.getStats.mockResolvedValue({
        pending: 10001,
        processing: 0,
        completed: 0,
        failed: 0,
        dlq: 0,
        total: 10001,
      });

      await expect(
        buffer.enqueue({
          type: 'test',
          payload: { data: 'test' },
        })
      ).rejects.toThrow('QUEUE_FULL');
    });

    it('should handle duplicate messages', async () => {
      const duplicateError = new Error('DUPLICATE_MESSAGE');
      mockStore.create.mockRejectedValue(duplicateError);
      mockStore.findByIdempotencyKey = jest.fn().mockResolvedValue({
        messageId: 'existing-id',
        type: 'test',
        state: MESSAGE_STATE.COMPLETED,
      });

      const result = await buffer.enqueue({
        type: 'test',
        payload: { data: 'test' },
        idempotencyKey: 'duplicate-key',
      });

      expect(result.messageId).toBe('existing-id');
      expect(result.duplicate).toBe(true);
    });
  });

  describe('message processing', () => {
    it('should process messages successfully', async () => {
      const handler = new TestHandler();
      buffer.registerHandler(handler);

      mockStore.claimNextBatch = jest.fn()
        .mockResolvedValueOnce([
          {
            messageId: 'test-1',
            type: 'test',
            payload: { data: 'test' },
            attemptCount: 1,
          },
        ])
        .mockResolvedValue([]);

      await buffer.start();

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(handler.processedMessages).toHaveLength(1);
      expect(mockStore.markCompleted).toHaveBeenCalledWith(
        'test-1',
        expect.objectContaining({ success: true })
      );

      await buffer.stop({ drain: false });
    });

    it('should retry failed messages', async () => {
      const handler = new FailingHandler();
      buffer.registerHandler(handler);

      mockStore.claimNextBatch = jest.fn()
        .mockResolvedValueOnce([
          {
            messageId: 'test-1',
            type: 'failing',
            payload: { data: 'test' },
            attemptCount: 1,
            maxRetries: 3,
          },
        ])
        .mockResolvedValue([]);

      mockStore.markFailed.mockResolvedValue({ willRetry: true });

      await buffer.start();

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(handler.attemptCounts).toContain(1);
      expect(mockStore.markFailed).toHaveBeenCalledWith(
        'test-1',
        expect.any(Error),
        expect.any(Number)
      );

      await buffer.stop({ drain: false });
    });

    it('should move to DLQ after max retries', async () => {
      const handler = new FailingHandler();
      buffer.registerHandler(handler);

      mockStore.claimNextBatch = jest.fn()
        .mockResolvedValueOnce([
          {
            messageId: 'test-1',
            type: 'failing',
            payload: { data: 'test' },
            attemptCount: 5,
            maxRetries: 5,
          },
        ])
        .mockResolvedValue([]);

      mockStore.markFailed.mockResolvedValue({ willRetry: false });

      await buffer.start();

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockStore.moveToDLQ).toHaveBeenCalledWith(
        'test-1',
        expect.stringContaining('Max retries')
      );

      await buffer.stop({ drain: false });
    });

    it('should respect concurrency limit', async () => {
      const handler = new TestHandler(200); // Slow processing
      buffer.registerHandler(handler);

      // Queue multiple messages
      mockStore.claimNextBatch = jest.fn()
        .mockResolvedValueOnce([
          {
            messageId: 'test-1',
            type: 'test',
            payload: { data: 'test1' },
            attemptCount: 1,
          },
          {
            messageId: 'test-2',
            type: 'test',
            payload: { data: 'test2' },
            attemptCount: 1,
          },
        ])
        .mockResolvedValueOnce([
          {
            messageId: 'test-3',
            type: 'test',
            payload: { data: 'test3' },
            attemptCount: 1,
          },
        ])
        .mockResolvedValue([]);

      await buffer.start();

      // Check concurrency immediately after starting
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should have 2 workers (concurrency limit)
      expect(buffer.workers.size).toBeLessThanOrEqual(2);

      await buffer.stop({ drain: true, timeout: 1000 });
    });
  });

  describe('events', () => {
    it('should emit enqueued event', async () => {
      const enqueuedSpy = jest.fn();
      buffer.on('enqueued', enqueuedSpy);

      mockStore.create.mockResolvedValue({
        messageId: 'test-id',
        type: 'test',
        state: MESSAGE_STATE.PENDING,
      });

      mockStore.getStats.mockResolvedValue({ pending: 0 });

      await buffer.enqueue({
        type: 'test',
        payload: { data: 'test' },
      });

      expect(enqueuedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          messageId: 'test-id',
          type: 'test',
        })
      );
    });

    it('should emit completed event', async () => {
      const completedSpy = jest.fn();
      buffer.on('completed', completedSpy);

      const handler = new TestHandler();
      buffer.registerHandler(handler);

      mockStore.claimNextBatch = jest.fn()
        .mockResolvedValueOnce([
          {
            messageId: 'test-1',
            type: 'test',
            payload: { data: 'test' },
            attemptCount: 1,
          },
        ])
        .mockResolvedValue([]);

      await buffer.start();
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(completedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          messageId: 'test-1',
          type: 'test',
        })
      );

      await buffer.stop({ drain: false });
    });

    it('should emit failed event', async () => {
      const failedSpy = jest.fn();
      buffer.on('failed', failedSpy);

      const handler = new FailingHandler();
      buffer.registerHandler(handler);

      mockStore.claimNextBatch = jest.fn()
        .mockResolvedValueOnce([
          {
            messageId: 'test-1',
            type: 'failing',
            payload: { data: 'test' },
            attemptCount: 1,
            maxRetries: 3,
          },
        ])
        .mockResolvedValue([]);

      mockStore.markFailed.mockResolvedValue({ willRetry: true });

      await buffer.start();
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(failedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          messageId: 'test-1',
          type: 'failing',
          willRetry: true,
        })
      );

      await buffer.stop({ drain: false });
    });
  });

  describe('getStats', () => {
    it('should return buffer statistics', async () => {
      mockStore.getStats.mockResolvedValue({
        pending: 10,
        processing: 2,
        completed: 100,
        failed: 5,
        dlq: 1,
        total: 118,
      });

      const stats = await buffer.getStats();

      expect(stats.pending).toBe(10);
      expect(stats.processing).toBe(2);
      expect(stats.activeWorkers).toBe(0);
      expect(stats.isRunning).toBe(false);
    });
  });
});
