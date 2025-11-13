# LangGraph Integration Analysis for PetBuddy 2.0

## Executive Summary

PetBuddy 2.0 is a monorepo-based pet grooming salon management system with three interconnected services:
1. **Backend** - Express.js REST API for business logic (bookings, appointments, settings)
2. **Meta-Bot** - OpenAI-powered chatbot for Facebook/Instagram customer interactions
3. **Frontend** - React-based management dashboard

The project has significant **agentic workflows** and **state management complexity** that would benefit substantially from LangGraph. The primary candidates for LangGraph integration are in the **meta-bot service**, where OpenAI tools are being orchestrated manually, and **backend appointment booking workflows** that involve sequential validation and state changes.

---

## Part 1: Current Architecture Overview

### 1.1 Technology Stack

**Backend (packages/backend)**
- Node.js with Express.js
- MongoDB for data persistence
- OpenAI API integration for prompts
- Socket.io for real-time messaging
- Mongoose for ODM
- JWT-based authentication

**Meta-Bot (packages/meta-bot)**
- Node.js with Express.js
- OpenAI GPT-4 integration with function calling
- Facebook/Instagram Webhooks
- Message persistence to MongoDB
- Tool handlers for appointment booking and customer info retrieval

**Shared Models (packages/shared)**
- Centralized data models used by both backend and meta-bot
- Mongoose schemas: Appointment, User, Company, Contact, ServiceCategory, ServiceItem, etc.

### 1.2 High-Level Data Flow

```
Customer (Facebook/Instagram)
    ↓
Meta-Bot Webhook Handler
    ↓
OpenAI LLM (with tools)
    ├→ Tool: get_current_datetime
    ├→ Tool: get_customer_info
    ├→ Tool: list_services
    ├→ Tool: check_availability
    ├→ Tool: book_appointment
    ├→ Tool: list_appointments
    └→ Tool: cancel_appointment
    ↓
Backend API Calls (via tool handlers)
    ↓
MongoDB (Appointments, Contacts, Messages)
    ↓
Response → Back to Customer via Facebook/Instagram
```

### 1.3 Key Packages and Entry Points

**Backend Entry Point**: `/packages/backend/server.js`
- Starts Express app with routes
- Initializes Socket.io
- Connects to MongoDB
- Starts token refresh background job

**Routes** (in `/packages/backend/src/routes/`):
- `appointments.js` - CRUD operations on appointments
- `conversations.js` - Unified conversation management
- `messages.js` - Message handling and forwarding
- `meta.js` - Meta integration status
- `aiPrompts.js` - AI prompt management
- `setup.js` - Company setup flows
- `auth.js` - Authentication

**Meta-Bot Entry Point**: `/packages/meta-bot/server.js`
- Listens for Facebook/Instagram webhooks
- Routes: `operatorBot.routes.js`
- Controllers: `facebookOperatorBot.controllers.js`, `instagramOperatorBot.controllers.js`

---

## Part 2: Existing AI/LLM Integration

### 2.1 Current LLM Architecture

**Location**: `/packages/meta-bot/lib/LLM.js`

The system uses OpenAI's function calling API with two main functions:

```javascript
// Main LLM interaction
export async function createChatWithTools(
  messagesFromDb,
  system_instructions,
  openai_api_key,
  full_name,
  phone_number,
  tool_choice = "auto"
)

// Follow-up LLM call after tool execution
export async function continueChatWithToolResults({
  priorMessages,
  system_instructions,
  openai_api_key,
  toolResults,
})
```

**Key Characteristics**:
- Maintains conversation history from MongoDB
- Calls OpenAI with `tools` array from `utils/openaiTools.js`
- Handles tool calls (function calling) and returns results
- Has exponential backoff retry logic (2 retries with 2s, 4s delays)
- Timeout: 30 seconds
- Max completion tokens: 2000-2500

### 2.2 Current Tool Implementation

**Location**: `/packages/meta-bot/lib/toolHandlers.js` (1700+ lines)

Tools defined via `createToolHandlers(platform)` factory function:

#### Core Tools:
1. **get_current_datetime** - Returns current time in company timezone
2. **get_customer_full_name** - Stores and retrieves customer name
3. **get_customer_info** - Updates contact info (name, phone)
4. **list_services** - Lists all services for company
5. **check_availability** - Checks staff/time slot availability
6. **get_location_for_company** - Returns service locations
7. **book_appointment** - Creates appointment via BookingService
8. **list_appointments** - Retrieves customer's appointments
9. **cancel_appointment** - Cancels scheduled appointments
10. **get_or_create_pet** - Creates/fetches customer's pet

### 2.3 Workflow Management - Current Approach

**Meta-Bot Controller Flow** (`facebookOperatorBot.controllers.js` - 900+ lines):

```
Webhook Event (message from Facebook)
    ↓
isMessageProcessed(messageId) [duplicate check]
    ↓
getOrCreateCustomer(fbId, company)
    ↓
saveMessage(contact, company, text, "inbound")
    ↓
checkBotStatus (active, time interval)
    ↓
getMessagesByCustomer [fetch last 50 messages]
    ↓
createChatWithTools [LLM call with tools]
    ↓
if tool_calls exist:
    ├→ runToolCall (execute each tool)
    ├→ toolResults = []
    └→ continueChatWithToolResults [Follow-up LLM call]
    ↓
sendAndPersistMessage [Send to Facebook + save to DB]
    ↓
Socket.io emit for real-time UI updates
```

**Manual/Administrative Message Handling**:
```
Admin sends message via Facebook
    ↓
handleAdminMessage()
    ↓
If message lacks BOT_SIGNATURE (invisible char):
    ├→ Save as admin message
    └→ Auto-suspend bot for 14 days
```

**Issues with Current Approach**:
- Tool execution happens in a flat linear loop with no error recovery
- All logic is in a massive controller file (900+ lines)
- Hard to test individual steps
- No structured state representation between LLM calls
- No clear separation between decision logic and action execution
- Token management is scattered (not centralized)
- Error handling is scattered throughout

---

## Part 3: Backend Workflow Complexity

### 3.1 Appointment Booking Flow

**Service**: `/packages/backend/src/services/bookingService.js` (532 lines)

The booking workflow has multiple sequential validation steps:

```
Appointment Creation Request
    ↓
Step 1: validateAppointmentData()
    ├→ Check all required fields
    ├→ Validate date formats
    └→ Validate ObjectId formats
    ↓
Step 2: checkAvailability()
    ├→ Check staff overlapping appointments
    ├→ Check staff time-off
    ├→ Validate timezone-aware working hours
    ├→ Check break windows
    └→ Return availability result
    ↓
Step 3: Validate staff qualification
    ├→ Check if staff has required service category
    └→ Throw if not qualified
    ↓
Step 4: Resolve service and variant
    ├→ Fetch ServiceCategory
    ├→ Fetch ServiceItem (variant)
    └→ Validate existence
    ↓
Step 5: Check resource capacity
    ├→ Count concurrent reservations
    ├→ Count booking holds (tentatives)
    └→ Validate sufficient capacity
    ↓
Step 6: MongoDB Transaction (ACID)
    ├→ Create Appointment document
    ├→ Create ResourceReservation entries
    └→ Commit or rollback atomically
    ↓
Success: Return created appointment
```

**Conditional Branching**:
- If validation fails → throw 400 error with field errors
- If availability fails → throw 409 BOOKING_CONFLICT
- If staff not qualified → throw 400 STAFF_NOT_QUALIFIED
- If resource conflict → throw 409 RESOURCE_CONFLICT
- If transaction fails → cleanup and rollback

**Update Flow**:
- Similar multi-step validation
- Determines final values (use new or current)
- Rebuilds resource reservations if time/variant changed
- Also uses MongoDB transaction for atomicity

### 3.2 Company Setup Flow

**Service**: `/packages/backend/src/services/companySetupService.js` (400+ lines)

Handles multi-step company initialization:
1. Create company profile
2. Setup locations
3. Configure services and categories
4. Create staff users
5. Configure schedules
6. Setup integrations (Facebook/Instagram)
7. Apply AI prompts

