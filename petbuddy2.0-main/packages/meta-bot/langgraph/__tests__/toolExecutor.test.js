import { ToolCircuitBreaker } from '../nodes/toolExecutor.js';

// Mock logger
jest.mock('../../utils/logger.js', () => ({
  messageFlow: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('ToolCircuitBreaker', () => {
  let circuitBreaker;
  let mockLogger;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger = require('../../utils/logger.js').messageFlow;
    circuitBreaker = new ToolCircuitBreaker(3, 1000, 'testTool'); // 3 failures, 1 second recovery
  });

  describe('initial state', () => {
    it('should start in CLOSED state', () => {
      expect(circuitBreaker.state).toBe('CLOSED');
      expect(circuitBreaker.failures).toBe(0);
      expect(circuitBreaker.lastFailureTime).toBeNull();
    });
  });

  describe('successful operations', () => {
    it('should remain CLOSED after successful operation', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await circuitBreaker.execute(operation);

      expect(result).toBe('success');
      expect(circuitBreaker.state).toBe('CLOSED');
      expect(circuitBreaker.failures).toBe(0);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should reset failure count after success', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('fail1'))
        .mockRejectedValueOnce(new Error('fail2'))
        .mockResolvedValue('success');

      // First failure
      await expect(circuitBreaker.execute(operation)).rejects.toThrow('fail1');
      expect(circuitBreaker.failures).toBe(1);

      // Second failure
      await expect(circuitBreaker.execute(operation)).rejects.toThrow('fail2');
      expect(circuitBreaker.failures).toBe(2);

      // Success resets counter
      const result = await circuitBreaker.execute(operation);
      expect(result).toBe('success');
      expect(circuitBreaker.failures).toBe(0);
      expect(circuitBreaker.state).toBe('CLOSED');
    });

    it('should transition from HALF_OPEN to CLOSED on success', async () => {
      // Force circuit breaker to OPEN state
      circuitBreaker.failures = 3;
      circuitBreaker.state = 'OPEN';
      circuitBreaker.lastFailureTime = Date.now() - 2000; // 2 seconds ago

      // Wait for recovery timeout
      await new Promise(resolve => setTimeout(resolve, 100));

      const operation = jest.fn().mockResolvedValue('success');

      const result = await circuitBreaker.execute(operation);

      expect(result).toBe('success');
      expect(circuitBreaker.state).toBe('CLOSED');
      expect(circuitBreaker.failures).toBe(0);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'testTool',
        'Circuit breaker recovered - returning to CLOSED state'
      );
    });
  });

  describe('failed operations', () => {
    it('should increment failure count and remain CLOSED below threshold', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('operation failed'));

      await expect(circuitBreaker.execute(operation)).rejects.toThrow('operation failed');

      expect(circuitBreaker.failures).toBe(1);
      expect(circuitBreaker.state).toBe('CLOSED');
      expect(circuitBreaker.lastFailureTime).not.toBeNull();
    });

    it('should transition to OPEN state when failure threshold is reached', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('operation failed'));

      // Fail 3 times (threshold)
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(operation)).rejects.toThrow('operation failed');
      }

      expect(circuitBreaker.failures).toBe(3);
      expect(circuitBreaker.state).toBe('OPEN');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'testTool',
        'Circuit breaker OPEN after 3 failures'
      );
    });

    it('should reject requests when OPEN', async () => {
      // Force OPEN state
      circuitBreaker.failures = 3;
      circuitBreaker.state = 'OPEN';
      circuitBreaker.lastFailureTime = Date.now();

      const operation = jest.fn().mockResolvedValue('success');

      await expect(circuitBreaker.execute(operation)).rejects.toThrow(
        'Tool testTool is temporarily unavailable due to repeated failures'
      );

      expect(operation).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'testTool',
        expect.stringContaining('Circuit breaker OPEN - rejecting request')
      );
    });

    it('should transition to HALF_OPEN after recovery timeout', async () => {
      // Force OPEN state
      circuitBreaker.failures = 3;
      circuitBreaker.state = 'OPEN';
      circuitBreaker.lastFailureTime = Date.now() - 2000; // 2 seconds ago

      const operation = jest.fn().mockRejectedValue(new Error('still failing'));

      // Should transition to HALF_OPEN and allow the request
      await expect(circuitBreaker.execute(operation)).rejects.toThrow('still failing');

      expect(circuitBreaker.state).toBe('HALF_OPEN');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'testTool',
        'Circuit breaker entering HALF_OPEN state'
      );
    });
  });

  describe('getStatus', () => {
    it('should return current status information', () => {
      circuitBreaker.failures = 2;
      circuitBreaker.state = 'OPEN';
      circuitBreaker.lastFailureTime = 1234567890;

      const status = circuitBreaker.getStatus();

      expect(status).toEqual({
        state: 'OPEN',
        failures: 2,
        lastFailureTime: 1234567890,
        toolName: 'testTool',
      });
    });
  });

  describe('recovery behavior', () => {
    it('should remain OPEN until recovery timeout expires', async () => {
      // Force OPEN state
      circuitBreaker.failures = 3;
      circuitBreaker.state = 'OPEN';
      circuitBreaker.lastFailureTime = Date.now(); // Just failed

      const operation = jest.fn();

      await expect(circuitBreaker.execute(operation)).rejects.toThrow(
        'Tool testTool is temporarily unavailable due to repeated failures'
      );

      expect(operation).not.toHaveBeenCalled();
      expect(circuitBreaker.state).toBe('OPEN');
    });

    it('should recover after timeout and successful operation', async () => {
      // Force OPEN state
      circuitBreaker.failures = 3;
      circuitBreaker.state = 'OPEN';
      circuitBreaker.lastFailureTime = Date.now() - 2000; // Recovery timeout passed

      const operation = jest.fn().mockResolvedValue('recovered');

      const result = await circuitBreaker.execute(operation);

      expect(result).toBe('recovered');
      expect(circuitBreaker.state).toBe('CLOSED');
      expect(circuitBreaker.failures).toBe(0);
    });
  });
});
