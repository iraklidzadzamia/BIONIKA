# PetBuddy Reschedule Functionality - Comprehensive Analysis

## Overview
The PetBuddy meta-bot implements a sophisticated appointment rescheduling system that enables customers to reschedule their existing appointments through a conversational AI interface. The system is built on LangGraph, uses OpenAI's function calling, and integrates with a backend booking service for validation.

---

## 1. Architecture Overview

### High-Level Flow
```
Customer Message
    ↓
Facebook/Instagram Webhook
    ↓
LangGraph Conversation Graph
    ├─ Human Detector Node (Check for escalation)
    ├─ Agent Node (LLM decides which tool to use)
    ├─ Tool Executor Node (Executes tools in parallel)
    └─ Repeat until response ready
    ↓
Response sent back to customer
```

### Key Components
1. **Meta-Bot Server**: Node.js + Express + LangGraph
2. **LangGraph**: State machine for managing conversation flow
3. **OpenAI API**: LLM with function calling for understanding customer intent
4. **Tool Handlers**: Implementations of appointment operations
5. **BookingService**: Backend service for validation and persistence

---

## 2. Tool Definition - reschedule_appointment

### Location
`/packages/meta-bot/utils/openaiTools.js` - Tool schema
`/packages/meta-bot/lib/toolHandlers.js` - Tool implementation (lines 999-1176)

### Tool Schema
```javascript
{
  type: "function",
  function: {
    name: "reschedule_appointment",
    description: "Reschedule an appointment to a new date/time. First get appointment ID using 'get_customer_appointments'. After rescheduling, confirm both old and new date/time to customer.",
    parameters: {
      type: "object",
      properties: {
        appointment_id: {
          type: "string",
          description: "Appointment ID to reschedule (from get_customer_appointments)."
        },
        new_appointment_text_time: {
          type: "string",
          description: "New time in ENGLISH: 'today', 'tomorrow', 'next [weekday]', or 'YYYY-MM-DD'. Include time (e.g., 'tomorrow at 14:00'). Translate non-English to English."
        },
        duration: {
          type: "integer",
          description: "Duration in minutes. Omit to keep original duration."
        }
      },
      required: ["appointment_id", "new_appointment_text_time"],
      additionalProperties: false
    }
  }
}
```

### Parameters
- **appointment_id** (required, string): The ID of the appointment to reschedule
- **new_appointment_text_time** (required, string): Natural language date/time (e.g., "tomorrow at 14:00", "next Friday at 3pm")
- **duration** (optional, integer): Duration in minutes. If omitted, keeps the original appointment duration

---

## 3. Flow Diagram: How Rescheduling Works

### Complete Customer Request Flow

```
1. CUSTOMER REQUEST
   └─> "I need to reschedule my appointment"

2. FACEBOOK/INSTAGRAM WEBHOOK
   └─> Receives message from customer
   └─> Calls /packages/meta-bot/controllers/facebook.controller.js (handleIncomingMessage)

3. LANGGRAPH PROCESSING
   ├─ HUMAN_DETECTOR NODE
   │  └─> Checks for escalation keywords/issues
   │  └─> Returns needsHumanHandoff = false (unless urgent)
   │
   ├─ AGENT NODE
   │  ├─> Invokes ChatOpenAI model with system instructions
   │  ├─> LLM analyzes customer message
   │  ├─> LLM decides next action (tools to call)
   │  ├─> Possible decisions:
   │  │   ├─ get_customer_appointments (to list existing appointments)
   │  │   ├─ reschedule_appointment (if customer confirms new time)
   │  │   └─ Other tools (get availability, ask for clarification, etc.)
   │  └─> Returns tool calls if needed, or final response
   │
   ├─ TOOL_EXECUTOR NODE (if tools called)
   │  ├─> Executes each tool in parallel
   │  ├─> For reschedule_appointment:
   │  │   ├─ VALIDATE inputs
   │  │   ├─ FETCH appointment from database
   │  │   ├─ CHECK appointment status (must be "scheduled")
   │  │   ├─ PARSE new time string
   │  │   ├─ CALL BookingService.updateAppointment()
   │  │   ├─ FORMAT confirmation response
   │  │   └─ RETURN success/error result
   │  └─> Returns tool results to agent
   │
   └─ AGENT NODE (AGAIN)
      └─> Processes tool results
      └─> Generates final response with confirmation
      └─> Returns assistantMessage

4. RESPONSE SENT TO CUSTOMER
   └─> "Your appointment has been rescheduled to Friday, November 8 at 14:00"
```

