# PetBuddy Reschedule - Quick Reference Guide

## Quick Navigation

### Main Files
- **Tool Definition**: `/packages/meta-bot/utils/openaiTools.js` (lines with `reschedule_appointment`)
- **Tool Implementation**: `/packages/meta-bot/lib/toolHandlers.js` (lines 999-1176)
- **Backend Validation**: `/packages/backend/src/services/bookingService.js` → `updateAppointment()`
- **LangGraph Graph**: `/packages/meta-bot/langgraph/graph.js`
- **Agent Node**: `/packages/meta-bot/langgraph/nodes/agent.js`
- **Tool Executor**: `/packages/meta-bot/langgraph/nodes/toolExecutor.js`

---

## Tool Input/Output

### Input Parameters
```javascript
{
  appointment_id: "507f1f77bcf86cd799439011",  // MongoDB ObjectId
  new_appointment_text_time: "Friday at 3pm",   // Natural language
  duration: 60  // Optional, in minutes
}
```

### Success Output
```javascript
{
  success: true,
  appointment_id: "507f1f77bcf86cd799439011",
  old_date: "2025-11-05",
  old_time: "10:00",
  new_date: "2025-11-07",
  new_time: "15:00",
  confirmation: {
    day_of_week: "Friday",
    formatted_date: "November 7, 2025",
    date_with_day: "Friday, November 7, 2025",
    start_time_formatted: "15:00",
    end_time_formatted: "16:00"
  },
  message: "Your appointment has been rescheduled to Friday, November 7, 2025 at 15:00..."
}
```

### Error Output
```javascript
{
  error: "Cannot reschedule appointment - [BOOKING_CONFLICT|RESOURCE_CONFLICT|STAFF_NOT_QUALIFIED|...] - Please choose a different time."
}
```

---

## Conversation Flow - Step by Step

```
1. Customer Message
   "I need to reschedule my appointment to Friday at 3pm"
   ↓
2. Human Detector
   ✓ Not escalation → continue
   ↓
3. Agent Node (LLM Decision)
   Question: "Do I have appointment ID?"
   No → Call get_customer_appointments
   ↓
4. Tool Executor
   Executes get_customer_appointments
   ↓
5. Agent Node (Process Results)
   ✓ Got appointment info
   Question: "Does customer specify new time?"
   Yes → Call reschedule_appointment
   ↓
6. Tool Executor
   Executes reschedule_appointment
   → Validates, updates database
   → Returns confirmation or error
   ↓
7. Agent Node (Final Response)
   Process tool result
   Generate customer-friendly response
   → "Great! Your appointment is now Friday at 3pm"
   ↓
8. Send to Customer
   Facebook/Instagram Messenger
```

---

## Time Parsing Examples

| Customer Says | Parsed As | Result |
|---|---|---|
| "tomorrow at 2pm" | Next day, 14:00 | { date: "YYYY-MM-DD", start: "14:00", end: "15:00" } |
| "Friday at 3:30pm" | Next Friday, 15:30 | { date: "YYYY-MM-DD", start: "15:30", end: "16:30" } |
| "next Monday at 9am" | Next Monday, 09:00 | { date: "YYYY-MM-DD", start: "09:00", end: "10:00" } |
| "2025-11-07 at 14:00" | Nov 7, 14:00 | { date: "2025-11-07", start: "14:00", end: "15:00" } |
| "today at 5pm" | Today (if not passed), 17:00 | null if past; otherwise { date: "YYYY-MM-DD", start: "17:00", ... } |

---

## Validation Checklist

### Before Calling reschedule_appointment
- [ ] Customer is authenticated (chat_id matches)
- [ ] Appointment exists and belongs to customer
- [ ] Appointment not canceled or completed
- [ ] New time is parseable

### Inside reschedule_appointment Tool
- [ ] Appointment ID is valid MongoDB ObjectId
- [ ] Customer/contact exists in database
- [ ] New time string is not null/empty
- [ ] Company context available (company_id, timezone)

### Inside BookingService.updateAppointment()
- [ ] Staff qualified for service
- [ ] Time slot available for staff
- [ ] No conflict with existing appointments
- [ ] Within company working hours
- [ ] Outside break windows
- [ ] Respects buffer time (15 min default)
- [ ] Resources available (if needed)

