/**
 * Tests for Simple Buffer Manager
 */

import { jest } from '@jest/globals';
import { ConversationBufferManager } from '../bufferManager.js';

// Mock logger
jest.mock('../../utils/logger.js', () => ({
  default: {
    messageFlow: {
      processing: jest.fn(),
    },
  },
}));

describe('ConversationBufferManager', () => {
  let bufferManager;
  let mockFlushCallback;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    bufferManager = new ConversationBufferManager('test-platform');
    mockFlushCallback = jest.fn();
  });

  afterEach(() => {
    bufferManager.clear();
    jest.useRealTimers();
  });

  describe('Basic Functionality', () => {
    test('should create buffer on first message', () => {
      bufferManager.addMessage('user-123', {
        customer: { id: 'cust-1' },
        company: { id: 'comp-1' },
        delayMs: 1000,
        messageText: 'Hello',
        onFlush: mockFlushCallback,
      });

      expect(bufferManager.size()).toBe(1);
      expect(mockFlushCallback).not.toHaveBeenCalled();
    });

    test('should call onFlush after delay expires with combined text', () => {
      const customer = { id: 'cust-1' };
      const company = { id: 'comp-1' };

      bufferManager.addMessage('user-123', {
        customer,
        company,
        delayMs: 1000,
        messageText: 'Hello world',
        onFlush: mockFlushCallback,
      });

      // Fast-forward time
      jest.advanceTimersByTime(1000);

      expect(mockFlushCallback).toHaveBeenCalledWith(customer, company, 'Hello world', []);
      expect(bufferManager.size()).toBe(0); // Buffer should be cleaned up
    });

    test('should reset timer on subsequent messages and accumulate text', () => {
      const customer = { id: 'cust-1' };
      const company = { id: 'comp-1' };

      // First message
      bufferManager.addMessage('user-123', {
        customer,
        company,
        delayMs: 1000,
        messageText: 'I want to',
        onFlush: mockFlushCallback,
      });

      // Wait 500ms
      jest.advanceTimersByTime(500);

      // Second message (should reset timer and accumulate text)
      bufferManager.addMessage('user-123', {
        customer,
        company,
        delayMs: 1000,
        messageText: 'book an',
        onFlush: mockFlushCallback,
      });

      // Wait another 500ms (total 1000ms from start, but only 500ms from second message)
      jest.advanceTimersByTime(500);

      // Callback should NOT have been called yet
      expect(mockFlushCallback).not.toHaveBeenCalled();

      // Third message
      bufferManager.addMessage('user-123', {
        customer,
        company,
        delayMs: 1000,
        messageText: 'appointment',
        onFlush: mockFlushCallback,
      });

      // Wait 1000ms (now 1000ms from third message)
      jest.advanceTimersByTime(1000);

      // Now callback should be called with combined text
      expect(mockFlushCallback).toHaveBeenCalledTimes(1);
      expect(mockFlushCallback).toHaveBeenCalledWith(
        customer,
        company,
        'I want to book an appointment',
        []
      );
    });

    test('should accumulate images', () => {
      const customer = { id: 'cust-1' };
      const company = { id: 'comp-1' };

      // First message with image
      bufferManager.addMessage('user-123', {
        customer,
        company,
        delayMs: 1000,
        messageText: 'Look at this',
        imageUrl: 'https://example.com/image1.jpg',
        onFlush: mockFlushCallback,
      });

      jest.advanceTimersByTime(500);

      // Second message with another image
      bufferManager.addMessage('user-123', {
        customer,
        company,
        delayMs: 1000,
        messageText: 'and this',
        imageUrl: 'https://example.com/image2.jpg',
        onFlush: mockFlushCallback,
      });

      jest.advanceTimersByTime(1000);

      // Should accumulate both texts and images
      expect(mockFlushCallback).toHaveBeenCalledWith(
        customer,
        company,
        'Look at this and this',
        ['https://example.com/image1.jpg', 'https://example.com/image2.jpg']
      );
    });
  });

  describe('Multiple Users', () => {
    test('should handle multiple users independently', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      bufferManager.addMessage('user-1', {
        customer: { id: 'cust-1' },
        company: { id: 'comp-1' },
        delayMs: 1000,
        messageText: 'User 1 message',
        onFlush: callback1,
      });

      bufferManager.addMessage('user-2', {
        customer: { id: 'cust-2' },
        company: { id: 'comp-1' },
        delayMs: 2000,
        messageText: 'User 2 message',
        onFlush: callback2,
      });

      expect(bufferManager.size()).toBe(2);

      // Advance 1000ms - user-1's timer expires
      jest.advanceTimersByTime(1000);
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).not.toHaveBeenCalled();
      expect(bufferManager.size()).toBe(1);

      // Advance another 1000ms - user-2's timer expires
      jest.advanceTimersByTime(1000);
      expect(callback2).toHaveBeenCalledTimes(1);
      expect(bufferManager.size()).toBe(0);
    });
  });

  describe('Cancellation', () => {
    test('should cancel buffer and prevent callback', () => {
      bufferManager.addMessage('user-123', {
        customer: { id: 'cust-1' },
        company: { id: 'comp-1' },
        delayMs: 1000,
        messageText: 'Test message',
        onFlush: mockFlushCallback,
      });

      // Cancel before timer expires
      bufferManager.cancel('user-123');

      // Advance time
      jest.advanceTimersByTime(1000);

      expect(mockFlushCallback).not.toHaveBeenCalled();
      expect(bufferManager.size()).toBe(0);
    });
  });

  describe('Cleanup', () => {
    test('should clear all buffers', () => {
      bufferManager.addMessage('user-1', {
        customer: { id: 'cust-1' },
        company: { id: 'comp-1' },
        delayMs: 1000,
        messageText: 'Message 1',
        onFlush: jest.fn(),
      });

      bufferManager.addMessage('user-2', {
        customer: { id: 'cust-2' },
        company: { id: 'comp-1' },
        delayMs: 1000,
        messageText: 'Message 2',
        onFlush: jest.fn(),
      });

      expect(bufferManager.size()).toBe(2);

      bufferManager.clear();

      expect(bufferManager.size()).toBe(0);
    });
  });

  describe('Real-World Scenarios', () => {
    test('should handle rapid messages (user typing fast) and accumulate all text', () => {
      const customer = { id: 'cust-1' };
      const company = { id: 'comp-1' };

      // User sends 5 messages rapidly
      const messages = ['I', 'want', 'to', 'book', 'appointment'];
      for (let i = 0; i < messages.length; i++) {
        bufferManager.addMessage('user-123', {
          customer,
          company,
          delayMs: 4000,
          messageText: messages[i],
          onFlush: mockFlushCallback,
        });
        jest.advanceTimersByTime(500); // 500ms between messages
      }

      // At this point, 2500ms have passed, but timer keeps resetting
      expect(mockFlushCallback).not.toHaveBeenCalled();

      // Now wait for full delay after last message
      jest.advanceTimersByTime(4000);

      // Should process only once with all messages combined
      expect(mockFlushCallback).toHaveBeenCalledTimes(1);
      expect(mockFlushCallback).toHaveBeenCalledWith(
        customer,
        company,
        'I want to book appointment',
        []
      );
      expect(bufferManager.size()).toBe(0);
    });

    test('should handle sentence-end detection (shorter delay)', () => {
      const customer = { id: 'cust-1' };
      const company = { id: 'comp-1' };

      // Message ends with period - shorter delay
      bufferManager.addMessage('user-123', {
        customer,
        company,
        delayMs: 1000, // Shorter delay for sentence end
        messageText: 'This is a complete sentence.',
        onFlush: mockFlushCallback,
      });

      jest.advanceTimersByTime(1000);

      expect(mockFlushCallback).toHaveBeenCalledTimes(1);
      expect(mockFlushCallback).toHaveBeenCalledWith(
        customer,
        company,
        'This is a complete sentence.',
        []
      );
    });
  });
});