---

## 4. Detailed reschedule_appointment Implementation

### Location
`/packages/meta-bot/lib/toolHandlers.js`, lines 999-1176

### Function Signature
```javascript
reschedule_appointment: async (params, context = {}) => {
  // params: { appointment_id, new_appointment_text_time, duration }
  // context: { company_id, chat_id, timezone, working_hours }
  // returns: { success, appointment_id, old_date, old_time, new_date, new_time, confirmation, message }
}
```

### Step-by-Step Implementation

#### Step 1: Parameter Validation
```javascript
const { appointment_id, new_appointment_text_time, duration } = params;

if (!appointment_id) throw new Error("Appointment ID is required to reschedule");
if (!new_appointment_text_time) throw new Error("New appointment time is required");
if (!context?.company_id) throw new Error("Missing company context");
if (!context?.chat_id) throw new Error("Missing customer chat_id in context");

// Validate MongoDB ObjectId format
if (!mongoose.isValidObjectId(appointment_id)) {
  throw new Error("Invalid appointment ID format");
}
```

#### Step 2: Fetch Customer & Verify Ownership
```javascript
const contact = await getContactByChatId(context.chat_id, context.company_id, platform);

if (!contact) {
  throw new Error("No customer found. Please start a conversation first.");
}

// Find appointment and verify ownership
const appointment = await Appointment.findOne({
  _id: appointment_id,
  customerId: contact._id,
  companyId: context.company_id,
}).populate("serviceItemId");

if (!appointment) {
  throw new Error("Appointment not found. Please check the appointment ID and try again.");
}
```

#### Step 3: Validate Appointment Status
```javascript
// Check if canceled
if (appointment.status === "canceled") {
  throw new Error("Cannot reschedule a canceled appointment. Please book a new appointment instead.");
}

// Check if completed
if (appointment.status === "completed") {
  throw new Error("Cannot reschedule a completed appointment. Please book a new appointment instead.");
}
```

Valid statuses for rescheduling: `"scheduled"`, `"confirmed"`, or other active statuses (NOT "canceled" or "completed")

#### Step 4: Calculate Duration
```javascript
let appointmentDuration = duration;

if (!appointmentDuration) {
  // Use original appointment duration
  const originalDuration = (new Date(appointment.end) - new Date(appointment.start)) / 60000;
  appointmentDuration = originalDuration || 60; // Default to 60 minutes
}
```

#### Step 5: Parse New Time
```javascript
const timezone = context.timezone || company.timezone || "UTC";

const parsed = parseAppointmentTime(
  new_appointment_text_time,
  timezone,
  appointmentDuration
);

if (!parsed) {
  throw new Error("Could not understand the new appointment time. Please use format like 'tomorrow at 2pm' or 'Friday at 10:30am'");
}

// Returns: { date: "YYYY-MM-DD", start: "HH:mm", end: "HH:mm" }
```

#### Step 6: Convert to UTC Date Objects
```javascript
// moment.tz() creates a moment in company timezone
// toDate() converts to JavaScript Date (stored as UTC internally)
// BookingService receives UTC dates and converts back for validation

const startDate = moment
  .tz(`${parsed.date}T${parsed.start}:00`, timezone)
  .toDate();

const endDate = moment
  .tz(`${parsed.date}T${parsed.end}:00`, timezone)
  .toDate();
```

#### Step 7: Call BookingService.updateAppointment()
```javascript
const updateData = {
  start: startDate,
  end: endDate,
  staffId: appointment.staffId,                    // Keep original staff
  serviceId: appointment.serviceId,                 // Keep original service
  serviceItemId: appointment.serviceItemId,         // Keep original service item
  locationId: appointment.locationId,              // Keep original location
};

const updatedAppointment = await BookingService.updateAppointment(
  appointment_id,
  updateData,
  context.company_id
);
```