---

## Error Codes & Messages

| Error Code | Meaning | LLM Action |
|---|---|---|
| `BOOKING_CONFLICT` | Time unavailable | Call `get_available_times`, suggest alternatives |
| `RESOURCE_CONFLICT` | Resource unavailable | Explain resource issue, ask for different time |
| `STAFF_NOT_QUALIFIED` | Staff can't do service | Internal error, ask customer to retry |
| `VALIDATION_FAILED` | Time parse error | Ask customer for clearer time (e.g., "3:00pm") |
| Generic error | Other issues | Suggest booking new appointment, offer handoff |

---

## Timezone Handling

### Process
1. **Input**: Customer says "tomorrow at 3pm"
2. **Parse**: Using company timezone (e.g., "America/New_York")
3. **Convert**: To UTC for database storage
4. **Validate**: BookingService receives UTC, converts back to company tz
5. **Output**: Format response in company timezone

### Example
```
Company: America/New_York (EST, UTC-5)
Customer: "tomorrow at 3pm"
→ Parsed: 2025-11-09T15:00:00 (EST)
→ Stored: 2025-11-09T20:00:00Z (UTC)
→ Response: "Saturday, November 9 at 3:00pm EST"
```

---

## Common Scenarios

### Scenario 1: Simple Reschedule
```
Customer: "Move my 10am appointment to 2pm tomorrow"
→ get_customer_appointments
→ reschedule_appointment with new_appointment_text_time="tomorrow at 2pm"
→ Success! Confirmation sent
```

### Scenario 2: Time Conflict
```
Customer: "Move to Friday at 3pm"
→ reschedule_appointment called
→ BOOKING_CONFLICT error (another appointment 3-4pm)
→ get_available_times called
→ LLM: "Friday 3pm is taken, but 9am-12pm and 4pm-6pm available. Which works?"
→ Customer: "4pm please"
→ reschedule_appointment with new_appointment_text_time="Friday at 4pm"
→ Success!
```

### Scenario 3: Vague Request
```
Customer: "Can I reschedule?"
→ get_customer_appointments
→ LLM: "I can help! When would you like to reschedule your appointment to?"
→ Customer: "Friday afternoon"
→ LLM: "Great! What time Friday? For example, 1pm, 2pm, or 3pm?"
→ Customer: "2pm"
→ reschedule_appointment with new_appointment_text_time="Friday at 2pm"
→ Success!
```

### Scenario 4: Appointment Already Canceled
```
Customer: "Reschedule my canceled appointment"
→ get_customer_appointments (shows canceled status)
→ reschedule_appointment called
→ Error: "Cannot reschedule a canceled appointment"
→ LLM: "That appointment was canceled. Would you like to book a new appointment?"
→ Offer to book_appointment instead
```

---

## Database Impact

### Appointment Document Updated
```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439011"),
  customerId: ObjectId("..."),
  companyId: ObjectId("..."),
  start: Date("2025-11-07T20:00:00Z"),  // UTC
  end: Date("2025-11-07T21:00:00Z"),    // UTC
  status: "scheduled",
  // ... other fields unchanged
}
```

### Resource Reservations (if service item changed)
```javascript
// Old reservations deleted
ResourceReservation.deleteMany({ appointmentId })

// New ones created (if variant has requiredResources)
ResourceReservation.insertMany([
  { appointmentId, resourceTypeId: "...", quantity: 1 },
  { appointmentId, resourceTypeId: "...", quantity: 1 },
])
```

### Message History Saved
```javascript
{
  contact_id: ObjectId("..."),
  company_id: ObjectId("..."),
  role: "user" | "assistant",
  platform: "facebook" | "instagram",
  content: "I need to reschedule...",
  direction: "inbound" | "outbound",
  created_at: Date(),
}
```

---

## Testing Checklist

