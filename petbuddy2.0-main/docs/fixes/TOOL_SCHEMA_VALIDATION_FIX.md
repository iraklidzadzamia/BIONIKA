# Tool Schema Validation Fix

**Date:** 2025-11-12 (Updated: 2025-11-12)
**Issue:** Tool auto-injection causing schema validation failures
**Status:** ✅ FIXED (Updated)

---

## Problem Summary

The `get_customer_phone_number` tool was repeatedly failing with "Received tool input did not match expected schema" error, triggering the circuit breaker after 3 consecutive failures.

### Root Cause

The auto-injection logic in [toolExecutor.js](../packages/meta-bot/langgraph/nodes/toolExecutor.js) was incorrectly configured to auto-inject `get_customer_phone_number` when it was used as a dependency for `book_appointment`.

**The fundamental issue:** `get_customer_phone_number` is designed to **COLLECT** phone numbers from users, not to retrieve them from state. This tool should NEVER be auto-injected.

```javascript
// Tool description at tools/index.js:78-95
const getCustomerPhoneNumber = new DynamicStructuredTool({
  name: "get_customer_phone_number",
  description: "Ask for the customer's phone number for registration", // ← For COLLECTING
  schema: z.object({
    phone_number: z.string().describe("The customer's phone number...")
  }),
  func: async ({ phone_number }) => {
    // Stores the phone number provided by the user
    await updateContactInfo(contact._id, { phone: phone_number });
    return { phone_number };
  }
});
```

**Result:** System tried to auto-inject this tool when phone number was missing, but the tool requires the phone number as input (which defeats the purpose of collecting it).

---

## Solution

**Removed `get_customer_phone_number` from auto-injectable dependencies entirely.**

### Changes in [toolExecutor.js:568-573](../packages/meta-bot/langgraph/nodes/toolExecutor.js#L568-L573)

```javascript
// BEFORE (BROKEN)
const TOOL_DEPENDENCIES = {
  book_appointment: ['get_customer_info', 'get_customer_phone_number'], // ❌ Wrong
  ...
};

// AFTER (FIXED)
const TOOL_DEPENDENCIES = {
  book_appointment: ['get_customer_info'], // ✅ Phone is collected within get_customer_info
  ...
};
```

### Removed Auto-Injection Logic [toolExecutor.js:616-640]

```javascript
// BEFORE (BROKEN)
} else if (dep === 'get_customer_phone_number') {
  if (state.phoneNumber) {
    canInject = true;
    injectedArgs = { phone_number: state.phoneNumber };
  }
}

// AFTER (FIXED)
// Completely removed - this tool is for COLLECTING phone numbers, not retrieving them
// Added comment explaining why it's not auto-injectable
```

### Updated Documentation [toolExecutor.js:554-567]

```javascript
/**
 * NOTE: Only include tools that can be auto-injected from state data.
 * Tools require the following state data to be auto-injectable:
 * - get_customer_info: requires state.fullName AND state.phoneNumber
 * - get_customer_full_name: requires state.fullName
 * - get_customer_phone_number: NOT auto-injectable (used to collect phone from user, not retrieve)
 * - get_customer_appointments: no requirements (can always auto-inject)
 */
```

---

## Impact

### Before Fix ❌
1. User tries to book appointment without phone number in state
2. System auto-injects `get_customer_phone_number` as dependency
3. Tool requires `phone_number` parameter, but state doesn't have it
4. Schema validation fails: "phone_number is required"
5. Retry #1, #2, #3 all fail with same error
6. Circuit breaker opens after 3 failures
7. All subsequent calls blocked for 60 seconds
8. AI cannot proceed with booking

### After Fix ✅
1. User tries to book appointment without phone number in state
2. System does NOT auto-inject `get_customer_phone_number`
3. AI naturally asks user for phone number when needed
4. User provides phone number
5. AI calls `get_customer_phone_number` with the provided number
6. Phone number stored successfully
7. Booking proceeds normally

---

## Tool Purpose Clarification

### Collection vs. Retrieval Tools

**Collection Tools** (NOT auto-injectable):
- `get_customer_phone_number`: Collects phone number from user input
- Used when: Customer provides their phone number in conversation
- Parameters: The data being collected (phone_number)

**Retrieval Tools** (Auto-injectable):
- `get_customer_info`: Retrieves and stores both name and phone
- `get_customer_full_name`: Retrieves and stores name
- Used when: Data already exists in state
- Parameters: The data from state

---

## Testing

Verified the fix with test scenarios covering:
- ✅ Booking without phone number → AI asks naturally (no auto-injection errors)
- ✅ State with phoneNumber present → get_customer_info injection succeeds
- ✅ State without phoneNumber → no auto-injection, AI asks user
- ✅ Circuit breaker no longer triggers for phone number collection
- ✅ Booking flow completes successfully after user provides phone

---

## Related Files Modified

1. **[packages/meta-bot/langgraph/nodes/toolExecutor.js](../packages/meta-bot/langgraph/nodes/toolExecutor.js)**
   - Lines 568-573: Removed `get_customer_phone_number` from TOOL_DEPENDENCIES
   - Lines 616-640: Removed auto-injection logic for `get_customer_phone_number`
   - Lines 554-567: Updated documentation to mark as NOT auto-injectable

---

## Prevention

To prevent similar issues in the future:

1. ✅ **Distinguish collection vs. retrieval tools** - tools that collect data from users should NOT be auto-injectable
2. ✅ **Verify tool purpose** before adding to auto-injection dependencies
3. ✅ **Document clearly** which tools are for collection vs. retrieval
4. ✅ **Check tool description** - if it says "ask for" or "collect", it's not auto-injectable

---

## Related Issues

This fix resolves:
- Circuit breaker being triggered repeatedly due to schema validation failures
- AI being unable to complete bookings when phone number is missing
- Unnecessary retry attempts that waste API calls
- Confusing error messages about missing phone numbers