**What BookingService.updateAppointment() validates:**
- Staff still qualified for the service
- New time slot available for the staff
- No conflicts with other appointments
- Within working hours (from StaffSchedule or company settings)
- Outside break windows
- Respects appointment buffer time (default 15 minutes)
- Resource availability (if applicable)

#### Step 8: Format Confirmation Response
```javascript
const appointmentMoment = moment.tz(parsed.date, timezone);
const confirmationDetails = {
  day_of_week: appointmentMoment.format("dddd"),           // "Friday"
  formatted_date: appointmentMoment.format("MMMM D, YYYY"), // "November 8, 2025"
  date_with_day: appointmentMoment.format("dddd, MMMM D, YYYY"),
  start_time_formatted: parsed.start,    // "14:00"
  end_time_formatted: parsed.end,        // "15:00"
};
```

#### Step 9: Return Success Response
```javascript
return {
  success: true,
  appointment_id: String(updatedAppointment._id),
  old_date: moment.tz(appointment.start, timezone).format("YYYY-MM-DD"),
  old_time: moment.tz(appointment.start, timezone).format("HH:mm"),
  new_date: parsed.date,
  new_time: parsed.start,
  confirmation: confirmationDetails,
  message: `Your appointment has been rescheduled to ${confirmationDetails.date_with_day} at ${parsed.start}. The appointment will last until ${parsed.end}.`
};
```

### Error Handling

The function provides detailed error messages for different failure scenarios:

```javascript
// BOOKING_CONFLICT - Time slot unavailable
if (err.code === "BOOKING_CONFLICT") {
  throw new Error(
    `Cannot reschedule appointment - ${err.message}. Please choose a different time.`
  );
}

// RESOURCE_CONFLICT - Required resources not available
if (err.code === "RESOURCE_CONFLICT") {
  throw new Error(
    `Cannot reschedule appointment - ${err.message}. The required resources are not available at this time.`
  );
}

// STAFF_NOT_QUALIFIED - Staff doesn't have required skills
if (err.code === "STAFF_NOT_QUALIFIED") {
  throw new Error(
    `Cannot reschedule appointment - the staff member is not qualified for this service.`
  );
}
```

---

## 5. Natural Language Time Parsing

### Function
`parseAppointmentTime(text, timezone, durationMinutes)` in `/packages/meta-bot/lib/toolHandlers.js`

### Supported Formats

**Relative Dates:**
- "today" / "დღეს" (Georgian)
- "tomorrow" / "ხვალ" (Georgian)
- "day after tomorrow" / "ზეგ" / "მაზეგ" (Georgian)
- "next Monday", "next Tuesday", etc.
- "Monday", "Tuesday", etc. (interpreted as next occurrence if in past)

**Absolute Dates:**
- "YYYY-MM-DD" (ISO format)
- "October 16, 2025" (Month Day, Year)
- "2025-10-16T14:30" or "2025-10-16 14:30" (ISO datetime)

**Times:**
- "14:00", "2:00pm", "2pm", "14" (24-hour and 12-hour formats)
- "noon", "midnight" (special cases)
- Time can be standalone or combined with date: "tomorrow at 2pm"

**Examples:**
- "tomorrow at 14:00" → next day, 14:00-15:00 (1 hour default)
- "next Friday at 3pm" → next Friday at 15:00
- "2025-10-20 at 10:30" → October 20, 2025 at 10:30
- "today at 9am" → today at 09:00 (if not in past)

### Output Format
```javascript
{
  date: "YYYY-MM-DD",
  start: "HH:mm",
  end: "HH:mm"
}
```

### Validation
- Returns `null` if time cannot be parsed
- Validates that appointment is NOT in the past
- Returns `null` if appointment time has already passed

---

## 6. Integration with Conversation Graph

### State Schema
`/packages/meta-bot/langgraph/state/schema.js`

```javascript
ConversationState {
  // User identity
  chatId: "facebook_sender_id",
  platform: "facebook" | "instagram",
  companyId: "mongo_id",
  
  // Contact info
  fullName: "Customer Name",
  phoneNumber: "+1234567890",
  
  // Conversation
  messages: [
    { role: "user", content: "I need to reschedule..." },
    { role: "assistant", content: "...", tool_calls: [...] },
    { role: "tool", content: "..." },
    ...
  ],
  
  // Context
  timezone: "America/New_York",
  workingHours: [{ weekday: 0, startTime: "09:00", endTime: "17:00" }, ...],
  
  // Flow control
  toolCalls: [...],
  currentStep: "execute_tools",
  assistantMessage: "...",
}
```