```javascript
// Test 1: Basic reschedule
✓ Customer has 1 upcoming appointment
✓ Request: "Move to Friday at 3pm"
✓ Friday 3pm available
✓ Result: Success, confirmation sent

// Test 2: Appointment not found
✓ Request with invalid appointment_id
✓ Result: "Appointment not found" error

// Test 3: Time in past
✓ Request: "Move to yesterday"
✓ Result: parseAppointmentTime returns null

// Test 4: Conflict with other appointment
✓ Request: "Move to time of another appointment"
✓ Result: BOOKING_CONFLICT, LLM offers alternatives

// Test 5: Canceled appointment
✓ Request for canceled appointment
✓ Result: "Cannot reschedule canceled appointment"

// Test 6: Timezone handling
✓ Company in different timezone
✓ Time parsed in correct timezone
✓ Validation done correctly

// Test 7: Multiple reschedules
✓ Reschedule same appointment twice
✓ Each update persists correctly

// Test 8: Resource constraints
✓ Service requires resources
✓ Resource unavailable at new time
✓ Result: RESOURCE_CONFLICT, suggest alternatives

// Test 9: Staff qualification
✓ Staff not qualified for service (edge case)
✓ Result: Clear error message

// Test 10: Natural language variations
✓ "next Monday", "Monday", "in 3 days"
✓ "14:00", "2pm", "2:00 PM"
✓ Georgian: "ხვალ", "დღეს"
✓ All parsed correctly
```

---

## Integration Points

### Inputs From Other Components
| Source | Data | Used For |
|---|---|---|
| Facebook/Instagram API | message text, sender_id | Customer message & chat_id |
| Database (Contact) | fullName, phone_number | Customer context in LLM |
| Database (Company) | timezone, working_hours | Time parsing & validation |
| Database (Appointment) | serviceId, staffId, duration | Reschedule details |

### Outputs To Other Components
| Destination | Data | Format |
|---|---|---|
| Facebook/Instagram API | Response message | Text via facebookMsgSender() |
| Database (Appointment) | Updated times | Document update |
| Database (ResourceReservation) | New reservations | Insert/delete records |
| Database (Message) | Conversation history | Inbound/outbound records |

---

## Performance Notes

- **Parallel Tool Execution**: All tools run in parallel, not sequentially
- **Message Pruning**: Last 15 messages kept; older ones summarized
- **Database Indexes**: Queries on (companyId, customerId), (chatId, companyId)
- **API Calls**: ~2-3 OpenAI API calls per reschedule request (agent nodes)
- **Typical Latency**: 2-5 seconds end-to-end

---

## Key Takeaways

1. **Reschedule is a tool** called by LLM, not a direct user endpoint
2. **LLM decides when to reschedule** based on customer intent
3. **Multiple validations** happen (time parsing, availability, qualification, resources)
4. **Timezone-aware**: All times in company timezone, stored as UTC
5. **Error recovery**: If conflict, offer alternatives via get_available_times
6. **Natural language**: Supports multiple formats and languages
7. **Conversational**: LLM asks clarifying questions if needed
8. **Protected**: Customer can only reschedule their own appointments

---

## Troubleshooting

### "Appointment not found"
- Check appointment_id format
- Verify customer owns appointment
- Verify appointment not already deleted

### "Cannot reschedule a canceled appointment"
- This is by design
- Offer to book new appointment instead

### Time parsing returns null
- Customer gave time in past
- LLM will re-ask for future time
- Clarify format: "Could you say 'tomorrow at 2pm'?"

### BOOKING_CONFLICT error
- Requested time already booked
- Call get_available_times to show options
- Suggest specific available slots

### RESOURCE_CONFLICT error
- Required resource unavailable
- Explain which resource is unavailable
- Suggest different times

### "Staff not qualified" (shouldn't happen)
- Staff configuration issue
- Tell customer to retry
- Escalate if persists

---

## File Locations Quick Index

```
packages/meta-bot/
├── langgraph/
│   ├── graph.js ........................ Main conversation graph
│   ├── controller.js .................. Entry point for processing
│   └── nodes/
│       ├── agent.js ................... LLM decision-making
│       ├── toolExecutor.js ............ Tool execution
│       └── humanDetector.js ........... Escalation detection
├── lib/
│   ├── toolHandlers.js ................ reschedule_appointment implementation
│   └── bookingContext.js .............. Service/staff/location loading
├── utils/
│   └── openaiTools.js ................. Tool schema definitions
├── controllers/
│   ├── facebook.controller.js ......... Webhook handler
│   └── instagram.controller.js ........ Webhook handler
└── services/
    └── contact.service.js ............. Customer data access

packages/backend/
└── src/
    └── services/
        └── bookingService.js .......... updateAppointment validation
```

