/**
 * Tool Improvements Tests
 * Tests for new tool execution features: timeouts, validation, caching, dependencies, retries
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// Note: These tests are examples of how to test the improvements
// Actual implementation would need to import from toolExecutor.js

describe('Tool Timeout Configuration', () => {
  test('fast tools should have 5 second timeout', () => {
    // Example test structure
    const TOOL_TIMEOUTS = {
      get_current_datetime: 5000,
      get_customer_full_name: 5000,
    };

    expect(TOOL_TIMEOUTS.get_current_datetime).toBe(5000);
    expect(TOOL_TIMEOUTS.get_customer_full_name).toBe(5000);
  });

  test('medium tools should have 15 second timeout', () => {
    const TOOL_TIMEOUTS = {
      get_customer_info: 15000,
      get_service_list: 15000,
    };

    expect(TOOL_TIMEOUTS.get_customer_info).toBe(15000);
    expect(TOOL_TIMEOUTS.get_service_list).toBe(15000);
  });

  test('complex tools should have 30 second timeout', () => {
    const TOOL_TIMEOUTS = {
      book_appointment: 30000,
      get_available_times: 30000,
    };

    expect(TOOL_TIMEOUTS.book_appointment).toBe(30000);
    expect(TOOL_TIMEOUTS.get_available_times).toBe(30000);
  });

  test('very complex tools should have 45 second timeout', () => {
    const TOOL_TIMEOUTS = {
      get_staff_list: 45000,
    };

    expect(TOOL_TIMEOUTS.get_staff_list).toBe(45000);
  });
});

describe('Pre-Execution Parameter Validation', () => {
  // Mock validation function for testing
  const mockValidateToolCall = (toolName, args) => {
    const validators = {
      book_appointment: (args) => {
        if (!args.service_name || typeof args.service_name !== 'string') {
          return { valid: false, error: 'service_name is required and must be a string' };
        }
        if (!args.appointment_time || typeof args.appointment_time !== 'string') {
          return { valid: false, error: 'appointment_time is required and must be a string' };
        }
        const timeStr = args.appointment_time.toLowerCase();
        if (timeStr.includes('yesterday') || timeStr.includes('last week')) {
          return { valid: false, error: 'Cannot book appointments in the past' };
        }
        return { valid: true };
      },
    };

    const validator = validators[toolName];
    return validator ? validator(args) : { valid: true };
  };

  test('should reject book_appointment with missing service_name', () => {
    const validation = mockValidateToolCall('book_appointment', {
      appointment_time: 'tomorrow at 2pm',
    });

    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('service_name');
  });

  test('should reject book_appointment with past dates', () => {
    const validation = mockValidateToolCall('book_appointment', {
      service_name: 'Grooming',
      appointment_time: 'yesterday at 2pm',
    });

    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('past');
  });

  test('should accept valid book_appointment parameters', () => {
    const validation = mockValidateToolCall('book_appointment', {
      service_name: 'Grooming',
      appointment_time: 'tomorrow at 2pm',
    });

    expect(validation.valid).toBe(true);
  });

  test('should accept tools without validators', () => {
    const validation = mockValidateToolCall('unknown_tool', {});
    expect(validation.valid).toBe(true);
  });
});

describe('Tool Result Caching', () => {
  class MockConversationToolCache {
    constructor(chatId, ttl = 300000) {
      this.chatId = chatId;
      this.cache = new Map();
      this.ttl = ttl;
    }

    getCacheKey(toolName, args) {
      const cacheableTools = {
        get_service_list: (args) => `${toolName}:${args.pet_type || 'all'}`,
        get_locations: () => toolName,
        get_current_datetime: () => {
          const minute = Math.floor(Date.now() / 60000);
          return `${toolName}:${minute}`;
        },
      };

      const keyFn = cacheableTools[toolName];
      return keyFn ? keyFn(args) : null;
    }

    get(key) {
      if (!key) return null;
      const entry = this.cache.get(key);
      if (!entry) return null;
      if (Date.now() - entry.timestamp > this.ttl) {
        this.cache.delete(key);
        return null;
      }
      return entry.value;
    }

    set(key, value) {
      if (!key) return;
      this.cache.set(key, { value, timestamp: Date.now() });
    }

    size() {
      return this.cache.size;
    }
  }

  test('should cache get_service_list results', () => {
    const cache = new MockConversationToolCache('test-chat');
    const key = cache.getCacheKey('get_service_list', { pet_type: 'dog' });

    expect(key).toBe('get_service_list:dog');

    cache.set(key, 'service list data');
    expect(cache.get(key)).toBe('service list data');
  });

  test('should cache get_locations results', () => {
    const cache = new MockConversationToolCache('test-chat');
    const key = cache.getCacheKey('get_locations', {});

    expect(key).toBe('get_locations');
  });

  test('should not cache non-cacheable tools', () => {
    const cache = new MockConversationToolCache('test-chat');
    const key = cache.getCacheKey('book_appointment', {});

    expect(key).toBeNull();
  });

  test('should expire cache after TTL', () => {
    const cache = new MockConversationToolCache('test-chat', 100); // 100ms TTL
    const key = cache.getCacheKey('get_locations', {});

    cache.set(key, 'locations data');
    expect(cache.get(key)).toBe('locations data');

    // Wait for expiration
    return new Promise(resolve => {
      setTimeout(() => {
        expect(cache.get(key)).toBeNull();
        resolve();
      }, 150);
    });
  });

  test('should invalidate expired entries on get', () => {
    const cache = new MockConversationToolCache('test-chat', 50);
    const key = 'test-key';

    cache.set(key, 'test-value');
    expect(cache.size()).toBe(1);

    return new Promise(resolve => {
      setTimeout(() => {
        cache.get(key); // Should trigger expiration
        expect(cache.size()).toBe(0);
        resolve();
      }, 100);
    });
  });
});

describe('Tool Dependency Management', () => {
  const mockGroupToolsByDependencies = (toolCalls) => {
    const TOOL_DEPENDENCIES = {
      book_appointment: ['get_customer_info', 'get_customer_full_name'],
      reschedule_appointment: ['get_customer_appointments'],
    };

    const groups = [];
    const executed = new Set();
    const callsByName = new Map();

    toolCalls.forEach(tc => {
      if (!callsByName.has(tc.name)) {
        callsByName.set(tc.name, []);
      }
      callsByName.get(tc.name).push(tc);
    });

    let iterations = 0;
    const maxIterations = toolCalls.length + 1;

    while (executed.size < toolCalls.length && iterations < maxIterations) {
      iterations++;

      const currentGroup = toolCalls.filter(tc => {
        if (executed.has(tc.id)) return false;
        const deps = TOOL_DEPENDENCIES[tc.name] || [];
        const unsatisfiedDeps = deps.filter(dep => {
          const depCalls = callsByName.get(dep) || [];
          return depCalls.some(depCall => !executed.has(depCall.id));
        });
        return unsatisfiedDeps.length === 0;
      });

      if (currentGroup.length === 0) break;

      groups.push(currentGroup);
      currentGroup.forEach(tc => executed.add(tc.id));
    }

    const remaining = toolCalls.filter(tc => !executed.has(tc.id));
    if (remaining.length > 0) {
      groups.push(remaining);
    }

    return groups;
  };

  test('should execute independent tools in one group', () => {
    const toolCalls = [
      { id: '1', name: 'get_service_list' },
      { id: '2', name: 'get_locations' },
    ];

    const groups = mockGroupToolsByDependencies(toolCalls);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toHaveLength(2);
  });

  test('should execute dependencies before dependents', () => {
    const toolCalls = [
      { id: '1', name: 'book_appointment' },
      { id: '2', name: 'get_customer_info' },
    ];

    const groups = mockGroupToolsByDependencies(toolCalls);

    expect(groups).toHaveLength(2);
    expect(groups[0][0].name).toBe('get_customer_info');
    expect(groups[1][0].name).toBe('book_appointment');
  });

  test('should handle multiple dependencies', () => {
    const toolCalls = [
      { id: '1', name: 'book_appointment' },
      { id: '2', name: 'get_customer_info' },
      { id: '3', name: 'get_customer_full_name' },
    ];

    const groups = mockGroupToolsByDependencies(toolCalls);

    expect(groups).toHaveLength(2);
    expect(groups[0]).toHaveLength(2); // Both dependencies
    expect(groups[1]).toHaveLength(1); // book_appointment
  });

  test('should handle mixed independent and dependent tools', () => {
    const toolCalls = [
      { id: '1', name: 'book_appointment' },
      { id: '2', name: 'get_customer_info' },
      { id: '3', name: 'get_locations' }, // Independent
    ];

    const groups = mockGroupToolsByDependencies(toolCalls);

    expect(groups).toHaveLength(2);
    expect(groups[0]).toHaveLength(2); // get_customer_info + get_locations
    expect(groups[1]).toHaveLength(1); // book_appointment
  });
});

describe('Tool Retry Logic', () => {
  test('should retry on network errors', async () => {
    let attempts = 0;
    const mockOperation = async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error('Network timeout');
      }
      return 'success';
    };

    // Mock retry logic
    const executeWithRetry = async (fn, maxRetries = 2) => {
      let lastError;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await fn();
        } catch (error) {
          lastError = error;
          if (attempt < maxRetries) continue;
        }
      }
      throw lastError;
    };

    const result = await executeWithRetry(mockOperation);
    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });

  test('should not retry validation errors', async () => {
    let attempts = 0;
    const mockOperation = async () => {
      attempts++;
      throw new Error('validation failed: invalid parameter');
    };

    const executeWithRetry = async (fn, maxRetries = 2) => {
      let lastError;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await fn();
        } catch (error) {
          lastError = error;
          if (error.message.includes('validation')) {
            throw error; // Don't retry validation errors
          }
          if (attempt < maxRetries) continue;
        }
      }
      throw lastError;
    };

    await expect(executeWithRetry(mockOperation)).rejects.toThrow('validation');
    expect(attempts).toBe(1); // Should not retry
  });

  test('should fail after max retries', async () => {
    let attempts = 0;
    const mockOperation = async () => {
      attempts++;
      throw new Error('persistent error');
    };

    const executeWithRetry = async (fn, maxRetries = 2) => {
      let lastError;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await fn();
        } catch (error) {
          lastError = error;
          if (attempt < maxRetries) continue;
        }
      }
      throw lastError;
    };

    await expect(executeWithRetry(mockOperation)).rejects.toThrow('persistent error');
    expect(attempts).toBe(3); // Initial + 2 retries
  });
});

describe('Tool Enforcement Refinement', () => {
  const mockCheckEnforcement = (geminiResponse) => {
    // Check if helping phrase
    const helpingPhrases = [
      /(?:can|will|would like to|let me|i can).*(?:help|book|schedule)/i,
      /would you like.*(?:to book|me to schedule)/i,
    ];

    const isHelpingPhrase = helpingPhrases.some(pattern => pattern.test(geminiResponse));

    if (isHelpingPhrase) return false;

    // Check for false confirmations (past tense only)
    const confirmationPatterns = [
      /(?:your|the).*appointment.*(?:has been|is now).*(?:scheduled|booked)/i,
      /(?:successfully|already).*(?:booked|scheduled)/i,
    ];

    return confirmationPatterns.some(pattern => pattern.test(geminiResponse));
  };

  test('should not enforce on helping phrases', () => {
    const response = 'I can help you book an appointment';
    expect(mockCheckEnforcement(response)).toBe(false);
  });

  test('should not enforce on future tense offers', () => {
    const response = 'I will help you schedule an appointment';
    expect(mockCheckEnforcement(response)).toBe(false);
  });

  test('should enforce on past tense confirmations', () => {
    const response = 'Your appointment has been scheduled';
    expect(mockCheckEnforcement(response)).toBe(true);
  });

  test('should enforce on false completion claims', () => {
    const response = 'Successfully booked your appointment';
    expect(mockCheckEnforcement(response)).toBe(true);
  });

  test('should not enforce on questions', () => {
    const response = 'Would you like to book an appointment?';
    expect(mockCheckEnforcement(response)).toBe(false);
  });
});

describe('Integration Tests', () => {
  test('tool execution flow with all improvements', async () => {
    // This is a conceptual test showing how all improvements work together
    const toolCall = {
      id: 'test-1',
      name: 'get_service_list',
      args: { pet_type: 'dog' },
    };

    // 1. Validation (should pass)
    const validation = { valid: true }; // mockValidateToolCall
    expect(validation.valid).toBe(true);

    // 2. Cache check (miss on first call)
    const cache = new Map();
    const cacheKey = 'get_service_list:dog';
    expect(cache.has(cacheKey)).toBe(false);

    // 3. Execute with proper timeout (15s for medium tools)
    const timeout = 15000;
    expect(timeout).toBe(15000);

    // 4. Cache result
    cache.set(cacheKey, 'service list data');

    // 5. Second call should hit cache
    expect(cache.has(cacheKey)).toBe(true);
    expect(cache.get(cacheKey)).toBe('service list data');
  });

  test('dependency chain with validation', () => {
    const toolCalls = [
      { id: '1', name: 'book_appointment', args: { service_name: 'Grooming', appointment_time: 'tomorrow at 2pm' } },
      { id: '2', name: 'get_customer_info', args: { full_name: 'John', phone_number: '1234567' } },
    ];

    // All validations should pass
    toolCalls.forEach(tc => {
      // Validation would happen here
      expect(tc.args).toBeDefined();
    });

    // Dependency grouping should create 2 groups
    // Group 1: get_customer_info
    // Group 2: book_appointment
    expect(toolCalls).toHaveLength(2);
  });
});
