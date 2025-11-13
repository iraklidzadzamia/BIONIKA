/**
 * Work Buffer Unit Tests
 */

import { jest } from '@jest/globals';
import { WorkBuffer } from '../workbuffer/core/WorkBuffer.js';
import { MessageHandler } from '../workbuffer/handlers/MessageHandler.js';
import { BufferStore } from '../workbuffer/storage/BufferStore.js';
import { MESSAGE_STATE, PRIORITY } from '../workbuffer/config/bufferConfig.js';

// Mock logger
jest.mock('../utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('WorkBuffer', () => {
  let workBuffer;
  let store;

  beforeEach(() => {
    store = {
      create: jest.fn(),
      claimNextBatch: jest.fn().mockResolvedValue([]),
      markCompleted: jest.fn(),
      markFailed: jest.fn(),
      moveToDLQ: jest.fn(),
      getStats: jest.fn().mockResolvedValue({
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
      }),
      releaseStuckMessages: jest.fn().mockResolvedValue(0),
      cleanup: jest.fn().mockResolvedValue(0),
    };

    workBuffer = new WorkBuffer({
      config: {
        concurrency: 2,
        maxRetries: 3,
        maxQueueSize: 100,
        pollInterval: 50,
        metricsEnabled: false,
      },
      store,
    });
  });

  afterEach(async () => {
    if (workBuffer.isRunning) {
      await workBuffer.stop({ drain: false });
    }
  });

  describe('enqueue', () => {
    it('should enqueue a message successfully', async () => {
      const mockMessage = {
        messageId: 'test-123',
        type: 'test',
        state: MESSAGE_STATE.PENDING,
      };
      store.create.mockResolvedValue(mockMessage);

      const result = await workBuffer.enqueue({
        type: 'test',
        payload: { data: 'test' },
      });

      expect(result.messageId).toBe('test-123');
      expect(store.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'test',
          payload: { data: 'test' },
        })
      );
    });

    it('should reject enqueue when shutting down', async () => {
      workBuffer.isShuttingDown = true;

      await expect(
        workBuffer.enqueue({ type: 'test', payload: {} })
      ).rejects.toThrow('SHUTDOWN_IN_PROGRESS');
    });

    it('should reject enqueue when queue is full', async () => {
      store.getStats.mockResolvedValue({ pending: 101 });

      await expect(
        workBuffer.enqueue({ type: 'test', payload: {} })
      ).rejects.toThrow('QUEUE_FULL');
    });

    it('should handle duplicate messages with idempotency', async () => {
      const error = new Error('DUPLICATE_MESSAGE');
      store.create.mockRejectedValue(error);
      store.findByIdempotencyKey = jest.fn().mockResolvedValue({
        messageId: 'existing-123',
        type: 'test',
        state: MESSAGE_STATE.PENDING,
      });

      const result = await workBuffer.enqueue({
        type: 'test',
        payload: {},
        idempotencyKey: 'unique-key',
      });

      expect(result.duplicate).toBe(true);
      expect(result.messageId).toBe('existing-123');
    });
  });

  describe('start and stop', () => {
    it('should start and stop gracefully', async () => {
      await workBuffer.start();
      expect(workBuffer.isRunning).toBe(true);

      await workBuffer.stop();
      expect(workBuffer.isRunning).toBe(false);
    });

    it('should not start twice', async () => {
      await workBuffer.start();
      await workBuffer.start(); // Should warn but not fail
      expect(workBuffer.isRunning).toBe(true);
      await workBuffer.stop();
    });
  });

  describe('message processing', () => {
    class TestHandler extends MessageHandler {
      constructor(shouldFail = false) {
        super('test-handler', { timeout: 1000 });
        this.shouldFail = shouldFail;
        this.processedMessages = [];
      }

      async process(message) {
        this.processedMessages.push(message);
        if (this.shouldFail) {
          throw new Error('Handler failed');
        }
        return { success: true };
      }
    }

    it('should process a message successfully', async () => {
      const handler = new TestHandler(false);
      workBuffer.registerHandler(handler);

      const mockMessage = {
        messageId: 'test-123',
        type: 'test-handler',
        payload: { data: 'test' },
        attemptCount: 1,
      };

      store.claimNextBatch.mockResolvedValueOnce([mockMessage]);
      store.markCompleted.mockResolvedValue(mockMessage);

      await workBuffer.start();
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(handler.processedMessages.length).toBe(1);
      expect(store.markCompleted).toHaveBeenCalledWith('test-123', { success: true });

      await workBuffer.stop();
    });

    it('should retry failed messages', async () => {
      const handler = new TestHandler(true);
      workBuffer.registerHandler(handler);

      const mockMessage = {
        messageId: 'test-123',
        type: 'test-handler',
        payload: { data: 'test' },
        attemptCount: 1,
        maxRetries: 3,
      };

      store.claimNextBatch.mockResolvedValueOnce([mockMessage]);
      store.markFailed.mockResolvedValue({ willRetry: true, message: mockMessage });

      await workBuffer.start();
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(store.markFailed).toHaveBeenCalled();
      expect(store.markCompleted).not.toHaveBeenCalled();

      await workBuffer.stop();
    });
  });

  describe('getStats', () => {
    it('should return buffer statistics', async () => {
      const stats = await workBuffer.getStats();

      expect(stats).toHaveProperty('pending');
      expect(stats).toHaveProperty('processing');
      expect(stats).toHaveProperty('completed');
      expect(stats).toHaveProperty('activeWorkers');
      expect(stats).toHaveProperty('isRunning');
    });
  });
});

describe('MessageHandler', () => {
  class TestHandler extends MessageHandler {
    constructor() {
      super('test', { timeout: 5000 });
    }

    async process(message) {
      return { processed: true };
    }
  }

  it('should create handler with correct properties', () => {
    const handler = new TestHandler();

    expect(handler.type).toBe('test');
    expect(handler.timeout).toBe(5000);
    expect(handler.idempotent).toBe(true);
  });

  it('should throw if process not implemented', async () => {
    const handler = new MessageHandler('test');

    await expect(handler.process({})).rejects.toThrow('must implement process()');
  });

  it('should validate payload', async () => {
    const handler = new TestHandler();
    const result = await handler.validate({ data: 'test' });
    expect(result).toBe(true);
  });

  it('should handle error with default behavior', async () => {
    const handler = new TestHandler();
    const error = new Error('Test error');
    error.code = 'ETIMEDOUT';

    const shouldRetry = await handler.onError(error, {});
    expect(shouldRetry).toBe(true);
  });
});

describe('Priority Handling', () => {
  it('should normalize priority correctly', () => {
    expect(PRIORITY.CRITICAL).toBe(0);
    expect(PRIORITY.HIGH).toBe(1);
    expect(PRIORITY.NORMAL).toBe(2);
    expect(PRIORITY.LOW).toBe(3);
  });
});
