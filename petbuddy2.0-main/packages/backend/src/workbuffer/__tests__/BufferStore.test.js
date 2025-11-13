/**
 * BufferStore unit tests
 */

import { BufferStore } from '../storage/BufferStore.js';
import BufferMessage from '../models/BufferMessage.js';
import { MESSAGE_STATE, ERROR_CODES } from '../config/bufferConfig.js';

// Mock dependencies
jest.mock('../models/BufferMessage.js');
jest.mock('../../utils/logger.js', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

describe('BufferStore', () => {
  let store;

  beforeEach(() => {
    jest.clearAllMocks();
    store = new BufferStore();
  });

  describe('create', () => {
    it('should create a new message', async () => {
      const mockSave = jest.fn().mockResolvedValue(true);
      const mockMessage = {
        messageId: 'test-id',
        type: 'test',
        save: mockSave,
      };

      BufferMessage.mockImplementation(() => mockMessage);
      BufferMessage.findOne = jest.fn().mockResolvedValue(null);

      const result = await store.create({
        type: 'test',
        payload: { data: 'test' },
        priority: 1,
      });

      expect(result.messageId).toBe('test-id');
      expect(result.type).toBe('test');
      expect(mockSave).toHaveBeenCalled();
    });

    it('should reject duplicate idempotency keys', async () => {
      BufferMessage.findOne = jest.fn().mockResolvedValue({
        messageId: 'existing-id',
        idempotencyKey: 'duplicate-key',
      });

      await expect(
        store.create({
          type: 'test',
          payload: { data: 'test' },
          idempotencyKey: 'duplicate-key',
        })
      ).rejects.toThrow(ERROR_CODES.DUPLICATE_MESSAGE);
    });

    it('should handle duplicate message ID errors', async () => {
      const mockSave = jest.fn().mockRejectedValue({ code: 11000 });
      const mockMessage = {
        save: mockSave,
      };

      BufferMessage.mockImplementation(() => mockMessage);
      BufferMessage.findOne = jest.fn().mockResolvedValue(null);

      await expect(
        store.create({
          type: 'test',
          payload: { data: 'test' },
        })
      ).rejects.toThrow(ERROR_CODES.DUPLICATE_MESSAGE);
    });
  });

  describe('claimNextBatch', () => {
    it('should claim available messages atomically', async () => {
      const mockMessages = [
        { messageId: 'msg1', state: MESSAGE_STATE.PENDING },
        { messageId: 'msg2', state: MESSAGE_STATE.PENDING },
      ];

      BufferMessage.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockMessages),
      });

      BufferMessage.findOneAndUpdate = jest
        .fn()
        .mockResolvedValueOnce({ messageId: 'msg1', state: MESSAGE_STATE.PROCESSING })
        .mockResolvedValueOnce({ messageId: 'msg2', state: MESSAGE_STATE.PROCESSING });

      const result = await store.claimNextBatch(2, 'worker-1', 60000);

      expect(result).toHaveLength(2);
      expect(BufferMessage.findOneAndUpdate).toHaveBeenCalledTimes(2);
    });

    it('should handle race conditions gracefully', async () => {
      const mockMessages = [
        { messageId: 'msg1', state: MESSAGE_STATE.PENDING },
      ];

      BufferMessage.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockMessages),
      });

      // Simulate race condition - another worker claimed it
      BufferMessage.findOneAndUpdate = jest.fn().mockResolvedValue(null);

      const result = await store.claimNextBatch(1, 'worker-1', 60000);

      expect(result).toHaveLength(0);
    });
  });

  describe('markCompleted', () => {
    it('should mark message as completed', async () => {
      const mockSave = jest.fn().mockResolvedValue(true);
      const mockMessage = {
        messageId: 'test-id',
        type: 'test',
        state: MESSAGE_STATE.PROCESSING,
        processingStartedAt: new Date(),
        markCompleted: jest.fn(),
        save: mockSave,
      };

      BufferMessage.findOne = jest.fn().mockResolvedValue(mockMessage);

      const result = await store.markCompleted('test-id', { success: true });

      expect(mockMessage.markCompleted).toHaveBeenCalledWith({ success: true });
      expect(mockSave).toHaveBeenCalled();
    });

    it('should return null for non-existent message', async () => {
      BufferMessage.findOne = jest.fn().mockResolvedValue(null);

      const result = await store.markCompleted('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('markFailed', () => {
    it('should mark message as failed and schedule retry', async () => {
      const mockSave = jest.fn().mockResolvedValue(true);
      const mockMessage = {
        messageId: 'test-id',
        type: 'test',
        attemptCount: 1,
        maxRetries: 5,
        markFailed: jest.fn().mockReturnValue(true), // will retry
        save: mockSave,
      };

      BufferMessage.findOne = jest.fn().mockResolvedValue(mockMessage);

      const error = new Error('Test error');
      const result = await store.markFailed('test-id', error, 5000);

      expect(result.willRetry).toBe(true);
      expect(mockMessage.markFailed).toHaveBeenCalledWith(error, 5000);
      expect(mockSave).toHaveBeenCalled();
    });

    it('should not retry after max attempts', async () => {
      const mockSave = jest.fn().mockResolvedValue(true);
      const mockMessage = {
        messageId: 'test-id',
        type: 'test',
        attemptCount: 5,
        maxRetries: 5,
        markFailed: jest.fn().mockReturnValue(false), // won't retry
        save: mockSave,
      };

      BufferMessage.findOne = jest.fn().mockResolvedValue(mockMessage);

      const error = new Error('Test error');
      const result = await store.markFailed('test-id', error, 5000);

      expect(result.willRetry).toBe(false);
    });
  });

  describe('moveToDLQ', () => {
    it('should move message to DLQ', async () => {
      const mockSave = jest.fn().mockResolvedValue(true);
      const mockMessage = {
        messageId: 'test-id',
        type: 'test',
        moveToDLQ: jest.fn(),
        save: mockSave,
      };

      BufferMessage.findOne = jest.fn().mockResolvedValue(mockMessage);

      const result = await store.moveToDLQ('test-id', 'Max retries exceeded');

      expect(mockMessage.moveToDLQ).toHaveBeenCalledWith('Max retries exceeded');
      expect(mockSave).toHaveBeenCalled();
    });
  });

  describe('releaseStuckMessages', () => {
    it('should release stuck messages', async () => {
      const stuckMessages = [
        { messageId: 'stuck1' },
        { messageId: 'stuck2' },
      ];

      BufferMessage.findStuckMessages = jest.fn().mockResolvedValue(stuckMessages);

      // Mock findOne for each stuck message
      let callCount = 0;
      BufferMessage.findOne = jest.fn().mockImplementation(() => {
        const msg = stuckMessages[callCount++];
        return Promise.resolve({
          ...msg,
          attemptCount: 1,
          maxRetries: 5,
          markFailed: jest.fn().mockReturnValue(true),
          save: jest.fn().mockResolvedValue(true),
        });
      });

      const released = await store.releaseStuckMessages(60000);

      expect(released).toBe(2);
      expect(BufferMessage.findStuckMessages).toHaveBeenCalledWith(60000);
    });
  });

  describe('getStats', () => {
    it('should return queue statistics', async () => {
      const mockStats = {
        pending: 10,
        processing: 5,
        completed: 100,
        failed: 2,
        dlq: 1,
        total: 118,
      };

      BufferMessage.getStats = jest.fn().mockResolvedValue(mockStats);

      const result = await store.getStats();

      expect(result).toEqual(mockStats);
      expect(BufferMessage.getStats).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should clean up old messages', async () => {
      BufferMessage.cleanup = jest.fn().mockResolvedValue(42);

      const deletedCount = await store.cleanup(86400000);

      expect(deletedCount).toBe(42);
      expect(BufferMessage.cleanup).toHaveBeenCalledWith(86400000);
    });
  });
});
