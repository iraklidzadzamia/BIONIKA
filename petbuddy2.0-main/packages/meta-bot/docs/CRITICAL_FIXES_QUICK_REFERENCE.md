# Critical Logical Fixes - Quick Reference

## 🚨 TOP 3 CRITICAL ISSUES

### 1. Staff Selection Shows Unavailable Staff
**File:** `packages/meta-bot/lib/toolHandlers.js`  
**Lines:** 258-330

**Problem:** When multiple staff are qualified, system returns ALL qualified staff in `needs_selection`, not filtering by availability at requested time.

**Quick Fix:**
```javascript
// Line ~307 - After availability checks, before returning needs_selection
if (qualifiedStaffIds.length > 1 && !staff_id) {
  // ... existing availability checks ...
  
  // NEW: Filter staffOptions to only show available staff
  const availableStaffOptions = staffOptions.filter(staff => 
    availableStaffIds.includes(staff.id)
  );
  
  return {
    success: false,
    needs_selection: {
      type: 'staff',
      options: availableStaffOptions, // ← Use filtered list
      message: `STAFF SELECTION REQUIRED: ${availableStaffOptions.length} staff members are available at ${appointment_time}. Please ask the customer which staff member they prefer and then call book_appointment again with the staff_id parameter.`
    },
    context: { /* ... existing ... */ }
  };
}
```

---

### 2. Booking Conflicts Don't Force Alternative Times Display
**File:** `packages/meta-bot/langgraph/nodes/geminiAgent.js`  
**Lines:** 44-265 (in currentStep === "continue_with_gemini" section)

**Problem:** After booking conflict, Gemini might just say "Sorry, not available" instead of showing actual available times.

**Quick Fix:**
```javascript
// After line 59, add conflict enforcement
const bookingToolResult = lastToolResults.find(r => r.name === 'book_appointment');
const bookingFailed = bookingToolResult && !bookingToolResult.success;
const bookingConflict = bookingToolResult?.data?.conflict === true;

// NEW: Check if we need to force get_available_times
if (bookingConflict) {
  const calledAvailableTimes = lastToolResults.some(r => 
    r.name === 'get_available_times' && r.success
  );
  
  if (!calledAvailableTimes) {
    logger.messageFlow.warning(
      platform,
      chatId,
      "conflict-without-alternatives",
      "Booking conflict detected but get_available_times was not called. Forcing tool execution."
    );
    
    // Force call to get_available_times
    const conflictParams = bookingToolResult.data.get_available_times_params;
    
    return {
      currentStep: "execute_tools",
      toolCalls: [{
        id: `forced_${Date.now()}`,
        type: "function",
        function: {
          name: "get_available_times",
          arguments: JSON.stringify(conflictParams)
        }
      }],
      messages: [], // Don't add incomplete response
      activeProvider: "gemini"
    };
  }
}

// Then continue with existing validation context logic...
```

---

### 3. Graph Invocation Has No Retry Logic
**File:** `packages/meta-bot/langgraph/graph.js`  
**Lines:** 305-365

**Problem:** Temporary API failures cause complete conversation breakdown with no retry.