### 3.3 Message Forwarding Workflow

**Service**: `/packages/backend/src/services/messageForwarding.service.js`

Operator messages go through multi-step processing:

```
Operator sends message via dashboard
    ↓
Save to Message collection
    ↓
Forward to Meta-Bot server
    ├→ Get company info
    ├→ Get integration tokens
    ├→ Get contact social IDs
    └→ Call Meta-Bot endpoint
    ↓
Meta-Bot receives and sends to Facebook/Instagram
```

### 3.4 Token Refresh Job

**Job**: `/packages/backend/src/jobs/tokenRefreshJob.js`

Scheduled background job:
```
Every 24 hours:
    ↓
refreshExpiringFacebookTokens()
    ├→ Find expiring tokens
    ├→ Exchange for long-lived tokens
    ├→ Update database
    └→ Alert if critical
```

---

## Part 4: Current State Management Patterns

### 4.1 Implicit State Management

**1. Conversation History as State**
- Stored in MongoDB Message collection
- Retrieved on each LLM call
- Last 50 messages fetched for context

**2. Contact State**
- `botSuspended` flag (manual suspend)
- `botSuspendUntil` date (auto-suspension with expiry)
- Suspension state prevents bot from responding

**3. Message Processing State**
- `processedMessageIds` Set at module level (1000 entry limit)
- Prevents duplicate processing of Facebook messages
- Manual cleanup of stale buffers every 10 minutes

**4. Buffer State (Module-Level)**
```javascript
const bufferFacebookConversation = {
  [senderId]: {
    timeoutId,
    lastActivity,
    // ... other state
  }
}
```

**5. Appointment State**
- `status` field: scheduled → checked_in → in_progress → completed (or canceled/no_show)
- Resource reservations track concurrent bookings

### 4.2 Issues with Current State Management

1. **Scattered State**: State spread across MongoDB, module-level variables, Set structures
2. **No Explicit State Transitions**: State changes not tracked as events
3. **Implicit Validation**: Availability checking embedded deep in booking service
4. **Memory Leaks Risk**: Buffers and processed message IDs require manual cleanup
5. **Transaction Loss**: If a step fails mid-way, no clear rollback mechanism for multi-service operations

---

## Part 5: LangGraph Integration Opportunities

### 5.1 Primary Candidate: Meta-Bot Conversation Agent

**File**: `/packages/meta-bot/controllers/facebookOperatorBot.controllers.js` + `/packages/meta-bot/lib/LLM.js` + `/packages/meta-bot/lib/toolHandlers.js`

**Current Issues**:
- 900+ line controller with multiple responsibilities
- Tool execution in flat loop (no branching, error recovery)
- Manual state management between LLM calls
- Hard to add conditional logic based on tool results
- Difficult to test individual agent steps

**LangGraph Pattern**: **Agentic Graph with Tool Calling**

```
State Structure:
{
  messages: Message[]              // Conversation history
  customer_info: { name, phone }   // Known customer data
  last_tool_results: object        // From previous tools
  error_state?: string             // Track errors
  next_action: string              // Next step marker
  response_ready: boolean          // Final response ready
}

Nodes:
1. receive_message
   - Parse incoming message
   - Check duplicates
   - Update state with new user message

2. check_bot_status
   - Validate bot is active
   - Check suspension
   - Check time intervals
   - Route to error if bot offline

3. get_llm_response
   - Call OpenAI with tools
   - Parse tool calls
   - Determine if final response or tool call

4. execute_tools
   - Run each tool sequentially
   - Accumulate results
   - Handle tool errors gracefully

5. generate_final_response
   - LLM call with tool results
   - Generate customer-facing message

6. persist_and_send
   - Save to MongoDB
   - Send via Facebook
   - Emit Socket.io event

Edges (Conditional Routing):
- receive_message → check_bot_status
- check_bot_status → get_llm_response (if active) or END (if inactive)
- get_llm_response → execute_tools (if tool_calls) or persist_and_send (if text response)
- execute_tools → generate_final_response
- generate_final_response → persist_and_send
- persist_and_send → END
```