### How LLM Decides to Reschedule

The LLM (ChatOpenAI) analyzes customer messages with the system prompt context and decides:

1. **Does customer want to reschedule?**
   - Keywords: "reschedule", "change time", "move appointment", "different time"
   - If yes → continue to step 2

2. **Is appointment ID available?**
   - If NO → Call `get_customer_appointments` first
   - If YES → Continue to step 3

3. **Does customer specify a new time?**
   - If NO → Ask customer "What time would work better for you?"
   - If YES → Continue to step 4

4. **Call reschedule_appointment with:**
   - appointment_id: from get_customer_appointments
   - new_appointment_text_time: extracted from customer message
   - duration: omitted (keeps original)

5. **Handle result:**
   - If successful → Confirm with old and new times
   - If error (BOOKING_CONFLICT) → Offer available times and suggest alternatives

### Example Conversation

```
Customer: "I need to reschedule my appointment tomorrow"
→ LLM calls get_customer_appointments
→ LLM gets appointment details
→ Asks "What time works better for you?"

Customer: "Can I move it to Friday at 3pm?"
→ LLM calls reschedule_appointment with new_appointment_text_time="Friday at 3pm"
→ BookingService validates
→ Success → "Your appointment has been moved from tomorrow at 10am to Friday at 3pm"

OR if time unavailable:
→ Error (BOOKING_CONFLICT)
→ LLM calls get_available_times for Friday
→ Suggests available slots: "9am-10am or 2pm-4pm available on Friday"
```

---

## 7. Backend Validation - BookingService.updateAppointment()

### Location
`/packages/backend/src/services/bookingService.js`

### Validation Checks

#### 1. Staff Qualification
```javascript
// Check if staff is still qualified for the service
const staff = await User.findOne({ _id: finalStaffId, companyId });

if (staff && Array.isArray(staff.serviceCategoryIds) && staff.serviceCategoryIds.length > 0) {
  const isQualified = staff.serviceCategoryIds.some(
    catId => catId.toString() === finalServiceId.toString()
  );
  
  if (!isQualified) {
    throw new Error('Staff member is not qualified for this service category');
    // code: 'STAFF_NOT_QUALIFIED'
  }
}

// Note: Staff with NO serviceCategoryIds configured can serve ALL services (no restrictions)
```

#### 2. Availability Check
```javascript
const availability = await this.checkAvailability(
  finalStaffId,
  finalStart,      // UTC date
  finalEnd,        // UTC date
  companyId,
  appointmentId,   // Exclude this appointment from conflict check
  locationId
);

if (!availability.available) {
  throw new Error(`Reschedule not available: ${availability.reason}`);
  // code: 'BOOKING_CONFLICT'
}
```

What `checkAvailability()` validates:
- **Existing appointments**: No overlap with other appointments
- **Staff time-off**: No conflicts with TimeOff records
- **Working hours**: Appointment within company working hours
- **Break windows**: Not within configured break times
- **Buffer time**: Respects appointment buffer (default 15 minutes between appointments)
- **Resource availability**: If service requires resources, they must be available

#### 3. Resource Capacity
```javascript
// For each required resource in the service item
for (const req of variant.requiredResources || []) {
  const ok = await BookingService.#checkResourceCapacity(
    companyId,
    req.resourceTypeId,
    req.quantity || 1,
    new Date(appointment.start),
    new Date(appointment.end)
  );
  
  if (!ok.available) {
    throw new Error(`Resource became unavailable: ${ok.reason}`);
    // code: 'RESOURCE_CONFLICT'
  }
}
```

#### 4. Data Persistence
```javascript
// Update appointment with new times
const appointment = await Appointment.findByIdAndUpdate(appointmentId, updateData, {
  new: true,
  runValidators: true,
});

// If service item changed, rebuild resource reservations
if (serviceItemId) {
  await ResourceReservation.deleteMany({ appointmentId });
  
  // Create new reservations for new service item
  const reservations = [];
  for (const req of newVariant.requiredResources || []) {
    for (let i = 0; i < (req.quantity || 1); i++) {
      reservations.push({
        companyId,
        appointmentId: appointment._id,
        resourceTypeId: req.resourceTypeId,
        quantity: 1,
      });
    }
  }
  
  await ResourceReservation.insertMany(reservations);
}
```