**Quick Fix:**
```javascript
// Replace invokeConversation function with retry-enabled version

/**
 * Invoke conversation with retry logic
 */
async function invokeConversationWithRetry(input, maxRetries = 2) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        logger.messageFlow.info(
          input.platform,
          input.chatId,
          "graph-retry",
          `Retrying graph invocation (attempt ${attempt + 1}/${maxRetries + 1}) after ${delay}ms`
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      const graph = createConversationGraph(input.aiProvider);
      const result = await graph.invoke(input, { recursionLimit: 25 });
      
      // Success - handle result
      if (result.needsHumanHandoff) {
        logger.messageFlow.info(
          input.platform,
          input.chatId,
          "human-handoff",
          `Handoff triggered: ${result.handoffReason}`
        );
        result.assistantMessage = createHandoffMessage(result.handoffReason);
      }
      
      logger.messageFlow.info(
        input.platform,
        input.chatId,
        "graph-complete",
        "Conversation graph completed",
        {
          hasMessage: !!result.assistantMessage,
          messageLength: result.assistantMessage?.length || 0,
          toolCallsCount: result.toolCalls?.length || 0,
          handoff: result.needsHumanHandoff || false,
          attempt: attempt + 1
        }
      );
      
      return result;
      
    } catch (error) {
      lastError = error;
      
      // Don't retry validation errors, quota errors, or invalid arguments
      const nonRetryableErrors = [
        'validation',
        'quota',
        'INVALID_ARGUMENT',
        'PERMISSION_DENIED',
        'UNAUTHENTICATED'
      ];
      
      const isNonRetryable = nonRetryableErrors.some(pattern => 
        error.message?.includes(pattern) || error.code?.includes(pattern)
      );
      
      if (isNonRetryable) {
        logger.messageFlow.error(
          input.platform,
          input.chatId,
          "graph-invoke-non-retryable",
          error
        );
        throw error; // Don't retry these
      }
      
      // Retry network/timeout errors
      if (attempt < maxRetries) {
        logger.messageFlow.warning(
          input.platform,
          input.chatId,
          "graph-error-retryable",
          `Graph invocation failed: ${error.message}, will retry...`,
          { attempt: attempt + 1, maxRetries: maxRetries + 1 }
        );
        continue;
      }
    }
  }
  
  // All retries exhausted
  logger.messageFlow.error(
    input.platform,
    input.chatId,
    "graph-invoke-failed",
    lastError
  );
  
  return {
    ...input,
    assistantMessage: "I apologize, but I'm having trouble processing your request right now. Please try again in a moment, or contact our support team for immediate assistance.",
    error: {
      message: lastError.message,
      type: "graph_execution_error",
      attempts: maxRetries + 1
    },
  };
}

// Update the export to use retry version
export async function invokeConversation(input) {
  return invokeConversationWithRetry(input, 2);
}
```

---

## 🔧 MEDIUM PRIORITY FIXES

### 4. Location Selection Context Not Preserved
**File:** `packages/meta-bot/langgraph/state/schema.js`

**Add to state:**
```javascript
// After bookingContext
bookingInProgress: Annotation({
  reducer: (x, y) => ({ ...(x || {}), ...(y || {}) }),
  default: () => null,
}),
```

**File:** `packages/meta-bot/langgraph/nodes/toolExecutor.js`  
**In toolExecutorNode, after line 950:**

```javascript
// Check for needs_selection in tool results
const needsSelectionResults = parsedResults.filter(r => 
  r.data?.needs_selection
);

if (needsSelectionResults.length > 0) {
  const selectionNeeded = needsSelectionResults[0];
  
  return {
    messages: toolMessages,
    toolCalls: [],
    lastToolResults: parsedResults,
    currentStep: "agent",
    activeProvider: "gemini",
    bookingInProgress: {
      originalParams: selectionNeeded.data.context,
      needsSelection: selectionNeeded.data.needs_selection,
      timestamp: Date.now()
    }
  };
}
```

**File:** `packages/meta-bot/langgraph/nodes/geminiAgent.js`  
**After line 337 (in customerContext building):**

```javascript
// Add booking in progress context
if (state.bookingInProgress) {
  const elapsed = Date.now() - state.bookingInProgress.timestamp;
  const minutes = Math.floor(elapsed / 60000);
  
  customerContext += `\n\n---\n\nBOOKING IN PROGRESS (${minutes} min ago):
Customer was trying to book with these details:
${JSON.stringify(state.bookingInProgress.originalParams, null, 2)}

Selection needed: ${state.bookingInProgress.needsSelection.type}
Options: ${JSON.stringify(state.bookingInProgress.needsSelection.options, null, 2)}

When customer makes their selection, call book_appointment with ALL the original parameters plus the ${state.bookingInProgress.needsSelection.type}_id they choose.`;
}
```

---

### 5. Reschedule Doesn't Check Staff Availability
**File:** `packages/meta-bot/lib/toolHandlers.js`  
**Lines:** 1312-1485

