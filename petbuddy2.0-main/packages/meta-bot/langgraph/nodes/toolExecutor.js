import { ToolNode } from "@langchain/langgraph/prebuilt";
import { createLangChainTools } from "../tools/index.js";
import logger from "../../utils/logger.js";
import metricsTracker from "../../utils/metrics.js";

/**
 * Circuit Breaker for Tool Execution
 * Prevents cascading failures when tools repeatedly fail
 */
class ToolCircuitBreaker {
  constructor(failureThreshold = 5, recoveryTimeout = 60000, toolName = 'unknown') {
    this.failureThreshold = failureThreshold;
    this.recoveryTimeout = recoveryTimeout;
    this.toolName = toolName;
    this.failures = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }

  async execute(operation) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'HALF_OPEN';
        logger.messageFlow.info('circuit-breaker', this.toolName, `Circuit breaker entering HALF_OPEN state`);
      } else {
        const remainingTime = Math.ceil((this.recoveryTimeout - (Date.now() - this.lastFailureTime)) / 1000);
        logger.messageFlow.warning('circuit-breaker', this.toolName, `Circuit breaker OPEN - rejecting request (${remainingTime}s remaining)`);
        throw new Error(`Tool ${this.toolName} is temporarily unavailable due to repeated failures`);
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    if (this.state === 'HALF_OPEN') {
      logger.messageFlow.info('circuit-breaker', this.toolName, `Circuit breaker recovered - returning to CLOSED state`);
    }
    this.failures = 0;
    this.state = 'CLOSED';
    // FIXED: Clear lastFailureTime on successful recovery to allow proper cleanup
    this.lastFailureTime = null;
  }

  onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      logger.messageFlow.error('circuit-breaker', this.toolName, `Circuit breaker OPEN after ${this.failures} failures`);
    }
  }

  getStatus() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
      toolName: this.toolName
    };
  }
}

// Circuit breaker registry - isolated per company and tool
// Key format: "companyId:toolName" to prevent cross-tenant cascade failures
const circuitBreakers = new Map();

/**
 * Get or create a circuit breaker for a specific company and tool
 * This ensures that failures in one company don't affect other companies
 * 
 * @param {string} companyId - Company identifier for isolation
 * @param {string} toolName - Tool name
 * @returns {ToolCircuitBreaker} Isolated circuit breaker instance
 */