**Benefits**:
- Clear separation of concerns
- Tool execution with proper error handling
- Testable components
- Easy to add new tools
- Clear state visibility
- Better debugging/logging

### 5.2 Secondary Candidate: Appointment Booking Workflow

**File**: `/packages/backend/src/services/bookingService.js`

**Current Issues**:
- Sequential validation steps (6+ steps)
- Conditional branching scattered throughout
- Errors thrown at various levels
- No clear state progression
- Hard to add new validation rules

**LangGraph Pattern**: **Sequential Validation State Machine**

```
State Structure:
{
  input_data: object               // Original request
  company_id: string
  validation_errors: string[]      // Accumulated errors
  availability: object             // Availability check result
  staff_qualified: boolean
  service: object                  // Resolved service
  resources_available: boolean
  appointment: object              // Created appointment
  status: enum                     // PENDING, VALIDATING, RESERVING, COMMITTED
}

Nodes:
1. validate_appointment_data
   - Check required fields
   - Validate formats
   - Return validation_errors

2. check_staff_availability
   - Check overlaps
   - Check time-off
   - Check working hours
   - Check breaks

3. validate_staff_qualification
   - Resolve service
   - Check staff can do service

4. validate_service_exists
   - Fetch service
   - Fetch variant
   - Check all required resources

5. check_resource_capacity
   - Count concurrent reservations
   - Count booking holds
   - Validate capacity

6. create_appointment_transaction
   - Start MongoDB session
   - Create appointment
   - Create reservations
   - Commit/rollback

Edges:
- start → validate_appointment_data
- validate_appointment_data → check_staff_availability (if valid) or error_end
- check_staff_availability → validate_staff_qualification (if available) or error_end
- validate_staff_qualification → validate_service_exists (if qualified) or error_end
- validate_service_exists → check_resource_capacity (if service valid) or error_end
- check_resource_capacity → create_appointment_transaction (if capacity ok) or error_end
- create_appointment_transaction → end (success) or error_end (rollback)
```

**Benefits**:
- Clear validation order
- Easy to add new validation rules
- Atomic transaction handling
- Better error tracking per step
- Testable validation logic

### 5.3 Tertiary Candidate: Company Setup Workflow

**File**: `/packages/backend/src/services/companySetupService.js`

**Pattern**: **Sequential Setup State Machine**

Could represent setup wizard with state tracking:
```
States: NOT_STARTED → BASIC_INFO → LOCATIONS → SERVICES → STAFF → SCHEDULES → INTEGRATIONS → COMPLETE
```

### 5.4 Candidate: Message Routing Workflow

**File**: `/packages/backend/src/services/messageForwarding.service.js`

**Pattern**: **Data Pipeline/ETL**

```
Nodes:
1. validate_message
2. get_company_integration
3. get_contact_info
4. format_payload
5. forward_to_meta_bot
6. handle_errors
```

---

## Part 6: Specific Files and Functions for LangGraph Replacement

### Meta-Bot Core Files (HIGHEST PRIORITY)

#### File 1: `/packages/meta-bot/controllers/facebookOperatorBot.controllers.js`

**Current Functions to Replace**:
- `processCustomerMessage()` (lines 442-602) - Main LLM orchestration
- Tool execution loop (lines 517-567)
- Follow-up LLM call logic

**Replacement Strategy**:
- Create `FacebookConversationGraph` class extending LangGraph StateGraph
- Extract `runToolCall()` as tool execution node
- Create dedicated nodes for:
  - Message validation
  - LLM calls (both initial and follow-up)
  - Tool execution
  - Response persistence

#### File 2: `/packages/meta-bot/lib/LLM.js`

**Current Functions to Leverage**:
- `createChatWithTools()` - Keep as-is for LLM API interaction
- `continueChatWithToolResults()` - Keep for follow-up LLM calls
- These are now "utilities" called by nodes instead of controller logic

**Replacement Strategy**:
- Create wrapper functions that are called by graph nodes
- Add retry logic at node level (currently at function level)
- Improve error handling for timeout scenarios