**Add after line 1400 (after parsing new time):**

```javascript
// NEW: Check if staff is available at new time
const startDate = moment.tz(`${parsed.date}T${parsed.start}:00`, timezone).toDate();
const endDate = moment.tz(`${parsed.date}T${parsed.end}:00`, timezone).toDate();

const availabilityCheck = await BookingService.checkAvailability(
  appointment.userId, // assigned staff
  startDate,
  endDate,
  context.company_id,
  appointment._id, // exclude current appointment from conflict check
  appointment.locationId
);

if (!availabilityCheck.available) {
  logger.messageFlow.info(
    'system',
    context.chat_id,
    'reschedule-conflict',
    `Staff unavailable at requested time: ${availabilityCheck.reason}`
  );
  
  return {
    success: false,
    conflict: true,
    reason: availabilityCheck.reason,
    message: `Cannot reschedule to ${new_appointment_text_time}: ${availabilityCheck.reason}. Please call get_available_times to find when the staff is available.`,
    suggested_action: "call_get_available_times",
    get_available_times_params: {
      service_name: serviceCategory.name,
      appointment_date: parsed.date,
      staff_id: String(appointment.userId)
    }
  };
}

// Continue with existing reschedule logic...
```

---

### 6. Tool Cache TTLs Too Long
**File:** `packages/meta-bot/langgraph/nodes/toolExecutor.js`  
**Lines:** 419-487

**Replace line 420:**
```javascript
// BEFORE:
constructor(chatId, companyId, ttl = 300000) { // 5 min default TTL

// AFTER:
constructor(chatId, companyId, ttl = null) { // Use per-tool TTL
  this.chatId = chatId;
  this.companyId = companyId;
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

// Update get method (around line 462)
get(key, toolName) {
  if (!key) return null;
  
  const entry = this.cache.get(key);
  if (!entry) return null;
  
  // Use tool-specific TTL
  const ttl = this.toolTTLs[toolName] || 60000; // Default 1 min
  
  if (Date.now() - entry.timestamp > ttl) {
    this.cache.delete(key);
    return null;
  }
  
  return entry.value;
}
```

---

## 🎯 QUICK TESTING COMMANDS

### Test Staff Selection Flow:
```bash
# Set debug mode
export DEBUG_APPOINTMENTS=true

# Test case: Multiple staff available
curl -X POST http://localhost:3003/api/test/simulate-booking \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Book grooming tomorrow at 2pm for my large dog",
    "companyId": "YOUR_COMPANY_ID",
    "chatId": "test_user_123"
  }'

# Should return needs_selection with ONLY available staff
```

### Test Booking Conflict Resolution:
```bash
# Test case: All staff booked at requested time
curl -X POST http://localhost:3003/api/test/simulate-booking \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Book grooming tomorrow at 9am",
    "companyId": "YOUR_COMPANY_ID",
    "chatId": "test_user_456"
  }'

# Should return conflict with get_available_times_params
# Verify AI automatically calls get_available_times
```

---

## 📝 VERIFICATION CHECKLIST

After applying fixes:

- [ ] Staff selection only shows available staff members
- [ ] Booking conflicts automatically trigger get_available_times
- [ ] Graph invocation retries on transient failures
- [ ] Location selection preserves all booking details
- [ ] Reschedule validates staff availability
- [ ] Tool cache uses appropriate TTLs per tool
- [ ] All tests pass: `npm test`
- [ ] Integration test booking flows end-to-end
- [ ] Monitor logs for retry attempts
- [ ] Check metrics for improved success rates

---

## 🚀 DEPLOYMENT NOTES

1. **Test in Staging First:** These fixes change core booking logic
2. **Monitor Closely:** Watch for any regressions in first 24 hours
3. **Rollback Plan:** Keep current version tagged for quick rollback
4. **Communication:** Notify team about booking flow improvements

**Estimated Implementation Time:** 4-6 hours for all critical fixes

---

*Last Updated: November 11, 2025*