---

## 8. Timezone Handling

### Critical Timezone Conversions

1. **Customer Message** → Understood in company timezone
2. **Parse Time** → Done in company timezone with `moment.tz()`
3. **Convert to UTC** → For database storage
   ```javascript
   const startDate = moment.tz(`${parsed.date}T${parsed.start}:00`, timezone).toDate();
   ```
4. **BookingService** → Receives UTC, converts back to company timezone for validation
5. **Response to Customer** → Formatted back in company timezone

### Example
```
Company timezone: "America/New_York"
Customer says: "tomorrow at 2pm"

parseAppointmentTime execution:
1. Get "tomorrow" in New York time
2. Parse "2pm" to 14:00 in New York time
3. Create moment in America/New_York: "2025-11-09T14:00:00"
4. Convert to UTC: "2025-11-09T19:00:00Z"
5. Store in database as UTC

Confirmation to customer (converted back to NY):
"Your appointment is rescheduled to Saturday, November 9 at 14:00"
```

---

## 9. Key Files & Functions

### Meta-Bot Components
| File | Function | Purpose |
|------|----------|---------|
| `/langgraph/graph.js` | `createConversationGraph()` | Defines the LangGraph workflow |
| `/langgraph/controller.js` | `processMessageWithLangGraph()` | Entry point for processing messages |
| `/langgraph/nodes/agent.js` | `agentNode()` | LLM inference with tool calling |
| `/langgraph/nodes/toolExecutor.js` | `toolExecutorNode()` | Executes tools in parallel |
| `/langgraph/nodes/humanDetector.js` | `humanDetectorNode()` | Detects escalation/handoff |
| `/lib/toolHandlers.js` | `reschedule_appointment()` | Reschedule implementation |
| `/lib/toolHandlers.js` | `parseAppointmentTime()` | Natural language time parsing |
| `/lib/toolHandlers.js` | `get_customer_appointments()` | Fetches customer's appointments |
| `/lib/bookingContext.js` | `getBookingContext()` | Loads company/service/staff context |
| `/utils/openaiTools.js` | Tool schemas | Tool definitions for OpenAI |
| `/controllers/facebook.controller.js` | `handleIncomingMessage()` | Webhook handler |

### Backend Components
| File | Function | Purpose |
|------|----------|---------|
| `/services/bookingService.js` | `updateAppointment()` | Validates and updates appointment |
| `/services/bookingService.js` | `checkAvailability()` | Checks time slot availability |
| `/models/Appointment.js` | Schema | Appointment data model |
| `/models/User.js` | Schema | Staff/user data model |

---

## 10. Complete Example: Customer Workflow

### Scenario: Customer wants to reschedule from Wednesday to Friday