#### File 3: `/packages/meta-bot/lib/toolHandlers.js`

**Current Functions**: Already well-modularized

**Replacement Strategy**:
- Keep tool handler functions as-is
- Wrap with node that handles tool invocation
- Add error recovery per tool
- Better logging of tool results

#### File 4: `/packages/meta-bot/controllers/instagramOperatorBot.controllers.js`

**Same as Facebook**: Can use same graph structure with platform parameter

### Backend Files (MEDIUM PRIORITY)

#### File: `/packages/backend/src/services/bookingService.js`

**Functions to Replace**:
- `createAppointment()` (lines 224-356) - Main booking flow
- `updateAppointment()` (lines 361-486) - Reschedule flow

**Replacement Strategy**:
- Create `BookingWorkflow` graph
- Break `checkAvailability()` into separate node
- Each validation step as its own node
- Transaction handling in final node

#### File: `/packages/backend/src/routes/appointments.js`

**Update**: Route handlers would call `.invoke()` on booking graph instead of service method directly

### Token Refresh Job (LOW PRIORITY - Optional)

#### File: `/packages/backend/src/jobs/tokenRefreshJob.js`

**Could model as graph**:
- Query expiring tokens
- Exchange tokens
- Update database
- Send alerts

---

## Part 7: Data Models for LangGraph States

### Meta-Bot Conversation State

```typescript
interface ConversationState {
  // Input/Context
  company_id: string;
  customer_id: string;
  platform: "facebook" | "instagram";
  
  // Message History
  messages: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
  
  // Customer Data
  customer_info: {
    full_name?: string;
    phone_number?: string;
    chat_id: string;
    bot_suspended?: boolean;
    bot_suspend_until?: Date;
  };
  
  // LLM State
  last_llm_response?: {
    assistant_message: string | null;
    tool_calls: Array<{
      name: string;
      parameters: object;
      raw: object;
    }> | null;
  };
  
  // Tool Execution State
  tool_results: Array<{
    name: string;
    parameters: object;
    result: object;
    error?: string;
  }>;
  
  // Control Flow
  status: "processing" | "waiting_for_tools" | "ready_to_respond" | "error";
  error_message?: string;
  final_response?: string;
  
  // Metadata
  created_at: Date;
  updated_at: Date;
  processing_steps: string[];
}
```

### Booking Workflow State

```typescript
interface BookingState {
  // Input
  appointment_data: {
    companyId: string;
    customerId: string;
    staffId?: string;
    start: Date;
    end: Date;
    serviceId: string;
    serviceItemId?: string;
    locationId: string;
    // ... other fields
  };
  
  // Validation Results
  validation_errors: string[];
  availability_check?: {
    available: boolean;
    reason?: string;
  };
  
  // Resolved Data
  staff_qualified?: boolean;
  service?: object;
  resources_available?: boolean;
  
  // Result
  appointment?: object;
  status: "validating" | "checking_availability" | "reserving" | "committed" | "failed";
  error?: string;
}
```

---

## Part 8: Implementation Roadmap

### Phase 1: Meta-Bot Graph (Weeks 1-2)
1. Install LangGraph dependencies
2. Create `FacebookConversationGraph` class
3. Move controller logic to graph nodes
4. Add test coverage for each node
5. Deploy and compare with current behavior
6. Create `InstagramConversationGraph` (reuse same graph structure)

### Phase 2: Backend Booking Graph (Weeks 2-3)
1. Create `BookingWorkflow` graph
2. Extract validation logic to nodes
3. Refactor BookingService to use graph
4. Update appointment controller to call graph
5. Add integration tests

### Phase 3: Additional Workflows (Weeks 3-4)
1. Implement company setup graph
2. Implement message routing graph
3. Token refresh as scheduled graph execution

### Phase 4: Optimization & Testing (Week 4+)
1. Add comprehensive unit tests
2. Add integration tests with real workflows
3. Performance testing and optimization
4. Documentation

---

## Part 9: LangGraph Specific Patterns to Use

### Pattern 1: Tool-Using Agent

