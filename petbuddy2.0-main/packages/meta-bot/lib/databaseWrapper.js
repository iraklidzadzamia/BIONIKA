/**
 * Database Operation Wrapper
 * 
 * Provides consistent error handling and retry logic for all database operations.
 * Prevents silent failures and provides better error diagnostics.
 * 
 * USAGE:
 * ```javascript
 * import { executeDatabaseOperation, validateDatabaseResult } from './databaseWrapper.js';
 * 
 * const contact = await executeDatabaseOperation(
 *   'getContactByChatId',
 *   async () => await getContactByChatId(chatId, companyId, platform),
 *   { platform, chatId, companyId }
 * );
 * validateDatabaseResult(contact, 'getContactByChatId', ['_id', 'fullName']);
 * ```
 */

import logger from '../utils/logger.js';
import mongoose from 'mongoose';

/**
 * Standard error class for database operations
 * Provides consistent error structure and metadata
 */
export class DatabaseError extends Error {
  constructor(operation, originalError, context = {}) {
    super(`Database operation failed: ${operation}`);
    this.name = 'DatabaseError';
    this.operation = operation;
    this.originalError = originalError;
    this.context = context;
    this.isRetryable = isRetryableError(originalError);
    this.timestamp = new Date();
    
    // Preserve stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DatabaseError);
    }
  }
  
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      operation: this.operation,
      isRetryable: this.isRetryable,
      originalError: this.originalError?.message,
      context: this.context,
      timestamp: this.timestamp,
    };
  }
}

/**
 * Check if error is retryable (network issues, lock timeouts, etc.)
 * Returns true for transient errors that might succeed on retry
 * 
 * @param {Error} error - Original error to check
 * @returns {boolean} True if error is retryable
 */
function isRetryableError(error) {
  if (!error) return false;
  
  // Network-related errors
  const retryableCodes = [
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'EAI_AGAIN',
    'ECONNREFUSED',
  ];
  
  // MongoDB-specific retryable errors
  const retryableMongoErrors = [
    'NetworkTimeout',
    'ExceededTimeLimit',
    'LockTimeout',
    'HostUnreachable',
    'HostNotFound',
    'InterruptedAtShutdown',
  ];
  
  // Check error code
  if (retryableCodes.includes(error.code)) {
    return true;
  }
  
  // Check error name
  if (retryableMongoErrors.includes(error.name)) {
    return true;
  }
  
  // Check error message for retryable patterns
  const retryablePatterns = [
    'buffering timed out',
    'connection.*closed',
    'ECONNRESET',
    'socket hang up',
    'read ECONNRESET',
  ];
  
  const errorMessage = error.message?.toLowerCase() || '';
  if (retryablePatterns.some(pattern => new RegExp(pattern, 'i').test(errorMessage))) {
    return true;
  }
  
  return false;
}

/**
 * Execute database operation with standard error handling and retry logic
 * 
 * Features:
 * - Automatic retry for transient errors
 * - Exponential backoff
 * - Connection state validation
 * - Comprehensive logging
 * - Error standardization
 * 
 * @param {string} operation - Name of the operation (for logging and errors)
 * @param {Function} operationFn - Async function that performs the database operation
 * @param {Object} context - Context for logging (platform, chatId, companyId, etc.)
 * @param {Object} options - Configuration options
 * @param {number} options.maxRetries - Maximum retry attempts (default: 3)
 * @param {number} options.retryDelay - Initial retry delay in ms (default: 1000)
 * @param {boolean} options.throwOnConnectionError - Throw immediately if DB disconnected (default: true)
 * @returns {Promise<*>} Result of the operation
 * @throws {DatabaseError} If operation fails after all retries
 */
export async function executeDatabaseOperation(
  operation,
  operationFn,
  context = {},
  options = {}
) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    throwOnConnectionError = true,
  } = options;
  
  let lastError;
  const { platform = 'system', chatId = 'unknown', companyId } = context;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Check connection state before attempting operation
      if (mongoose.connection.readyState !== 1) {
        const error = new Error('Database not connected');
        error.code = 'DB_NOT_CONNECTED';
        error.connectionState = mongoose.connection.readyState;
        
        if (throwOnConnectionError) {
          throw error;
        }
        
        logger.messageFlow.warn(
          platform,
          chatId,
          'database-not-connected',
          `Database not connected for ${operation}, attempt ${attempt}/${maxRetries}`
        );
      }
      
      // Execute the operation
      const result = await operationFn();
      
      // Log successful operation (only on retry or if debug enabled)
      if (attempt > 1 || process.env.DEBUG_DATABASE === 'true') {
        logger.messageFlow.info(
          platform,
          chatId,
          'database-operation',
          `${operation} completed successfully (attempt ${attempt}/${maxRetries})`
        );
      }
      
      return result;
      
    } catch (error) {
      lastError = error;
      
      const dbError = new DatabaseError(operation, error, {
        ...context,
        attempt,
        maxRetries,
      });
      
      // Log error with appropriate level
      const logLevel = dbError.isRetryable && attempt < maxRetries ? 'warn' : 'error';
      
      logger.messageFlow[logLevel](
        platform,
        chatId,
        'database-operation-error',
        dbError,
        {
          operation,
          attempt,
          maxRetries,
          isRetryable: dbError.isRetryable,
          errorType: error.name,
          errorCode: error.code,
        }
      );
      
      // Retry if error is retryable and we haven't exceeded max attempts
      if (dbError.isRetryable && attempt < maxRetries) {
        const delay = retryDelay * attempt; // Linear backoff
        
        logger.messageFlow.info(
          platform,
          chatId,
          'database-retry',
          `Retrying ${operation} in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`,
          { reason: error.message }
        );
        
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Not retryable or max retries exceeded
      throw dbError;
    }
  }
  
  // This should never be reached, but just in case
  throw new DatabaseError(operation, lastError, { ...context, exhaustedRetries: true });
}

