# Critical Fixes - Code Examples

This document provides ready-to-implement code examples for the 3 critical issues identified in the audit.

---

## Critical Issue #1: Circuit Breaker Multi-Tenancy Isolation

**File:** `packages/meta-bot/langgraph/nodes/toolExecutor.js`

### Current Code (Lines 70-72, 156-159)
```javascript
// Global circuit breaker registry - PROBLEM: Shared across all companies
const circuitBreakers = new Map();

// Later in code:
if (!circuitBreakers.has(toolName)) {
  circuitBreakers.set(toolName, new ToolCircuitBreaker(5, 60000, toolName));
}
const circuitBreaker = circuitBreakers.get(toolName);
```

### Fixed Code
```javascript
// Tenant-isolated circuit breaker registry
const circuitBreakers = new Map();

/**
 * Get or create a circuit breaker for a specific company and tool
 * Isolates failures between different tenants
 */
function getCircuitBreaker(companyId, toolName) {
  if (!companyId) {
    throw new Error('companyId required for circuit breaker isolation');
  }
  
  const key = `${companyId}:${toolName}`;
  
  if (!circuitBreakers.has(key)) {
    circuitBreakers.set(
      key, 
      new ToolCircuitBreaker(5, 60000, `${companyId}/${toolName}`)
    );
  }
  
  return circuitBreakers.get(key);
}

// In toolExecutorNode function (line 156):
const circuitBreaker = getCircuitBreaker(companyId, toolName);
```

### Additional: Circuit Breaker Cleanup
```javascript
// Add periodic cleanup to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;
  
  for (const [key, breaker] of circuitBreakers.entries()) {
    // Remove circuit breakers that haven't been used in an hour
    if (breaker.lastFailureTime && 
        (now - breaker.lastFailureTime) > ONE_HOUR &&
        breaker.state === 'CLOSED' &&
        breaker.failures === 0) {
      circuitBreakers.delete(key);
      logger.messageFlow.info('system', 'circuit-breaker', 
        `Cleaned up inactive circuit breaker: ${key}`);
    }
  }
}, 15 * 60 * 1000); // Run every 15 minutes
```

---

## Critical Issue #4: Standardize Database Error Handling

**File:** `packages/meta-bot/lib/toolHandlers.js`

### Problem: Inconsistent patterns across tool handlers

### Solution: Create Standard Database Operation Wrapper

**New File:** `packages/meta-bot/lib/databaseWrapper.js`
```javascript
import logger from '../utils/logger.js';
import mongoose from 'mongoose';

/**
 * Standard error class for database operations
 */
export class DatabaseError extends Error {
  constructor(operation, originalError, context = {}) {
    super(`Database operation failed: ${operation}`);
    this.name = 'DatabaseError';
    this.operation = operation;
    this.originalError = originalError;
    this.context = context;
    this.isRetryable = isRetryableError(originalError);
  }
}

/**
 * Check if error is retryable (network issues, lock timeouts, etc.)
 */
function isRetryableError(error) {
  if (!error) return false;
  
  const retryableCodes = [
    'ECONNRESET',
    'ETIMEDOUT', 
    'ENOTFOUND',
    'EAI_AGAIN'
  ];
  
  const retryableMongoErrors = [
    'NetworkTimeout',
    'ExceededTimeLimit', 
    'LockTimeout'
  ];
  
  return retryableCodes.includes(error.code) ||
         retryableMongoErrors.includes(error.name) ||
         error.message?.includes('buffering timed out');
}

/**
 * Execute database operation with standard error handling
 * Automatically retries retryable errors
 */
export async function executeDatabaseOperation(
  operation,
  operationFn,
  context = {},
  options = { maxRetries: 3, retryDelay: 1000 }
) {
  let lastError;
  
  for (let attempt = 1; attempt <= options.maxRetries; attempt++) {
    try {
      // Check connection state
      if (mongoose.connection.readyState !== 1) {
        throw new Error('Database not connected');
      }
      
      const result = await operationFn();
      
      // Log successful operation
      if (context.platform && context.chatId) {
        logger.messageFlow.info(
          context.platform,
          context.chatId,
          'database-operation',
          `${operation} completed successfully (attempt ${attempt})`
        );
      }
      
      return result;
      
    } catch (error) {
      lastError = error;
      
      const dbError = new DatabaseError(operation, error, context);
      
      // Log error
      if (context.platform && context.chatId) {
        logger.messageFlow.error(
          context.platform,
          context.chatId,
          'database-operation',
          dbError
        );
      }
      
      // Retry if error is retryable and we haven't exceeded max attempts
      if (dbError.isRetryable && attempt < options.maxRetries) {
        const delay = options.retryDelay * attempt; // Exponential backoff
        logger.messageFlow.info(
          context.platform || 'system',
          context.chatId || 'unknown',
          'database-retry',
          `Retrying ${operation} in ${delay}ms (attempt ${attempt + 1}/${options.maxRetries})`
        );
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Not retryable or max retries exceeded
      throw dbError;
    }
  }
  
  throw new DatabaseError(operation, lastError, context);
}

/**
 * Validate that a database result exists and has required fields
 */
export function validateDatabaseResult(result, operation, requiredFields = []) {
  if (!result) {
    throw new Error(`${operation} returned no result`);
  }
  
  for (const field of requiredFields) {
    if (result[field] === undefined || result[field] === null) {
      throw new Error(`${operation} result missing required field: ${field}`);
    }
  }
  
  return result;
}
```