```
STEP 1: Customer sends message
Message: "I need to reschedule my Wednesday appointment to Friday at 3pm"
Platform: Facebook
Company: PetBuddy Grooming (timezone: America/New_York)

STEP 2: Facebook Webhook
Endpoint: POST /webhook/facebook
Payload: sender.id=12345, message.text="I need to reschedule..."

STEP 3: Controller Processing
facebook.controller.js → handleIncomingMessage()
- Get company by Facebook page ID
- Load system instructions
- Load conversation history (last 50 messages)
- Call processMessageWithLangGraph()

STEP 4: LangGraph State Building
controller.js → processMessageWithLangGraph()
- Load customer's name and phone from database
- Build input state:
  {
    chatId: "12345",
    platform: "facebook",
    companyId: "507f1f77bcf86cd799439011",
    fullName: "John Doe",
    phoneNumber: "5551234567",
    timezone: "America/New_York",
    workingHours: [...],
    messages: [
      { role: "user", content: "I need to reschedule my Wednesday appointment to Friday at 3pm" }
    ],
    systemInstructions: "You are a helpful booking assistant for PetBuddy..."
  }

STEP 5: LangGraph Execution - Human Detector
humanDetectorNode()
- Check for escalation keywords (none found)
- Check for repeated failures (none)
- Check for conversation loop (no)
- Return: { needsHumanHandoff: false }

STEP 6: LangGraph Execution - Agent Node
agentNode()
- Create ChatOpenAI model with tools
- Create tools including reschedule_appointment
- Bind tools to model
- Call model.invoke() with system prompt + message history
- LLM analyzes: "Customer wants to reschedule, but no appointment ID provided"
- LLM decides: "Need to call get_customer_appointments first"
- Return: 
  {
    messages: [{
      role: "assistant",
      content: "",
      tool_calls: [{ id: "call_1", name: "get_customer_appointments", args: { status: "upcoming" } }]
    }],
    toolCalls: [...],
    currentStep: "execute_tools"
  }

STEP 7: LangGraph Execution - Tool Executor
toolExecutorNode()
- Execute get_customer_appointments in parallel
- Result:
  {
    success: true,
    appointments: [
      { id: "apt_123", date: "2025-11-05", time: "10:00", service: "Full Groom", status: "scheduled" }
    ]
  }
- Return:
  {
    messages: [{
      role: "tool",
      tool_call_id: "call_1",
      content: "{ \"success\": true, \"appointments\": [...] }"
    }],
    currentStep: "agent"
  }

STEP 8: LangGraph Execution - Agent Node Again
agentNode()
- Call model again with new tool result
- LLM now has appointment info
- LLM analyzes: "Customer wants to reschedule apt_123 to Friday at 3pm"
- LLM decides: "Call reschedule_appointment with new_appointment_text_time='Friday at 3pm'"
- Return:
  {
    messages: [{
      role: "assistant",
      content: "",
      tool_calls: [{ id: "call_2", name: "reschedule_appointment", args: { appointment_id: "apt_123", new_appointment_text_time: "Friday at 3pm" } }]
    }],
    toolCalls: [...],
    currentStep: "execute_tools"
  }

STEP 9: LangGraph Execution - Tool Executor
toolExecutorNode()
- Execute reschedule_appointment:
  1. Validate appointment_id format ✓
  2. Load customer (already loaded from context) ✓
  3. Fetch appointment apt_123:
     - customerId: matches ✓
     - status: "scheduled" ✓
     - companyId: matches ✓
  4. Calculate duration: original = 60 minutes
  5. Parse "Friday at 3pm":
     - Today: 2025-11-03 (Monday)
     - Next Friday: 2025-11-07
     - parseAppointmentTime("Friday at 3pm", "America/New_York", 60)
     - Returns: { date: "2025-11-07", start: "15:00", end: "16:00" }
  6. Convert to UTC dates:
     - startDate: moment.tz("2025-11-07T15:00:00", "America/New_York").toDate()
     - endDate: moment.tz("2025-11-07T16:00:00", "America/New_York").toDate()
  7. Call BookingService.updateAppointment(apt_123, { start, end, staffId, serviceId, ... }, companyId):
     - Fetch current appointment details
     - Check staff qualification ✓
     - Check availability with checkAvailability():
       - Find other appointments Friday 3-4pm: NONE ✓
       - Check working hours Friday: 9am-6pm ✓
       - Check breaks: none at 3pm ✓
       - Check buffer time: previous appt ends at 2pm, 1 hour buffer ✓
     - Update Appointment document
     - Return updated appointment
  8. Format confirmation:
     - oldDate: "2025-11-05"
     - oldTime: "10:00"
     - newDate: "2025-11-07"
     - newTime: "15:00"
     - formattedDate: "Friday, November 7, 2025"
  9. Return success:
     {
       success: true,
       appointment_id: "apt_123",
       old_date: "2025-11-05",
       old_time: "10:00",
       new_date: "2025-11-07",
       new_time: "15:00",
       confirmation: { date_with_day: "Friday, November 7, 2025", ... },
       message: "Your appointment has been rescheduled to Friday, November 7 at 3pm (15:00). The appointment will last until 4pm (16:00)."
     }

STEP 10: Tool Result in Message Flow
- toolExecutorNode returns tool result to LangGraph
- Agent node receives tool result as new message

STEP 11: LangGraph Execution - Agent Node Final
agentNode()
- Call model with tool result showing successful reschedule
- LLM: "Reschedule was successful, should confirm to customer"
- LLM generates final response:
  "Great! I've successfully rescheduled your appointment. Your Full Groom appointment has been moved from Wednesday, November 5 at 10:00am to Friday, November 7 at 3:00pm. Is there anything else I can help you with?"
- Return:
  {
    messages: [{
      role: "assistant",
      content: "Great! I've successfully..."
    }],
    assistantMessage: "Great! I've successfully...",
    currentStep: "end"
  }

STEP 12: Response Return
graph.invoke() completes
Return { assistantMessage: "Great! I've successfully...", state: {...} }

STEP 13: Send to Customer
facebook.controller.js → facebookMsgSender()
- Send message to customer: "Great! I've successfully rescheduled your appointment..."
- Save message to database

STEP 14: Customer Receives
Message on Facebook Messenger: "Great! I've successfully rescheduled your appointment to Friday, November 7 at 3:00pm. Is there anything else I can help you with?"
```

