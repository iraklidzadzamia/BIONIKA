# Tool Execution Improvements - Quick Reference

**Quick guide for developers working with the improved tool execution system**

---

## 🎯 What Changed?

Your LangGraph tool execution now has:
1. **Smart timeouts** - Fast tools finish faster
2. **Validation** - Catches errors before execution
3. **Caching** - Repeated queries are instant
4. **Dependencies** - Tools run in correct order
5. **Retries** - Network issues auto-recover
6. **Better enforcement** - Fewer false positives

---

## 🚀 Quick Examples

### Adding a New Tool with Custom Timeout

```javascript
// In toolExecutor.js, add to TOOL_TIMEOUTS:
const TOOL_TIMEOUTS = {
  // ... existing tools
  your_new_tool: 20000, // 20 seconds
};
```

**Timeout Guidelines**:
- Fast (5s): Simple reads, calculations
- Medium (15s): Database queries, basic operations
- Complex (30s): Multi-step operations, booking logic
- Very complex (45s): Availability checks, complex queries

---

### Adding Validation for Your Tool

```javascript
// In toolExecutor.js, add to validateToolCall():
function validateToolCall(toolName, args) {
  const validators = {
    // ... existing validators
    your_new_tool: (args) => {
      if (!args.required_field) {
        return { valid: false, error: 'required_field is required' };
      }
      return { valid: true };
    },
  };
  // ...
}
```

---

### Making Your Tool Cacheable

```javascript
// In ConversationToolCache.getCacheKey():
const cacheableTools = {
  // ... existing tools
  your_read_only_tool: (args) => `${toolName}:${args.key_param}`,
};
```

**Cacheable tools**:
- ✅ Read-only operations (get_service_list, get_locations)
- ✅ Rarely-changing data (service lists, locations)
- ❌ Mutable operations (booking, canceling)
- ❌ User-specific real-time data (current appointments)

---

### Adding Tool Dependencies

```javascript
// In toolExecutor.js, add to TOOL_DEPENDENCIES:
const TOOL_DEPENDENCIES = {
  // ... existing dependencies
  your_tool: ['dependency_tool_1', 'dependency_tool_2'],
};
```

**Example**: If `create_invoice` needs customer data first:
```javascript
const TOOL_DEPENDENCIES = {
  create_invoice: ['get_customer_info'],
};
```

---

## 🔍 Monitoring Your Tools

### Check Tool Performance

Look for these log events:
```
tool-cache-hit        → Tool served from cache
tool-retry            → Tool is retrying after failure
tool-validation-failed → Parameters were invalid
tool-timeout-config   → Shows configured timeout
tool-executor-group   → Dependency group execution
```

### Example Log Flow (Successful):
```
[tool-executor] Executing 2 tools in parallel
[tool-timeout-config] get_service_list timeout: 15000ms
[tool-cache-hit] get_service_list served from cache
[tool-result] get_service_list completed in 2ms
```

### Example Log Flow (With Retry):
```
[tool-execution] Executing book_appointment
[tool-retry-scheduled] book_appointment failed, will retry...
[tool-retry] Retrying book_appointment (attempt 2/3) after 1000ms delay
[tool-result] book_appointment completed in 1523ms
```

---

## 🐛 Debugging Tips

### Tool Taking Too Long?
1. Check timeout configuration: `grep "your_tool:" toolExecutor.js`
2. Increase if legitimate: `your_tool: 45000`
3. Or optimize the tool's implementation

### Tool Failing Validation?
```javascript
// Check validation logic:
const validation = validateToolCall('your_tool', args);
console.log(validation); // { valid: false, error: "..." }
```

### Cache Not Working?
```javascript
// Verify cache key generation:
const cache = getConversationCache(chatId);
const key = cache.getCacheKey('your_tool', args);
console.log(key); // Should return string, not null
```

### Dependency Order Wrong?
```javascript
// Test dependency grouping:
const groups = groupToolsByDependencies(toolCalls);
console.log(groups); // [[group1], [group2], ...]
// Group 1 should have dependencies, Group 2 should have dependents
```

---

## 📊 Performance Metrics

### Check Cache Hit Rate
```javascript
// In your test:
const cache = getConversationCache(testChatId);
const sizeBefore = cache.size();
// Execute tool twice
const sizeAfter = cache.size();
// sizeAfter should be 1 (cached)
```

### Measure Timeout Improvements
```bash
# Before: All tools had 30s timeout
# After: Fast tools complete in 5s
grep "tool-result" logs.txt | grep "get_current_datetime"
# Should show ~5s timeout, not 30s
```

