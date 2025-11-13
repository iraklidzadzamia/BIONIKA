/**
 * Database Wrapper Tests
 * 
 * Tests consistent error handling and retry logic for database operations.
 */

import { jest } from '@jest/globals';
import {
  executeDatabaseOperation,
  validateDatabaseResult,
  validateWriteResult,
  toIdString,
  executeBatchOperations,
  DatabaseError,
} from '../lib/databaseWrapper.js';

// Mock logger
jest.mock('../utils/logger.js', () => ({
  default: {
    messageFlow: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
  },
}));

// Mock mongoose
jest.mock('mongoose', () => ({
  default: {
    connection: {
      readyState: 1, // Connected
    },
  },
}));

describe('Database Wrapper - executeDatabaseOperation', () => {
  test('should execute operation successfully', async () => {
    const mockOperation = jest.fn(async () => ({ data: 'success' }));
    
    const result = await executeDatabaseOperation(
      'test_operation',
      mockOperation,
      { platform: 'facebook', chatId: 'test' }
    );
    
    expect(result).toEqual({ data: 'success' });
    expect(mockOperation).toHaveBeenCalledTimes(1);
  });
  
  test('should retry on retryable errors', async () => {
    let attempts = 0;
    const mockOperation = jest.fn(async () => {
      attempts++;
      if (attempts < 3) {
        const error = new Error('Connection timeout');
        error.code = 'ETIMEDOUT';
        throw error;
      }
      return { data: 'success' };
    });
    
    const result = await executeDatabaseOperation(
      'test_operation',
      mockOperation,
      { platform: 'facebook', chatId: 'test' }
    );
    
    expect(attempts).toBe(3);
    expect(result).toEqual({ data: 'success' });
    expect(mockOperation).toHaveBeenCalledTimes(3);
  });
  
  test('should not retry on non-retryable errors', async () => {
    const mockOperation = jest.fn(async () => {
      throw new Error('Validation failed');
    });
    
    await expect(
      executeDatabaseOperation(
        'test_operation',
        mockOperation,
        { platform: 'facebook', chatId: 'test' }
      )
    ).rejects.toThrow(DatabaseError);
    
    expect(mockOperation).toHaveBeenCalledTimes(1);
  });
  
  test('should throw DatabaseError with context', async () => {
    const mockOperation = jest.fn(async () => {
      throw new Error('Original error');
    });
    
    try {
      await executeDatabaseOperation(
        'test_operation',
        mockOperation,
        { platform: 'facebook', chatId: 'test', companyId: 'company123' }
      );
      fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(DatabaseError);
      expect(error.operation).toBe('test_operation');
      expect(error.context.platform).toBe('facebook');
      expect(error.context.chatId).toBe('test');
      expect(error.context.companyId).toBe('company123');
    }
  });
  
  test('should identify retryable errors correctly', async () => {
    const retryableErrors = [
      { code: 'ECONNRESET' },
      { code: 'ETIMEDOUT' },
      { name: 'NetworkTimeout' },
      { message: 'buffering timed out' },
    ];
    
    for (const errorProps of retryableErrors) {
      let attempts = 0;
      const mockOperation = jest.fn(async () => {
        attempts++;
        if (attempts < 2) {
          const error = new Error('Retryable error');
          Object.assign(error, errorProps);
          throw error;
        }
        return { success: true };
      });
      
      const result = await executeDatabaseOperation(
        'test_operation',
        mockOperation,
        {},
        { maxRetries: 2 }
      );
      
      expect(attempts).toBe(2);
      expect(result.success).toBe(true);
    }
  });
  
  test('should respect maxRetries option', async () => {
    const mockOperation = jest.fn(async () => {
      const error = new Error('Persistent error');
      error.code = 'ETIMEDOUT';
      throw error;
    });
    
    await expect(
      executeDatabaseOperation(
        'test_operation',
        mockOperation,
        {},
        { maxRetries: 2 }
      )
    ).rejects.toThrow(DatabaseError);
    
    expect(mockOperation).toHaveBeenCalledTimes(2);
  });
});

describe('Database Wrapper - validateDatabaseResult', () => {
  test('should pass validation for valid result', () => {
    const result = { _id: '123', name: 'Test', email: 'test@example.com' };
    
    expect(() => {
      validateDatabaseResult(result, 'test_operation', ['_id', 'name']);
    }).not.toThrow();
  });
  
  test('should throw error for missing result', () => {
    expect(() => {
      validateDatabaseResult(null, 'test_operation', ['_id']);
    }).toThrow('returned no result');
  });
  
  test('should throw error for missing required fields', () => {
    const result = { _id: '123' };
    
    expect(() => {
      validateDatabaseResult(result, 'test_operation', ['_id', 'name', 'email']);
    }).toThrow('missing required fields: name, email');
  });
  
  test('should allow null result when allowNull is true', () => {
    expect(() => {
      validateDatabaseResult(null, 'test_operation', [], { allowNull: true });
    }).not.toThrow();
  });
});