### Updated Tool Handler Pattern

**Apply to:** `get_customer_full_name`, `get_customer_info`, etc.

```javascript
// OLD CODE (lines 74-86)
get_customer_full_name: async ({ full_name, chat_id }, context = {}) => {
  const id = chat_id || context.chat_id;
  if (id && context.company_id) {
    const contact = await getContactByChatId(id, context.company_id, platform);
    if (contact) {
      await updateContactInfo(contact._id, { fullName: full_name });
    }
  }
  return { full_name };
},

// NEW CODE
get_customer_full_name: async ({ full_name, chat_id }, context = {}) => {
  const id = chat_id || context.chat_id;
  
  if (id && context.company_id) {
    await executeDatabaseOperation(
      'get_customer_full_name',
      async () => {
        const contact = await getContactByChatId(id, context.company_id, platform);
        
        if (contact) {
          validateDatabaseResult(contact, 'getContactByChatId', ['_id']);
          
          const updated = await updateContactInfo(contact._id, { fullName: full_name });
          
          // Validate update succeeded
          if (!updated) {
            throw new Error('Contact update returned no result');
          }
        }
      },
      context
    );
  }
  
  return { full_name };
},
```

---

## Critical Issue #29: Authorization Checks in Tool Handlers

**File:** `packages/meta-bot/lib/toolHandlers.js`

### Create Authorization Middleware