function getCircuitBreaker(companyId, toolName) {
  if (!companyId) {
    logger.messageFlow.error(
      'system',
      'circuit-breaker',
      'circuit-breaker-error',
      new Error('companyId required for circuit breaker isolation')
    );
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

/**
 * Cleanup inactive circuit breakers to prevent memory leaks
 * Runs periodically to remove circuit breakers that haven't been used
 *
 * FIXED: Improved cleanup logic to handle all states correctly
 */
function cleanupInactiveCircuitBreakers() {
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;
  let cleanedCount = 0;

  for (const [key, breaker] of circuitBreakers.entries()) {
    // Remove circuit breakers that are safe to clean up:

    // Case 1: Fully recovered (lastFailureTime cleared by onSuccess)
    // These are healthy breakers that can be recreated if needed
    if (breaker.lastFailureTime === null &&
        breaker.state === 'CLOSED' &&
        breaker.failures === 0) {
      circuitBreakers.delete(key);
      cleanedCount++;
      continue;
    }

    // Case 2: Old failures that have recovered but lastFailureTime wasn't cleared
    // (Handles legacy state or cases where onSuccess wasn't called)
    if (breaker.lastFailureTime &&
        (now - breaker.lastFailureTime) > ONE_HOUR &&
        breaker.state === 'CLOSED' &&
        breaker.failures === 0) {
      circuitBreakers.delete(key);
      cleanedCount++;
      continue;
    }

    // Case 3: Permanently failed breakers that are very old (> 1 hour in OPEN state)
    // These should be removed and recreated fresh if needed
    if (breaker.state === 'OPEN' &&
        breaker.lastFailureTime &&
        (now - breaker.lastFailureTime) > ONE_HOUR) {
      circuitBreakers.delete(key);
      cleanedCount++;
      continue;
    }
  }

  if (cleanedCount > 0) {
    logger.messageFlow.info(
      'system',
      'circuit-breaker',
      'cleanup-complete',
      `Cleaned up ${cleanedCount} inactive circuit breakers`
    );
  }
}

// Start periodic cleanup every 15 minutes
setInterval(cleanupInactiveCircuitBreakers, 15 * 60 * 1000);

/**
 * Tool Executor Node
 *
 * This node executes tools that the agent has called.
 * It uses LangGraph's built-in ToolNode for execution.
 */
export function createToolExecutorNode(platform, context) {
  const tools = createLangChainTools(platform, context);
  return new ToolNode(tools);
}

/**
 * Per-tool timeout configuration
 * Different tools have different complexity and execution times
 */
const TOOL_TIMEOUTS = {
  // Fast tools - 5 seconds
  get_current_datetime: 5000,
  get_customer_full_name: 5000,

  // Medium tools - 15 seconds
  get_customer_info: 15000,
  get_customer_phone_number: 15000,
  get_customer_pets: 15000,
  get_customer_appointments: 15000,
  get_service_list: 15000,
  get_locations: 15000,
  add_pet: 15000,

  // Complex tools - 30 seconds
  book_appointment: 30000,
  get_available_times: 30000,
  reschedule_appointment: 30000,
  cancel_appointment: 30000,
  get_location_choices: 30000,

  // Very complex tools - 45 seconds
  get_staff_list: 45000, // With availability checking across multiple staff
};

/**
 * Get timeout for a specific tool
 * @param {string} toolName - Tool name
 * @returns {number} Timeout in milliseconds
 */
function getToolTimeout(toolName) {
  return TOOL_TIMEOUTS[toolName] || 15000; // Default 15s
}

/**
 * Execute a function with timeout
 * Prevents tools from hanging indefinitely
 *
 * @param {Function} fn - Function to execute
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} operationName - Name for error messages
 * @returns {Promise} Result or timeout error
 */
async function executeWithTimeout(fn, timeoutMs, operationName) {
  return Promise.race([
    fn(),
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`${operationName} timed out after ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ]);
}

/**
 * Execute tool with retry logic for transient failures
 * @param {Function} fn - Function to execute
 * @param {string} toolName - Tool name for logging
 * @param {Object} context - Logging context
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Promise} Result or throws error
 */
async function executeWithRetry(fn, toolName, context, maxRetries = 2) {
  const { platform, chatId } = context;
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delayMs = 1000 * attempt; // Exponential backoff: 1s, 2s
        logger.messageFlow.info(
          platform,
          chatId,
          "tool-retry",
          `Retrying ${toolName} (attempt ${attempt + 1}/${maxRetries + 1}) after ${delayMs}ms delay`
        );
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }

      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry for validation errors (case-insensitive check)
      const errorLower = error.message.toLowerCase();
      if (errorLower.includes('validation') ||
          errorLower.includes('invalid') ||
          errorLower.includes('required') ||
          errorLower.includes('not qualified')) { // Staff qualification errors
        logger.messageFlow.info(
          platform,
          chatId,
          "tool-retry-skip",
          `Skipping retry for ${toolName} - validation error: ${error.message}`
        );
        throw error;
      }

      // Don't retry for authorization errors
      if (error.message.includes('unauthorized') ||
          error.message.includes('forbidden') ||
          error.message.includes('authorization')) {
        logger.messageFlow.info(
          platform,
          chatId,
          "tool-retry-skip",
          `Skipping retry for ${toolName} - authorization error: ${error.message}`
        );
        throw error;
      }

      // Don't retry circuit breaker errors
      if (error.message.includes('temporarily unavailable')) {
        throw error;
      }

      // Retry for network/timeout/connection errors
      if (attempt < maxRetries) {
        logger.messageFlow.warning(
          platform,
          chatId,
          "tool-retry-scheduled",
          `Tool ${toolName} failed with "${error.message}", will retry...`
        );
        continue;
      }
    }
  }

  logger.messageFlow.error(
    platform,
    chatId,
    "tool-retry-exhausted",
    `Tool ${toolName} failed after ${maxRetries + 1} attempts: ${lastError.message}`
  );
  throw lastError;
}

/**
 * Validate tool call parameters before execution
 * Catches common errors early to provide better feedback
 * @param {string} toolName - Tool name
 * @param {Object} args - Tool arguments
 * @returns {Object} { valid: boolean, error?: string }
 */
function validateToolCall(toolName, args) {
  const validators = {
    book_appointment: (args) => {
      // Check required fields
      if (!args.service_name || typeof args.service_name !== 'string') {
        return { valid: false, error: 'service_name is required and must be a string' };
      }

      if (!args.appointment_time || typeof args.appointment_time !== 'string') {
        return { valid: false, error: 'appointment_time is required and must be a string' };
      }

      // Check for obviously invalid times
      const timeStr = args.appointment_time.toLowerCase();
      if (timeStr.includes('yesterday') || timeStr.includes('last week')) {
        return { valid: false, error: 'Cannot book appointments in the past' };
      }

      // Check time format contains both date and time
      const hasDatePart = /today|tomorrow|next|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{4}-\d{2}-\d{2}/.test(timeStr);
      const hasTimePart = /\d{1,2}:\d{2}|\d{1,2}\s*(am|pm)|at\s+\d/.test(timeStr);

      if (!hasDatePart || !hasTimePart) {
        return { valid: false, error: 'appointment_time must include both date and time (e.g., "tomorrow at 2pm", "2024-12-25 at 14:00")' };
      }

      return { valid: true };
    },

    reschedule_appointment: (args) => {
      if (!args.appointment_id || typeof args.appointment_id !== 'string') {
        return { valid: false, error: 'appointment_id is required and must be a string' };
      }

      if (!args.new_appointment_text_time || typeof args.new_appointment_text_time !== 'string') {
        return { valid: false, error: 'new_appointment_text_time is required and must be a string' };
      }

      return { valid: true };
    },

    cancel_appointment: (args) => {
      if (!args.appointment_id || typeof args.appointment_id !== 'string') {
        return { valid: false, error: 'appointment_id is required and must be a string' };
      }
      return { valid: true };
    },

    get_available_times: (args) => {
      if (!args.service_name || typeof args.service_name !== 'string') {
        return { valid: false, error: 'service_name is required and must be a string' };
      }

      if (!args.appointment_date || typeof args.appointment_date !== 'string') {
        return { valid: false, error: 'appointment_date is required and must be a string' };
      }

      return { valid: true };
    },

    add_pet: (args) => {
      if (!args.pet_name || typeof args.pet_name !== 'string') {
        return { valid: false, error: 'pet_name is required and must be a string' };
      }

      if (!args.pet_type || !['dog', 'cat', 'other'].includes(args.pet_type)) {
        return { valid: false, error: 'pet_type is required and must be one of: dog, cat, other' };
      }

      return { valid: true };
    },

    get_customer_info: (args) => {
      if (!args.full_name || typeof args.full_name !== 'string') {
        return { valid: false, error: 'full_name is required and must be a string' };
      }

      if (!args.phone_number || typeof args.phone_number !== 'string') {
        return { valid: false, error: 'phone_number is required and must be a string' };
      }

      return { valid: true };
    },
  };

  const validator = validators[toolName];
  return validator ? validator(args) : { valid: true };
}

/**
 * Tool result cache for read-only operations
 * Conversation-scoped caching to reduce database load
 * FIXED: Issue #10 - Include companyId in cache to prevent cross-company collisions
 */
class ConversationToolCache {
  constructor(chatId, companyId, ttl = null) { // Use per-tool TTL
    this.chatId = chatId;
    this.companyId = companyId; // FIXED: Store companyId for cache isolation
    this.cache = new Map();
    // Per-tool TTL configuration
    this.toolTTLs = {
      get_service_list: 300000, // 5 min - services rarely change
      get_locations: 60000, // 1 min - locations can be temporarily closed
      get_current_datetime: 60000, // 1 min
      get_customer_pets: 300000, // 5 min - pets rarely change
      get_location_choices: 60000, // 1 min
      get_staff_list: 30000, // 30 sec - availability changes frequently
    };
  }

  /**
   * Generate cache key for a tool call
   * Returns null if tool is not cacheable
   * FIXED: All keys now include companyId to prevent cross-company data leakage
   */
  getCacheKey(toolName, args) {
    // FIXED: Prefix all keys with companyId for isolation
    const prefix = `${this.companyId}:`;

    const cacheableTools = {
      // Service list rarely changes - cache for full TTL
      get_service_list: (args) => `${prefix}${toolName}:${args.pet_type || 'all'}`,

      // Locations never change during conversation
      get_locations: () => `${prefix}${toolName}`,

      // Current datetime - cache for 1 minute only
      get_current_datetime: () => {
        const minute = Math.floor(Date.now() / 60000);
        return `${prefix}${toolName}:${minute}`;
      },

      // Customer pets - cache per chat AND company
      get_customer_pets: () => `${prefix}${toolName}:${this.chatId}`,

      // Location choices for service - stable during conversation
      get_location_choices: (args) => `${prefix}${toolName}:${args.service_name}`,
    };

    const keyFn = cacheableTools[toolName];
    return keyFn ? keyFn(args) : null; // null = not cacheable
  }

  get(key, toolName) {
    if (!key) return null;

    const entry = this.cache.get(key);
    if (!entry) return null;

    // Use tool-specific TTL
    const ttl = this.toolTTLs[toolName] || 60000; // Default 1 min

    // Check TTL
    if (Date.now() - entry.timestamp > ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  set(key, value) {
    if (!key) return;
    this.cache.set(key, { value, timestamp: Date.now() });
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }
}

// Global cache registry - one cache per conversation
// FIXED: Issue #10 - Use companyId:chatId as key to prevent cross-company collisions
const conversationCaches = new Map();

/**
 * Get or create conversation cache
 * FIXED: Issue #10 - Include companyId in cache key for proper isolation
 *
 * @param {string} chatId - Chat identifier
 * @param {string} companyId - Company identifier for isolation
 * @returns {ConversationToolCache} Cache instance
 */
function getConversationCache(chatId, companyId) {
  // FIXED: Use compound key to ensure company isolation
  const cacheKey = `${companyId}:${chatId}`;

  if (!conversationCaches.has(cacheKey)) {
    conversationCaches.set(cacheKey, new ConversationToolCache(chatId, companyId));
  }
  return conversationCaches.get(cacheKey);
}

/**
 * Cleanup old conversation caches
 * Runs periodically to prevent memory leaks
 */
function cleanupConversationCaches() {
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;
  let cleanedCount = 0;

  for (const [chatId, cache] of conversationCaches.entries()) {
    // Remove caches with no entries or very old
    if (cache.size() === 0) {
      conversationCaches.delete(chatId);
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    logger.messageFlow.info(
      'system',
      'cache-cleanup',
      'cleanup-complete',
      `Cleaned up ${cleanedCount} conversation caches`
    );
  }
}

// Cleanup every 15 minutes
setInterval(cleanupConversationCaches, 15 * 60 * 1000);

/**
 * Tool dependency configuration
 * Defines which tools must execute before others
 *
 * IMPORTANT: Dependencies are tried in order. If an early dependency can't be auto-injected,
 * later ones will be tried as fallbacks.
 *
 * NOTE: Only include tools that can be auto-injected from state data.
 * Tools require the following state data to be auto-injectable:
 * - get_customer_info: requires state.fullName AND state.phoneNumber
 * - get_customer_full_name: requires state.fullName
 * - get_customer_phone_number: NOT auto-injectable (used to collect phone from user, not retrieve)
 * - get_customer_appointments: no requirements (can always auto-inject)
 *
 * NOTE ON book_appointment: book_appointment no longer requires get_customer_info as a dependency
 * because book_appointment_refactored now handles missing customer information internally
 * by returning needs_information responses. This prevents dependency injection failures when
 * phone number is missing from state.
 */
const TOOL_DEPENDENCIES = {
  // book_appointment: No longer requires dependencies - handles missing info internally
  reschedule_appointment: ['get_customer_appointments'],
  cancel_appointment: ['get_customer_appointments'],
};

/**
 * Auto-inject missing dependency tool calls
 * When a tool requires dependencies that weren't called, automatically inject them
 *
 * @param {Array} toolCalls - Original tool calls from the agent
 * @param {Object} state - Conversation state with contact info
 * @returns {Array} Tool calls with auto-injected dependencies
 */
function autoInjectMissingDependencies(toolCalls, state) {
  const injectedCalls = [...toolCalls];
  const callsByName = new Map();
  let injectionCount = 0;

  // Index existing calls by name
  toolCalls.forEach(tc => {
    if (!callsByName.has(tc.name)) {
      callsByName.set(tc.name, []);
    }
    callsByName.get(tc.name).push(tc);
  });

  // Check each tool call for missing dependencies
  for (const toolCall of toolCalls) {
    const deps = TOOL_DEPENDENCIES[toolCall.name] || [];
    let satisfiedDependency = false;

    // Try to satisfy at least ONE dependency from the list
    // Dependencies are listed in order of preference
    for (const dep of deps) {
      const depCalls = callsByName.get(dep) || [];

      // Skip if this dependency is already satisfied
      if (depCalls.length > 0) {
        satisfiedDependency = true;
        continue;
      }

      // Try to auto-inject this dependency
      let canInject = false;
      let injectedArgs = {};

      if (dep === 'get_customer_info') {
        // Requires both fullName AND phoneNumber
        if (state.fullName && state.phoneNumber) {
          canInject = true;
          injectedArgs = {
            full_name: state.fullName,
            phone_number: state.phoneNumber
          };
        }
      } else if (dep === 'get_customer_full_name') {
        // Requires fullName from state
        if (state.fullName) {
          canInject = true;
          injectedArgs = {
            full_name: state.fullName
          };
        }
      } else if (dep === 'get_customer_appointments') {
        // No arguments needed
        canInject = true;
        injectedArgs = {};
      }
      // Note: get_customer_phone_number is NOT auto-injectable
      // It's used to collect phone numbers from users, not retrieve them from state

      // If we can inject this dependency, do it
      if (canInject) {
        logger.messageFlow.warning(
          state.platform || 'system',
          state.chatId || 'unknown',
          'auto-inject-dependency',
          `Tool ${toolCall.name} requires ${dep} but it was not called. Auto-injecting ${dep}...`
        );

        // Create the injected tool call
        // FIXED: Keep ID under 40 chars for OpenAI API (format: inj_<timestamp>_<count>)
        const timestamp = Date.now().toString(36); // Base36 encoding for shorter string
        const injectedCall = {
          id: `inj_${timestamp}_${injectionCount}`, // Max ~25 chars
          name: dep,
          args: injectedArgs,
          type: 'function',
          injected: true // Mark as auto-injected for tracking
        };

        // Add to the beginning so dependencies execute first
        injectedCalls.unshift(injectedCall);

        // Update the index
        if (!callsByName.has(dep)) {
          callsByName.set(dep, []);
        }
        callsByName.get(dep).push(injectedCall);

        injectionCount++;
        satisfiedDependency = true;

        logger.messageFlow.info(
          state.platform || 'system',
          state.chatId || 'unknown',
          'dependency-injected',
          `Auto-injected ${dep} as dependency for ${toolCall.name}`,
          { injectedArgs }
        );

        // Stop trying other dependencies - we satisfied one
        break;
      } else {
        // Can't inject this one, try next dependency
        logger.messageFlow.info(
          state.platform || 'system',
          state.chatId || 'unknown',
          'auto-inject-skip',
          `Cannot auto-inject ${dep} for ${toolCall.name} - insufficient data in state`
        );
      }
    }

    // Log warning if NO dependencies could be satisfied
    if (!satisfiedDependency && deps.length > 0) {
      logger.messageFlow.warning(
        state.platform || 'system',
        state.chatId || 'unknown',
        'auto-inject-failed-all',
        `Could not satisfy any dependencies for ${toolCall.name}. Required one of: ${deps.join(', ')}`
      );
    }
  }

  if (injectionCount > 0) {
    logger.messageFlow.info(
      state.platform || 'system',
      state.chatId || 'unknown',
      'dependencies-auto-injected',
      `Auto-injected ${injectionCount} missing dependencies`,
      {
        original_count: toolCalls.length,
        final_count: injectedCalls.length
      }
    );
  }

  return injectedCalls;
}

/**
 * Group tools by dependency order for sequential execution
 * FIXED: Issue #8 - Check that required dependencies are actually present
 *
 * @param {Array} toolCalls - Tool calls to group (may include auto-injected dependencies)
 * @returns {Array<Array>} Groups of tool calls to execute sequentially
 */
function groupToolsByDependencies(toolCalls) {
  const groups = [];
  const executed = new Set();
  const callsByName = new Map();

  // Index calls by name
  toolCalls.forEach(tc => {
    if (!callsByName.has(tc.name)) {
      callsByName.set(tc.name, []);
    }
    callsByName.get(tc.name).push(tc);
  });

  let iterations = 0;
  const maxIterations = toolCalls.length + 1; // Prevent infinite loops

  while (executed.size < toolCalls.length && iterations < maxIterations) {
    iterations++;

    const currentGroup = toolCalls.filter(tc => {
      // Already executed
      if (executed.has(tc.id)) return false;

      // Check if dependencies are satisfied
      const deps = TOOL_DEPENDENCIES[tc.name] || [];

      // Check if at least ONE dependency is satisfied (not all required)
      // After auto-injection, at least one dependency should be present
      let hasSatisfiedDependency = false;
      let allDependenciesExecuted = false;

      for (const dep of deps) {
        const depCalls = callsByName.get(dep) || [];

        if (depCalls.length > 0) {
          hasSatisfiedDependency = true;

          // Check if any dependency call is not yet executed
          const hasUnexecutedDeps = depCalls.some(depCall => !executed.has(depCall.id));
          if (!hasUnexecutedDeps) {
            // This dependency is satisfied AND executed
            allDependenciesExecuted = true;
            break; // We have at least one satisfied dep, that's enough
          }
        }
      }

      // If no dependencies were satisfied at all, this is critical
      if (!hasSatisfiedDependency && deps.length > 0) {
        logger.messageFlow.error(
          'system',
          'dependency-check',
          'critical-missing-dependency',
          new Error(`CRITICAL: Tool ${tc.name} requires one of [${deps.join(', ')}] but none are present after auto-injection`)
        );
        // Block execution - this should not happen after auto-injection
        return false;
      }

      // If we have dependencies but none are executed yet, wait
      if (hasSatisfiedDependency && !allDependenciesExecuted) {
        return false; // Can't execute yet, dependencies pending
      }

      // All dependencies satisfied
      return true;
    });

    if (currentGroup.length === 0) {
      // No progress - might be circular dependency or all done
      break;
    }

    groups.push(currentGroup);
    currentGroup.forEach(tc => executed.add(tc.id));
  }

  // Add any remaining tools (shouldn't happen unless circular dependencies)
  const remaining = toolCalls.filter(tc => !executed.has(tc.id));
  if (remaining.length > 0) {
    logger.messageFlow.warning(
      'system',
      'dependency-check',
      'circular-dependency-detected',
      `${remaining.length} tools could not be ordered due to circular dependencies: ${remaining.map(tc => tc.name).join(', ')}`
    );
    groups.push(remaining);
  }

  return groups;
}

/**
 * Custom tool executor with logging and error handling
 */
export async function toolExecutorNode(state) {
  const { toolCalls, chatId, platform, companyId, timezone, workingHours } = state;

  if (!toolCalls || toolCalls.length === 0) {
    logger.messageFlow.warning(
      platform,
      chatId,
      "tool-executor",
      "No tool calls to execute"
    );
    return {
      currentStep: "agent",
    };
  }

  logger.messageFlow.info(
    platform,
    chatId,
    "tool-executor",
    `Executing ${toolCalls.length} tools`
  );

  try {
    const tools = createLangChainTools(platform, {
      chat_id: chatId,
      company_id: companyId,
      platform,  // AUTHORIZATION FIX: Include platform in context for verifyAuthorization
      timezone,
      working_hours: workingHours,
    });

    // Create a map of tool names to tools
    const toolMap = {};
    for (const tool of tools) {
      toolMap[tool.name] = tool;
    }

    // Get conversation cache for read-only tools
    // FIXED: Issue #10 - Pass companyId for proper cache isolation
    const cache = getConversationCache(chatId, companyId);

    // Auto-inject missing dependencies before execution
    const toolCallsWithDependencies = autoInjectMissingDependencies(toolCalls, state);

    // Group tools by dependencies for proper execution order
    const toolGroups = groupToolsByDependencies(toolCallsWithDependencies);

    if (toolGroups.length > 1) {
      logger.messageFlow.info(
        platform,
        chatId,
        "tool-executor",
        `Executing ${toolCallsWithDependencies.length} tools in ${toolGroups.length} dependency groups`
      );
    } else {
      logger.messageFlow.info(
        platform,
        chatId,
        "tool-executor",
        `Executing ${toolCallsWithDependencies.length} tools in parallel (no dependencies)`
      );
    }

    // Execute tool groups sequentially, tools within each group in parallel
    let allToolResults = [];

    for (let groupIndex = 0; groupIndex < toolGroups.length; groupIndex++) {
      const group = toolGroups[groupIndex];

      if (toolGroups.length > 1) {
        logger.messageFlow.info(
          platform,
          chatId,
          "tool-executor-group",
          `Executing group ${groupIndex + 1}/${toolGroups.length}: ${group.map(tc => tc.name).join(', ')}`
        );
      }

      const groupPromises = group.map(async (toolCall) => {
        const toolName = toolCall.name;
        const tool = toolMap[toolName];
        const startTime = Date.now();

        if (!tool) {
          logger.messageFlow.error(
            platform,
            chatId,
            "tool-executor",
            new Error(`Tool ${toolName} not found`)
          );
          return {
            role: "tool",
            tool_call_id: toolCall.id,
            name: toolName,
            content: JSON.stringify({
              error: `Tool ${toolName} not found`,
            }),
            executionTime: 0,
            success: false,
          };
        }

        // PRE-EXECUTION VALIDATION: Check parameters before execution
        const validation = validateToolCall(toolName, toolCall.args);
        if (!validation.valid) {
          logger.messageFlow.warning(
            platform,
            chatId,
            "tool-validation-failed",
            `${toolName} validation failed: ${validation.error}`,
            { args: toolCall.args }
          );

          return {
            role: "tool",
            tool_call_id: toolCall.id,
            name: toolName,
            content: JSON.stringify({
              error: validation.error,
              type: "validation_error",
            }),
            executionTime: Date.now() - startTime,
            success: false,
          };
        }

        // CACHING: Check cache for read-only tools
        const cacheKey = cache.getCacheKey(toolName, toolCall.args);
        if (cacheKey) {
          const cachedResult = cache.get(cacheKey, toolName);
          if (cachedResult) {
            logger.messageFlow.info(
              platform,
              chatId,
              "tool-cache-hit",
              `${toolName} served from cache`,
              { cacheKey }
            );

            return {
              role: "tool",
              tool_call_id: toolCall.id,
              name: toolName,
              content: cachedResult,
              executionTime: Date.now() - startTime,
              success: true,
              fromCache: true,
            };
          }
        }

        // Get or create circuit breaker for this tool (isolated per company)
        const circuitBreaker = getCircuitBreaker(companyId, toolName);

        try {
          logger.messageFlow.info(
            platform,
            chatId,
            "tool-execution",
            `Executing ${toolName} (circuit breaker: ${circuitBreaker.getStatus().state})`,
            { args: toolCall.args }
          );

          // Get tool-specific timeout
          const toolTimeout = getToolTimeout(toolName);

          logger.messageFlow.info(
            platform,
            chatId,
            "tool-timeout-config",
            `${toolName} timeout: ${toolTimeout}ms`
          );

          // Execute tool with retry logic, circuit breaker, and timeout
          const result = await executeWithRetry(
            async () => {
              return await circuitBreaker.execute(async () => {
                return await executeWithTimeout(
                  () => tool.invoke(toolCall.args),
                  toolTimeout,
                  `Tool ${toolName}`
                );
              });
            },
            toolName,
            { platform, chatId },
            2 // Max 2 retries
          );

          const executionTime = Date.now() - startTime;

          logger.messageFlow.info(
            platform,
            chatId,
            "tool-result",
            `Tool ${toolName} completed in ${executionTime}ms`,
            { result: result?.substring(0, 100) }
          );

          // Cache result if cacheable
          if (cacheKey) {
            cache.set(cacheKey, result);
            logger.messageFlow.info(
              platform,
              chatId,
              "tool-cache-set",
              `${toolName} result cached`,
              { cacheKey }
            );
          }

          return {
            role: "tool",
            tool_call_id: toolCall.id,
            name: toolName,
            content: result,
            executionTime,
            success: true,
          };
        } catch (error) {
          const executionTime = Date.now() - startTime;

          // Check if this was a circuit breaker rejection
          const isCircuitBreakerError = error.message.includes('temporarily unavailable due to repeated failures');

          logger.messageFlow.error(
            platform,
            chatId,
            `tool-execution-${toolName}`,
            error,
            {
              circuitBreakerState: circuitBreaker.getStatus().state,
              isCircuitBreakerRejection: isCircuitBreakerError
            }
          );

          return {
            role: "tool",
            tool_call_id: toolCall.id,
            name: toolName,
            content: JSON.stringify({
              error: error.message,
              type: isCircuitBreakerError ? "circuit_breaker_error" : "tool_execution_error",
            }),
            executionTime,
            success: false,
          };
        }
      });

      // Wait for all tools in this group to complete
      const groupResults = await Promise.all(groupPromises);
      allToolResults = [...allToolResults, ...groupResults];
    }

    const toolResults = allToolResults;

    // Log overall execution time
    const totalExecutionTime = Math.max(...toolResults.map(r => r.executionTime));
    logger.messageFlow.info(
      platform,
      chatId,
      "tool-executor",
      `All tools completed in ${totalExecutionTime}ms (parallel execution)`
    );

    // Track metrics for each tool
    for (const result of toolResults) {
      const errorInfo = !result.success ? JSON.parse(result.content) : null;

      await metricsTracker.trackToolExecution({
        toolName: result.name,
        success: result.success,
        executionTime: result.executionTime,
        platform,
        chatId,
        companyId,
        errorMessage: errorInfo?.error || null,
        errorType: errorInfo?.type || null,
      });
    }

    // Extract messages (remove metadata used for logging)
    const toolMessages = toolResults.map(({ executionTime, success, ...message }) => message);

    // HYBRID MODE: After tool execution, always route back to Gemini for final response
    // Clear tool calls since they've been executed, and set step for Gemini continuation
    logger.messageFlow.info(
      platform,
      chatId,
      "tool-execution-complete",
      `Tool execution finished, routing back to Gemini for final response (hybrid mode)`
    );

    // Parse tool results for validation
    const parsedResults = toolResults.map(result => {
      try {
        return {
          name: result.name,
          success: result.success,
          data: result.success ? JSON.parse(result.content) : null,
          error: !result.success ? JSON.parse(result.content) : null,
        };
      } catch (e) {
        // Content is not JSON (plain string result)
        return {
          name: result.name,
          success: result.success,
          data: result.success ? result.content : null,
          error: !result.success ? result.content : null,
        };
      }
    });

    // Check for needs_selection in tool results
    const needsSelectionResults = parsedResults.filter(r =>
      r.data?.needs_selection
    );

    let bookingInProgressUpdate = {};
    if (needsSelectionResults.length > 0) {
      const selectionNeeded = needsSelectionResults[0];

      bookingInProgressUpdate = {
        bookingInProgress: {
          originalParams: selectionNeeded.data.context,
          needsSelection: selectionNeeded.data.needs_selection,
          timestamp: Date.now()
        }
      };
    }

    // IMPORTANT: Return ONLY new tool messages - the reducer will append them
    // The ConversationState.messages reducer automatically appends to existing messages
    // Returning the full history would cause duplication!
    return {
      messages: toolMessages, // Return only new tool messages - reducer will append
      toolCalls: [], // Clear executed tool calls
      lastToolResults: parsedResults, // Store for validation
      currentStep: "continue_with_gemini", // FIXED: Signal Gemini to generate final response after tool execution
      activeProvider: "gemini", // Ensure we return to Gemini
      ...bookingInProgressUpdate
    };
  } catch (error) {
    logger.messageFlow.error(platform, chatId, "tool-executor", error);

    return {
      error: {
        message: error.message,
        type: "tool_executor_error",
      },
      currentStep: "agent",
    };
  }
}