describe('Database Wrapper - validateWriteResult', () => {
  test('should pass validation for successful write', () => {
    const result = { acknowledged: true };
    
    expect(() => {
      validateWriteResult(result, 'test_operation');
    }).not.toThrow();
  });
  
  test('should throw error for no result', () => {
    expect(() => {
      validateWriteResult(null, 'test_operation');
    }).toThrow('returned no result');
  });
  
  test('should throw error for unacknowledged write', () => {
    const result = { acknowledged: false };
    
    expect(() => {
      validateWriteResult(result, 'test_operation');
    }).toThrow('not acknowledged');
  });
  
  test('should throw error for write errors', () => {
    const result = {
      acknowledged: true,
      writeErrors: [
        { errmsg: 'Duplicate key error' },
      ],
    };
    
    expect(() => {
      validateWriteResult(result, 'test_operation');
    }).toThrow('write errors: Duplicate key error');
  });
});

describe('Database Wrapper - toIdString', () => {
  test('should convert ObjectId to string', () => {
    const objectId = { toString: () => '507f1f77bcf86cd799439011' };
    expect(toIdString(objectId)).toBe('507f1f77bcf86cd799439011');
  });
  
  test('should return string as-is', () => {
    expect(toIdString('507f1f77bcf86cd799439011')).toBe('507f1f77bcf86cd799439011');
  });
  
  test('should handle object with _id', () => {
    const obj = { _id: '507f1f77bcf86cd799439011' };
    expect(toIdString(obj)).toBe('507f1f77bcf86cd799439011');
  });
  
  test('should return null for null input', () => {
    expect(toIdString(null)).toBeNull();
  });
});

describe('Database Wrapper - executeBatchOperations', () => {
  test('should execute all operations successfully', async () => {
    const operations = [
      { operation: 'op1', fn: async () => ({ data: 'result1' }) },
      { operation: 'op2', fn: async () => ({ data: 'result2' }) },
      { operation: 'op3', fn: async () => ({ data: 'result3' }) },
    ];
    
    const { results, errors } = await executeBatchOperations(operations);
    
    expect(results).toHaveLength(3);
    expect(errors).toHaveLength(0);
    expect(results[0].result.data).toBe('result1');
    expect(results[1].result.data).toBe('result2');
    expect(results[2].result.data).toBe('result3');
  });
  
  test('should continue on error by default', async () => {
    const operations = [
      { operation: 'op1', fn: async () => ({ data: 'result1' }) },
      { operation: 'op2', fn: async () => { throw new Error('op2 failed'); } },
      { operation: 'op3', fn: async () => ({ data: 'result3' }) },
    ];
    
    const { results, errors } = await executeBatchOperations(operations);
    
    expect(results).toHaveLength(2);
    expect(errors).toHaveLength(1);
    expect(errors[0].operation).toBe('op2');
  });
  
  test('should stop on error when stopOnError is true', async () => {
    const operations = [
      { operation: 'op1', fn: async () => ({ data: 'result1' }) },
      { operation: 'op2', fn: async () => { throw new Error('op2 failed'); } },
      { operation: 'op3', fn: async () => ({ data: 'result3' }) },
    ];
    
    const { results, errors } = await executeBatchOperations(
      operations,
      { stopOnError: true }
    );
    
    expect(results).toHaveLength(1);
    expect(errors).toHaveLength(1);
  });
  
  test('should respect maxConcurrent option', async () => {
    let concurrentOperations = 0;
    let maxConcurrent = 0;
    
    const operations = Array.from({ length: 10 }, (_, i) => ({
      operation: `op${i}`,
      fn: async () => {
        concurrentOperations++;
        maxConcurrent = Math.max(maxConcurrent, concurrentOperations);
        await new Promise(resolve => setTimeout(resolve, 10));
        concurrentOperations--;
        return { data: `result${i}` };
      },
    }));
    
    await executeBatchOperations(operations, { maxConcurrent: 3 });
    
    // Max concurrent should not exceed 3
    expect(maxConcurrent).toBeLessThanOrEqual(3);
  });
});