```javascript
const graph = new StateGraph(ConversationState)
  .addNode("receive_message", receiveMessageNode)
  .addNode("call_llm", callLlmNode)
  .addNode("execute_tools", executeToolsNode)
  .addNode("respond", respondNode)
  .addEdge("receive_message", "call_llm")
  .addConditionalEdges(
    "call_llm",
    (state) => state.tool_calls ? "execute_tools" : "respond"
  )
  .addEdge("execute_tools", "call_llm")
  .addEdge("respond", END);
```

### Pattern 2: Sequential Validation

```javascript
const graph = new StateGraph(BookingState)
  .addNode("validate_input", validateInputNode)
  .addNode("check_availability", checkAvailabilityNode)
  .addNode("qualify_staff", qualifyStaffNode)
  .addNode("resolve_service", resolveServiceNode)
  .addNode("check_resources", checkResourcesNode)
  .addNode("commit_transaction", commitTransactionNode)
  .addEdge("validate_input", "check_availability")
  .addConditionalEdges("check_availability", routeOnAvailability)
  // ... etc
```

### Pattern 3: Error Recovery

Use `addConditionalEdges` to route to error handlers:
```javascript
.addConditionalEdges(
  "execute_tools",
  (state) => {
    if (state.error) return "handle_error";
    return "generate_response";
  }
)
.addNode("handle_error", handleErrorNode)
```

---

## Part 10: Potential Challenges and Mitigations

### Challenge 1: Backward Compatibility
**Issue**: Existing code calls BookingService directly
**Mitigation**: Wrap graph in service class that implements same interface
```javascript
class BookingService {
  static async createAppointment(data) {
    const graph = buildBookingGraph();
    const result = await graph.invoke({ appointment_data: data });
    return result.appointment;
  }
}
```

### Challenge 2: Token Usage Monitoring
**Issue**: LangGraph has overhead
**Mitigation**: Monitor token usage at graph execution level, log per node

### Challenge 3: Debugging Complex Workflows
**Issue**: Hard to debug multiple nodes
**Mitigation**: Implement detailed logging per node, add tracing

### Challenge 4: State Serialization for Persistence
**Issue**: Some state may not be JSON-serializable
**Mitigation**: Implement custom serializers for complex objects

### Challenge 5: Concurrent Message Processing
**Issue**: Multiple simultaneous webhook events for same customer
**Mitigation**: Use MongoDB atomic operations + lock mechanism in graph

---

## Part 11: Quick Reference - Key Numbers

| Metric | Value |
|--------|-------|
| Backend Service Controllers | 23 files |
| Backend Services | 9 files |
| Meta-Bot Controllers | 4 files (2 platforms × 2 types) |
| API Routes | 18 route files |
| Shared Models | 14 models |
| AI Tools Current | 10 tools |
| Booking Validation Steps | 6+ steps |
| LOC in controller files | ~900 (facebook) + ~900 (instagram) |
| Message History Limit | 50 messages |
| Processed Message Cache | 1000 entries max |
| Token Refresh Interval | 24 hours |

---

## Part 12: Recommended Reading Order

1. Start with `/packages/meta-bot/lib/LLM.js` - understand OpenAI integration
2. Then `/packages/meta-bot/lib/toolHandlers.js` - understand available tools
3. Then `/packages/meta-bot/controllers/facebookOperatorBot.controllers.js` - understand orchestration
4. Then `/packages/backend/src/services/bookingService.js` - understand validation flows
5. Then `/packages/backend/src/routes/appointments.js` - understand API layer

---

## Conclusion

LangGraph is well-suited for PetBuddy 2.0 because:

1. **Agent with Tools**: Meta-bot perfectly fits tool-using agent pattern
2. **Complex Workflows**: Booking has natural state machine structure
3. **State Management**: Current approach is scattered; LangGraph centralizes it
4. **Testability**: Graph nodes are easier to test in isolation
5. **Maintainability**: Clear nodes > 900-line controller files
6. **Extensibility**: Adding tools/steps is straightforward with graphs

The meta-bot conversation agent should be the **first priority** for LangGraph integration, followed by the booking workflow.