**New File:** `packages/meta-bot/lib/authorization.js`
```javascript
import { User, Company } from '@petbuddy/shared';
import logger from '../utils/logger.js';

/**
 * Authorization error
 */
export class AuthorizationError extends Error {
  constructor(action, resource, reason) {
    super(`Unauthorized: Cannot ${action} ${resource} - ${reason}`);
    this.name = 'AuthorizationError';
    this.action = action;
    this.resource = resource;
    this.reason = reason;
  }
}

/**
 * Verify that the chat user has permission to perform action
 * For social media bots, this checks:
 * 1. User is associated with the company
 * 2. User has appropriate role/permissions
 * 3. Resource belongs to the company
 */
export async function verifyAuthorization(context, action, resource) {
  const { chat_id, company_id, platform } = context;
  
  if (!chat_id || !company_id) {
    throw new AuthorizationError(
      action,
      resource,
      'Missing chat_id or company_id in context'
    );
  }
  
  // Get company to verify it exists
  const company = await Company.findById(company_id).lean();
  if (!company) {
    throw new AuthorizationError(
      action,
      resource,
      `Company ${company_id} not found`
    );
  }
  
  // For social media integrations, verify the chat is authorized for this company
  const isAuthorized = 
    (platform === 'facebook' && company.metaIntegration?.facebookChatId === chat_id) ||
    (platform === 'instagram' && company.metaIntegration?.instagramChatId === chat_id);
  
  if (!isAuthorized) {
    logger.messageFlow.error(
      platform,
      chat_id,
      'authorization-failed',
      `Chat ${chat_id} not authorized for company ${company_id}`
    );
    
    throw new AuthorizationError(
      action,
      resource,
      'Chat not authorized for this company'
    );
  }
  
  return { company, authorized: true };
}

/**
 * Verify resource ownership
 * Ensures that the resource (appointment, pet, etc.) belongs to the company
 */
export async function verifyResourceOwnership(resource, companyId, resourceType) {
  if (!resource) {
    throw new AuthorizationError(
      'access',
      resourceType,
      'Resource not found'
    );
  }
  
  const resourceCompanyId = String(resource.companyId);
  const contextCompanyId = String(companyId);
  
  if (resourceCompanyId !== contextCompanyId) {
    logger.messageFlow.error(
      'system',
      'authorization',
      'ownership-violation',
      `Attempted to access ${resourceType} from different company: ${resourceCompanyId} vs ${contextCompanyId}`
    );
    
    throw new AuthorizationError(
      'access',
      resourceType,
      'Resource belongs to different company'
    );
  }
  
  return true;
}
```

### Updated Tool Handlers with Authorization

**Example 1: get_staff_list**
```javascript
// OLD CODE (line 1643)
get_staff_list: async (params, context = {}) => {
  try {
    const { service_id = null } = params;
    
    if (!context?.company_id) {
      throw new Error("Missing company context");
    }
    
    // Build query...
    
// NEW CODE with authorization
get_staff_list: async (params, context = {}) => {
  try {
    const { service_id = null } = params;
    
    // AUTHORIZATION CHECK
    await verifyAuthorization(context, 'view', 'staff_list');
    
    // Rest of the code unchanged...
```

**Example 2: cancel_appointment**
```javascript
// OLD CODE (line 933)
cancel_appointment: async (params, context = {}) => {
  try {
    const { appointment_id, cancellation_reason } = params;
    
    // ... validation ...
    
    // Find appointment and verify ownership
    const appointment = await Appointment.findOne({
      _id: appointment_id,
      customerId: contact._id,
      companyId: context.company_id,
    });
    
// NEW CODE with explicit authorization
cancel_appointment: async (params, context = {}) => {
  try {
    const { appointment_id, cancellation_reason } = params;
    
    // AUTHORIZATION CHECK
    await verifyAuthorization(context, 'cancel', 'appointment');
    
    // ... validation ...
    
    // Find appointment
    const appointment = await Appointment.findOne({
      _id: appointment_id,
      customerId: contact._id,
    });
    
    if (appointment) {
      // VERIFY RESOURCE OWNERSHIP
      await verifyResourceOwnership(appointment, context.company_id, 'appointment');
    }
    
    // Rest of the code unchanged...
```

**Example 3: book_appointment**
```javascript
// Add authorization check at the start (after line 128)
book_appointment: async (params, context = {}) => {
  const DEBUG = process.env.DEBUG_APPOINTMENTS === "true";
  
  try {
    const {
      appointment_time,
      service_name,
      pet_size,
      pet_name,
      pet_type,
      notes: incomingNotes,
    } = params;
    
    // AUTHORIZATION CHECK
    await verifyAuthorization(context, 'create', 'appointment');
    
    // Basic validation
    if (!context?.company_id)
      throw new Error("Missing company context for booking");
    // ... rest of code unchanged
```

### Rollout Strategy

1. **Add authorization module** - Create `authorization.js`
2. **Add to high-risk tools first:**
   - `book_appointment` (creates charges)
   - `cancel_appointment` (affects business)
   - `get_customer_info` (privacy)
   - `add_pet` (data creation)