---

## 11. Validation & Business Logic Summary

### Pre-Reschedule Checks
- ✓ Valid MongoDB ObjectId for appointment_id
- ✓ Customer ownership (appointment customerId = contact._id)
- ✓ Appointment status NOT "canceled" or "completed"
- ✓ New time can be parsed to valid date/time

### During Reschedule Validation
- ✓ Staff still qualified for the service
- ✓ New time slot available for same staff
- ✓ Within company working hours
- ✓ Outside break windows
- ✓ Respects appointment buffer time (typically 15 min)
- ✓ All required resources available
- ✓ Timezone conversions correct

### Post-Reschedule Actions
- ✓ Update Appointment document with new start/end times
- ✓ If service item changed: rebuild resource reservations
- ✓ Log successful reschedule
- ✓ Return detailed confirmation with old and new times

### Error Recovery
- If BOOKING_CONFLICT → LLM gets error, calls get_available_times to suggest alternatives
- If RESOURCE_CONFLICT → LLM explains resources unavailable
- If STAFF_NOT_QUALIFIED → This shouldn't happen (staff not changed), but if does, clear error
- If time parsing fails → LLM re-asks for time in clearer format

---

## 12. Configuration & Environment

### Required Environment Variables
```bash
# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_CHAT_MODEL=gpt-4-turbo-preview

# Database
MONGODB_URI=mongodb://...

# Platform
FACEBOOK_PAGE_ACCESS_TOKEN=...
INSTAGRAM_BUSINESS_ACCOUNT_TOKEN=...

# Feature flags
USE_LANGGRAPH=true

# System prompt (from company)
SYSTEM_INSTRUCTIONS=... (passed at runtime)
```

### Runtime Configuration
```javascript
{
  timezone: "America/New_York",        // Company timezone
  workingHours: [                      // Company working hours
    { weekday: 1, startTime: "09:00", endTime: "18:00" },  // Monday
    { weekday: 2, startTime: "09:00", endTime: "18:00" },  // Tuesday
    // ...
  ],
  company_id: "507f1f77bcf86cd799439011",
  chat_id: "12345",
}
```

---

## 13. Key Features & Highlights

### Natural Language Support
- Multiple date formats: "tomorrow", "next Friday", "2025-11-07", etc.
- Multiple time formats: "2pm", "14:00", "3:30pm", etc.
- Multilingual support: Georgian phrases recognized alongside English
- Context-aware: Understands "today", "tomorrow" relative to company timezone

