# Booking Conflict Flow Diagram

## Before (Old Behavior)

```
User: "Book Cat Nail Trim tomorrow at 9:00"
     |
     v
book_appointment tool
     |
     |---> Try staff #1 → BOOKING_CONFLICT ❌
     |
     |---> Try staff #2 → BOOKING_CONFLICT ❌
     |
     |---> All staff unavailable
     |
     v
throw Error("All qualified staff members are unavailable")
     |
     v
toolExecutor catches error
     |
     v
Gemini receives error message
     |
     v
Bot: "❌ Sorry, I couldn't complete the booking."
     |
     v
User: "What should I do?" 🤷 [DEAD END]
```

## After (New Behavior)

```
User: "Book Cat Nail Trim tomorrow at 9:00"
     |
     v
book_appointment tool
     |
     |---> Try staff #1 → BOOKING_CONFLICT ❌
     |      └─> Track in conflictMetadata
     |
     |---> Try staff #2 → BOOKING_CONFLICT ❌
     |      └─> Track in conflictMetadata
     |
     |---> All staff unavailable
     |
     v
return {
  success: false,
  conflict: true,
  all_staff_unavailable: true,
  conflict_metadata: {
    failedStaffCount: 2,
    conflicts: [
      { staffId: "staff1", reason: "booking_conflict", ... },
      { staffId: "staff2", reason: "booking_conflict", ... }
    ]
  },
  suggested_action: "call_get_available_times",
  get_available_times_params: {
    service_name: "Cat Nail Trim",
    appointment_date: "2025-11-06"
  },
  message: "BOOKING CONFLICT: All 2 qualified staff are unavailable..."
}
     |
     v
toolExecutor returns structured JSON (no error)
     |
     v
Gemini receives tool result with conflict: true
     |
     v
Gemini sees system instructions:
  "When conflict: true, MUST call get_available_times"
     |
     v
Gemini makes tool call: get_available_times
  - service_name: "Cat Nail Trim"
  - appointment_date: "2025-11-06"
     |
     v
get_available_times tool executes
     |
     v
return {
  success: true,
  time_ranges: [
    { start: "10:00", end: "12:00" },
    { start: "14:00", end: "17:00" }
  ]
}
     |
     v
Gemini receives available time slots
     |
     v
Bot: "I apologize, but all our staff are booked at 9:00 AM on Nov 6.
      Here are the available times:
      • 10:00 - 12:00
      • 14:00 - 17:00

      Which works best for you?"
     |
     v
User: "I'll take 10:00" ✅ [SUCCESSFUL RECOVERY]
```

## Key Differences

| Aspect | Before | After |
|--------|--------|-------|
| **Error Handling** | Throws error | Returns structured data |
| **User Guidance** | None | Automatic alternatives |
| **Tool Chain** | Stops at error | Continues to get_available_times |
| **Metadata** | Lost | Preserved & actionable |
| **User Experience** | Dead end | Self-service recovery |

## Conflict Metadata Structure

```javascript
{
  // User-facing fields
  success: false,
  conflict: true,
  all_staff_unavailable: true,
  service_name: "Cat Nail Trim",
  requested_date: "2025-11-06",
  requested_time: "09:00",
  requested_end: "09:20",
  qualified_staff_count: 2,

  // For AI reasoning
  conflict_metadata: {
    requestedTime: {
      date: "2025-11-06",
      start: "09:00",
      end: "09:20"
    },
    failedStaffCount: 2,
    conflicts: [
      {
        staffId: "69090fd195f47806898d444a",
        reason: "booking_conflict",
        message: "Overlapping appointment"
      },
      {
        staffId: "6908fa9695f47806898d4279",
        reason: "booking_conflict",
        message: "Overlapping appointment"
      }
    ]
  },

  // Actionable guidance
  message: "BOOKING CONFLICT: All 2 qualified staff...",
  suggested_action: "call_get_available_times",
  get_available_times_params: {
    service_name: "Cat Nail Trim",
    appointment_date: "2025-11-06",
    pet_size: null
  }
}
```

## Fallback Scenarios

### Scenario 1: Partial Staff Availability
```
Try staff #1 → CONFLICT ❌
Try staff #2 → SUCCESS ✅
→ Return success response (no conflict handling needed)
```

### Scenario 2: Booking Hold Conflicts
```
Try staff #1 → booking_hold_exists ❌
  └─> conflictMetadata.conflicts[0] = { reason: "booking_hold_exists" }
Try staff #2 → SUCCESS ✅
→ Return success response
```

### Scenario 3: Non-Conflict Errors
```
Try staff #1 → RESOURCE_CONFLICT ❌
→ throw Error immediately (no retry, no structured response)
→ These errors are system issues, not scheduling conflicts
```

## System Prompt Instructions (Gemini)

The Gemini agent includes these instructions:

```
BOOKING CONFLICT HANDLING:
When the book_appointment tool returns "conflict": true and "all_staff_unavailable": true:
1. The response will include "get_available_times_params" with exact parameters
2. You MUST immediately call the get_available_times tool with those parameters
3. Present alternative time slots to the customer in a helpful, friendly manner
4. Apologize for the inconvenience and explain that the requested time was unavailable
5. DO NOT just say "try another time" - show actual available slots
```

This ensures Gemini automatically chains the tool calls without user intervention.