3. **Add to read-only tools:**
   - `get_staff_list`
   - `get_service_list`
   - `get_locations`
4. **Monitor logs** for authorization failures
5. **Add metrics** for authorization checks

---

## Testing the Fixes

### Test Circuit Breaker Isolation
```javascript
// packages/meta-bot/__tests__/circuitBreaker.test.js
describe('Circuit Breaker Multi-Tenancy', () => {
  it('should isolate circuit breaker between companies', async () => {
    const company1 = 'company1_id';
    const company2 = 'company2_id';
    
    // Cause failures for company1
    for (let i = 0; i < 5; i++) {
      try {
        await toolExecutorNode({
          companyId: company1,
          toolCalls: [{ name: 'failing_tool', args: {} }]
        });
      } catch (e) {}
    }
    
    // Company1 should have circuit breaker open
    const breaker1 = getCircuitBreaker(company1, 'failing_tool');
    expect(breaker1.state).toBe('OPEN');
    
    // Company2 should still work
    const breaker2 = getCircuitBreaker(company2, 'failing_tool');
    expect(breaker2.state).toBe('CLOSED');
  });
});
```

### Test Database Error Handling
```javascript
// packages/meta-bot/__tests__/databaseWrapper.test.js
describe('Database Operation Wrapper', () => {
  it('should retry on retryable errors', async () => {
    let attempts = 0;
    
    const result = await executeDatabaseOperation(
      'test_operation',
      async () => {
        attempts++;
        if (attempts < 3) {
          const error = new Error('Connection timeout');
          error.code = 'ETIMEDOUT';
          throw error;
        }
        return { success: true };
      }
    );
    
    expect(attempts).toBe(3);
    expect(result.success).toBe(true);
  });
  
  it('should not retry on non-retryable errors', async () => {
    let attempts = 0;
    
    await expect(
      executeDatabaseOperation(
        'test_operation',
        async () => {
          attempts++;
          throw new Error('Validation failed');
        }
      )
    ).rejects.toThrow('Database operation failed');
    
    expect(attempts).toBe(1);
  });
});
```

### Test Authorization
```javascript
// packages/meta-bot/__tests__/authorization.test.js
describe('Authorization', () => {
  it('should reject unauthorized company access', async () => {
    const context = {
      chat_id: 'fake_chat',
      company_id: 'company_id',
      platform: 'facebook'
    };
    
    await expect(
      verifyAuthorization(context, 'view', 'staff_list')
    ).rejects.toThrow(AuthorizationError);
  });
  
  it('should detect cross-company resource access', async () => {
    const appointment = {
      _id: 'apt_id',
      companyId: 'company_1'
    };
    
    await expect(
      verifyResourceOwnership(appointment, 'company_2', 'appointment')
    ).rejects.toThrow(AuthorizationError);
  });
});
```

---

## Deployment Checklist

### Pre-Deployment
- [ ] All critical fixes implemented and tested
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Database migrations completed (if needed)
- [ ] Environment variables configured
- [ ] Monitoring alerts set up

### Deployment
- [ ] Deploy to staging environment
- [ ] Run smoke tests
- [ ] Monitor error rates
- [ ] Test with real data (if possible)
- [ ] Deploy to production with canary release
- [ ] Monitor for 24 hours

### Post-Deployment
- [ ] Verify circuit breakers are isolated per company
- [ ] Check authorization rejection metrics
- [ ] Review error logs for new patterns
- [ ] Document any issues encountered
- [ ] Update runbooks

---

## Additional Resources

- **Main Audit Report:** `TOOL_INVOCATION_AUDIT_REPORT.md`
- **Architecture Docs:** `docs/architecture/`
- **LangGraph Documentation:** https://langchain-ai.github.io/langgraph/
- **Mongoose Best Practices:** https://mongoosejs.com/docs/guide.html

---

**Last Updated:** November 4, 2025