/**
 * Validate that a database result exists and has required fields
 * Throws descriptive error if validation fails
 * 
 * @param {*} result - Result to validate
 * @param {string} operation - Operation name for error messages
 * @param {string[]} requiredFields - Array of field names that must be present
 * @param {Object} options - Validation options
 * @param {boolean} options.allowNull - Allow null/undefined result if true (default: false)
 * @returns {*} The validated result
 * @throws {Error} If validation fails
 */
export function validateDatabaseResult(result, operation, requiredFields = [], options = {}) {
  const { allowNull = false } = options;
  
  // Check if result exists
  if (!result) {
    if (allowNull) {
      return result;
    }
    throw new Error(`${operation} returned no result (expected an object with data)`);
  }
  
  // Validate required fields
  const missingFields = [];
  for (const field of requiredFields) {
    if (result[field] === undefined || result[field] === null) {
      missingFields.push(field);
    }
  }
  
  if (missingFields.length > 0) {
    throw new Error(
      `${operation} result missing required fields: ${missingFields.join(', ')}. ` +
      `Available fields: ${Object.keys(result).join(', ')}`
    );
  }
  
  return result;
}

/**
 * Validate that a database write operation succeeded
 * Checks common write operation results
 * 
 * @param {*} result - Result from write operation
 * @param {string} operation - Operation name for error messages
 * @returns {*} The validated result
 * @throws {Error} If validation indicates failure
 */
export function validateWriteResult(result, operation) {
  if (!result) {
    throw new Error(`${operation} returned no result - write may have failed`);
  }
  
  // Check mongoose save/update results
  if (result.acknowledged === false) {
    throw new Error(`${operation} not acknowledged by database`);
  }
  
  // Check for write errors
  if (result.writeErrors && result.writeErrors.length > 0) {
    const errors = result.writeErrors.map(e => e.errmsg).join('; ');
    throw new Error(`${operation} had write errors: ${errors}`);
  }
  
  return result;
}

/**
 * Safely convert MongoDB ObjectId to string
 * Handles various input formats
 * 
 * @param {*} id - ID to convert (ObjectId, string, or object with _id)
 * @returns {string|null} String representation of ID or null
 */
export function toIdString(id) {
  if (!id) return null;
  
  // Already a string
  if (typeof id === 'string') return id;
  
  // MongoDB ObjectId
  if (id._id) return String(id._id);
  
  // Has toString method
  if (typeof id.toString === 'function') return id.toString();
  
  return null;
}

/**
 * Batch execute multiple database operations with error handling
 * Continues on error and returns results + errors
 * 
 * @param {Array<{operation: string, fn: Function, context?: Object}>} operations
 * @param {Object} options - Execution options
 * @returns {Promise<{results: Array, errors: Array}>}
 */
export async function executeBatchOperations(operations, options = {}) {
  const { stopOnError = false, maxConcurrent = 5 } = options;
  
  const results = [];
  const errors = [];
  
  // Process in batches to avoid overwhelming the database
  for (let i = 0; i < operations.length; i += maxConcurrent) {
    const batch = operations.slice(i, i + maxConcurrent);
    
    const batchPromises = batch.map(async ({ operation, fn, context = {} }) => {
      try {
        const result = await executeDatabaseOperation(operation, fn, context);
        return { success: true, operation, result };
      } catch (error) {
        return { success: false, operation, error };
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    
    for (const result of batchResults) {
      if (result.success) {
        results.push(result);
      } else {
        errors.push(result);
        if (stopOnError) {
          return { results, errors };
        }
      }
    }
  }
  
  return { results, errors };
}

export default {
  executeDatabaseOperation,
  validateDatabaseResult,
  validateWriteResult,
  toIdString,
  executeBatchOperations,
  DatabaseError,
};