---

## ⚠️ Common Pitfalls

### ❌ Don't Cache Mutable Data
```javascript
// BAD - User appointments change frequently
get_customer_appointments: () => toolName, // ❌

// GOOD - Only cache stable data
get_service_list: (args) => `${toolName}:${args.pet_type}`, // ✅
```

### ❌ Don't Set Dependencies on Independent Tools
```javascript
// BAD - Creates unnecessary sequential execution
const TOOL_DEPENDENCIES = {
  get_locations: ['get_service_list'], // ❌ No actual dependency
};

// GOOD - Only real dependencies
const TOOL_DEPENDENCIES = {
  book_appointment: ['get_customer_info'], // ✅ Actually needs customer data
};
```

### ❌ Don't Validate Business Logic
```javascript
// BAD - Validation should be simple parameter checks
if (!checkStaffAvailabilityInDatabase(args.staff_id)) {
  return { valid: false, error: 'Staff not available' }; // ❌
}

// GOOD - Just check parameter presence/format
if (!args.staff_id || typeof args.staff_id !== 'string') {
  return { valid: false, error: 'staff_id is required' }; // ✅
}
```

---

## 🧪 Testing Your Changes

### Test New Tool Timeout
```javascript
test('my_tool uses correct timeout', async () => {
  const timeout = getToolTimeout('my_tool');
  expect(timeout).toBe(15000);
});
```

### Test New Validation
```javascript
test('my_tool validates parameters', () => {
  const validation = validateToolCall('my_tool', {});
  expect(validation.valid).toBe(false);
  expect(validation.error).toContain('required');
});
```

### Test Cache Behavior
```javascript
test('my_tool caches results', async () => {
  const cache = getConversationCache('test-chat');
  const key = cache.getCacheKey('my_tool', { param: 'value' });

  expect(key).toBeTruthy();
  cache.set(key, 'result');
  expect(cache.get(key)).toBe('result');
});
```

### Test Dependency Order
```javascript
test('my_tool executes after dependency', () => {
  const calls = [
    { id: '1', name: 'my_tool' },
    { id: '2', name: 'dependency_tool' }
  ];

  const groups = groupToolsByDependencies(calls);
  expect(groups[0].map(t => t.name)).toContain('dependency_tool');
  expect(groups[1].map(t => t.name)).toContain('my_tool');
});
```

---

## 📚 Configuration Reference

### Timeout Configuration
```javascript
const TOOL_TIMEOUTS = {
  tool_name: 15000, // milliseconds
};
```

### Cache TTL
```javascript
// Global TTL (default 5 minutes)
new ConversationToolCache(chatId, 300000);

// Per-tool override in getCacheKey():
get_current_datetime: () => {
  const minute = Math.floor(Date.now() / 60000);
  return `${toolName}:${minute}`; // 1 minute TTL
}
```

### Retry Configuration
```javascript
// In tool execution (default 2 retries)
await executeWithRetry(fn, toolName, context, 2);
```

### Circuit Breaker Configuration
```javascript
// Global settings (in getCircuitBreaker)
new ToolCircuitBreaker(
  5,      // failureThreshold - open after 5 failures
  60000,  // recoveryTimeout - 60s before retry
  toolName
);
```

---

## 🔗 Related Files

- **Tool Executor**: `packages/meta-bot/langgraph/nodes/toolExecutor.js`
- **Gemini Agent**: `packages/meta-bot/langgraph/nodes/geminiAgent.js`
- **Tool Definitions**: `packages/meta-bot/langgraph/tools/index.js`
- **Tool Handlers**: `packages/meta-bot/lib/tools/index.js`

---

## 💡 Best Practices

1. **Set realistic timeouts** - Don't over-provision, but allow enough time
2. **Cache read-only data** - Huge performance boost for static data
3. **Validate early** - Catch parameter errors before expensive operations
4. **Define real dependencies** - Only add when tools truly depend on each other
5. **Monitor cache hits** - Track effectiveness of caching strategy
6. **Log clearly** - Use descriptive log messages for debugging

---

## 🆘 Need Help?

1. Check full documentation: [LANGGRAPH_IMPROVEMENTS_SUMMARY.md](LANGGRAPH_IMPROVEMENTS_SUMMARY.md)
2. Review test examples: `packages/meta-bot/langgraph/__tests__/`
3. Check logs for new event types: `tool-cache-*`, `tool-retry`, `tool-validation-*`

---

**Last Updated**: 2025-11-11
**Version**: 1.0