### Robust Error Handling
- Clear error messages for different failure modes
- Fallback options (e.g., if time unavailable, suggest alternatives)
- Graceful degradation (if LLM can't reschedule, asks for more info)

### Business Logic Protection
- Staff qualification requirements enforced
- Appointment buffer time respected
- Resource constraints validated
- Working hours compliance checked
- Break windows honored

### Timezone Awareness
- All times converted to company timezone for presentation
- UTC storage for consistency
- Daylight Saving Time handled by moment-timezone

### Conversation Context
- Message history preserved and pruned intelligently
- Customer info (name, phone) passed to LLM to avoid re-asking
- Tool results accumulated for better decisions
- Human handoff detection for escalations

---

## 14. Failure Scenarios & Recovery

### Scenario 1: Appointment Already Canceled
```
LLM: "I'd be happy to reschedule your appointment."
Tool Executor: Returns error "Cannot reschedule a canceled appointment"
LLM: "I notice that appointment was already canceled. Would you like to book a new appointment instead?"
```

### Scenario 2: Requested Time Unavailable
```
LLM: Calls reschedule_appointment with "Friday at 3pm"
Tool Executor: BookingService returns BOOKING_CONFLICT error
LLM: Calls get_available_times for Friday
LLM: "Friday at 3pm isn't available, but we have openings at 10am-12pm and 4pm-6pm. Which time works better for you?"
```

### Scenario 3: Staff Not Qualified (Edge Case)
```
Tool Executor: Returns error "Staff not qualified for service"
LLM: "Something unexpected happened with your original staff member. Let me find available staff for your service."
LLM: Calls reschedule_appointment with different staffId (or same time, different staff)
```

### Scenario 4: Customer Gives Vague Time
```
Customer: "Can I move it?"
LLM: "Of course! What time would work better for you?"
Customer: "Afternoon"
LLM: "I'd be happy to help! Could you be more specific? For example, 2pm, 3pm, or 4pm?"
```

### Scenario 5: LLM Repeated Failures
```
Tool Executor: 3 consecutive tool errors detected
Human Detector: Triggers human handoff
LLM: "I'm having trouble with the reschedule. Let me connect you with a team member who can help."
System: Notifies admin/support team
```

---

## 15. Performance Considerations

### Tool Execution
- Tools executed in **parallel** for better performance
- Each tool has timeout: 30 seconds default
- Tool results cached in conversation history for LLM context

### Message Pruning
- Max 15 recent messages kept for LLM to prevent token overflow
- Tool call/result pairs preserved to maintain context integrity
- Older messages summarized in system message

### Database Queries
- Contact loaded once per conversation from database
- Appointment fetched with `.populate()` for service details
- Indexes on: companyId + customerId (appointments), chatId + companyId (contacts)

### API Calls
- Single OpenAI API call per decision point
- Batched tool execution (parallel)
- No redundant availability checks (BookingService handles all validation)

---

## 16. Security & Validation

### Customer Verification
- Appointment verified to belong to authenticated customer (chat_id/contact)
- Cannot reschedule others' appointments
- Chat history used to establish customer context

### Input Validation
- Appointment ID format validated (MongoDB ObjectId)
- Time parsing doesn't accept dates > 1 year in future
- Phone numbers validated (7-15 digits without country code)
- All IDs validated before database queries

### Error Information Disclosure
- Tool errors visible to LLM but sanitized for customer
- No internal error details shown to customer
- BOOKING_CONFLICT treated as time unavailable (not system error)

---

## 17. Testing Scenarios

```javascript
// Test 1: Simple reschedule to next day
Customer: "I have appointment tomorrow, move it to Friday at 3pm"
Expected: ✓ Appointment rescheduled

// Test 2: Appointment not found
Customer: "Reschedule appointment 000000000000000000000000"
Expected: "Appointment not found"

// Test 3: Time in past
Customer: "Move my appointment to yesterday at 2pm"
Expected: parseAppointmentTime returns null → LLM detects and re-asks

// Test 4: Unavailable time
Customer: "Move to Friday at same time as another appointment"
Expected: BOOKING_CONFLICT → LLM offers alternatives

// Test 5: Canceled appointment
Customer: "My canceled appointment, move it to next week"
Expected: "Cannot reschedule a canceled appointment"

// Test 6: Customer not found
New customer (no contact record): "Reschedule my appointment"
Expected: "No customer found. Please start a conversation first."

// Test 7: Vague time
Customer: "Move my appointment to sometime next week"
Expected: LLM asks for specific time
```

---

## Summary

The PetBuddy reschedule functionality is a sophisticated, multi-layered system that:

1. **Listens** via webhooks for customer messages
2. **Understands** intent through LLM with tools
3. **Retrieves** appointment details from database
4. **Validates** extensively through BookingService
5. **Updates** with new times and resource reservations
6. **Confirms** with formatted, timezone-aware response
7. **Recovers** gracefully from errors with alternatives
8. **Escalates** to humans when needed

All with natural language processing, timezone awareness, multi-language support, and comprehensive business logic validation.

