# LangGraph Integration - Architecture Diagrams

## 1. Current Meta-Bot Architecture (As-Is)

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Facebook/Instagram Webhook                      │
│                                                                       │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────┐
        │  FacebookOperatorBot Controller       │
        │  (900+ lines monolithic)              │
        └──────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
    ┌────────┐        ┌─────────┐      ┌──────────┐
    │ Manual │        │ Duplicate│      │ Bot Status│
    │ Message│        │ Check    │      │ Check    │
    │Handler │        │          │      │          │
    └────────┘        └─────────┘      └──────────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                           ▼
            ┌──────────────────────────────┐
            │   processCustomerMessage()   │
            │  - Get message history (50)  │
            │  - Call OpenAI createChat    │
            │  - if tool_calls:            │
            │    - Loop: runToolCall()     │
            │    - Call continueChatWith   │
            │  - else: just respond        │
            └──────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
   ┌────────┐         ┌─────────┐      ┌──────────┐
   │Send To │         │Save To  │      │ Emit     │
   │Facebook│         │MongoDB  │      │Socket.io │
   └────────┘         └─────────┘      └──────────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                           ▼
                ┌──────────────────────┐
                │ Customer Response    │
                │ (via Facebook chat)  │
                └──────────────────────┘
```

### Issues:
- No state representation
- Flat linear flow
- All logic in one function
- No error recovery in tool loop
- Hard to test
- Hard to extend

---

## 2. Proposed Meta-Bot with LangGraph (To-Be)

```
┌──────────────────────────────────────────────────────────────────────┐
│                      Facebook/Instagram Webhook                       │
│                                                                        │
└───────────────────────────┬──────────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │  FacebookConversationGraph            │
        │  (StateGraph with explicit nodes)     │
        └───────────────────────────────────────┘
                            │
        ┌───────────────────┼────────────────────┐
        │                   │                    │
        ▼                   ▼                    ▼
   ┌─────────────┐  ┌──────────────────┐  ┌─────────────┐
   │receive_msg  │  │check_bot_status  │  │validate_    │
   │             │  │                  │  │message      │
   │- Check dups │  │- Active?         │  │- Check      │
   │- Parse text │  │- Not suspended?  │  │  attachments│
   │- Get history│  │- Time interval?  │  │             │
   └─────────────┘  └──────────────────┘  └─────────────┘
        │                   │                    │
        └───────────────────┼────────────────────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │  call_llm_node   │
                  │                  │
                  │- createChat()    │
                  │  with tools      │
                  │- Parse response  │
                  └──────────────────┘
                            │
            ┌───────────────┴───────────────┐
            │ Conditional: Tool calls?      │
            ▼                               ▼
      ┌─────────────────┐           ┌──────────────────┐
      │execute_tools    │           │ respond_node     │
      │_node            │           │                  │
      │                 │           │ - Save message   │
      │- Loop tools     │           │ - Send to FB     │
      │- Handle errors  │           │ - Emit Socket.io │
      │- Accumulate     │           │                  │
      │  results        │           └──────────────────┘
      └────────┬────────┘                   │
               │                            │
               ▼                            │
      ┌─────────────────┐                  │
      │generate_final   │                  │
      │_response_node   │                  │
      │                 │                  │
      │- continueChatWith│                  │
      │  ToolResults()  │                  │
      └────────┬────────┘                  │
               │                           │
               └───────────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   Response Ready     │
                    │  (via Facebook chat) │
                    └──────────────────────┘
```

### Benefits:
- Clear state object tracking between nodes
- Each node has single responsibility
- Conditional routing is explicit
- Error handling at node level
- Easy to test each node independently
- Easy to add new tools/nodes
- Clear debugging and observability

---

## 3. Booking Workflow Comparison

### Current (As-Is):

```
Request → validateAppointmentData()
            ├─ Check fields
            ├─ Check formats
            └─ Check ObjectIds
          ↓
          checkAvailability()
            ├─ Check overlaps
            ├─ Check time-off
            ├─ Check working hours
            └─ Check breaks
          ↓
          Validate staff qualification
          ↓
          Resolve service & variant
          ↓
          Check resource capacity
          ↓
          MongoDB Transaction {
            Create Appointment
            Create Reservations
          }
          ↓
Response

Issues:
- Errors thrown at various levels
- No explicit state tracking
- Validation logic mixed with data operations
- Hard to add new validation rules
- Hard to debug where failures happen
```

### Proposed (To-Be with LangGraph):

```
Request 
   │
   ▼
┌──────────────────────────┐
│ validate_input_node      │
├──────────────────────────┤
│ - Check fields           │
│ - Validate formats       │
│ - Set validation_errors  │
└──────────────────────────┘
   │
   ├─ validation_errors? ─────────────────────┐
   │                                          │
   ▼                                          │
┌──────────────────────────┐                  │
│ check_availability_node  │                  │
├──────────────────────────┤                  │
│ - Check staff overlaps   │                  │
│ - Check time-off         │                  │
│ - Check working hours    │                  │
│ - Set availability       │                  │
└──────────────────────────┘                  │
   │                                          │
   ├─ not available? ──────────────────────┐  │
   │                                       │  │
   ▼                                       │  │
┌──────────────────────────┐               │  │
│ validate_qualification   │               │  │
├──────────────────────────┤               │  │
│ - Get service            │               │  │
│ - Check staff cert       │               │  │
│ - Set qualified flag     │               │  │
└──────────────────────────┘               │  │
   │                                       │  │
   ├─ not qualified? ──────────────────────┼──┤
   │                                       │  │
   ▼                                       │  │
┌──────────────────────────┐               │  │
│ validate_service_node    │               │  │
├──────────────────────────┤               │  │
│ - Fetch ServiceCategory  │               │  │
│ - Fetch ServiceItem      │               │  │
│ - Validate resources     │               │  │
└──────────────────────────┘               │  │
   │                                       │  │
   ├─ invalid? ────────────────────────────┼──┤
   │                                       │  │
   ▼                                       │  │
┌──────────────────────────┐               │  │
│ check_resources_node     │               │  │
├──────────────────────────┤               │  │
│ - Count reservations     │               │  │
│ - Count holds            │               │  │
│ - Validate capacity      │               │  │
└──────────────────────────┘               │  │
   │                                       │  │
   ├─ insufficient? ───────────────────────┼──┤
   │                                       │  │
   ▼                                       │  │
┌──────────────────────────┐               │  │
│ create_transaction_node  │               │  │
├──────────────────────────┤               │  │
│ - Start session          │               │  │
│ - Create Appointment     │               │  │
│ - Create Reservations    │               │  │
│ - Commit/Rollback        │               │  │
│ - Set appointment_created│               │  │
└──────────────────────────┘               │  │
   │                                       │  │
   ├─ success ─────────┐                  │  │
   │                   │                  │  │
   ▼                   ▼                  │  │
┌─────────┐      ┌───────────────────────┼──┴──┐
│ success │      │ error_response_node   │     │
│response │      │                       │     │
└─────────┘      │ - Format error        │     │
                 │ - Return validation   │     │
                 │   errors or reason    │     │
                 └───────────────────────┘     │
                 ▲                             │
                 └─────────────────────────────┘
```

### Benefits of LangGraph approach:
- Each validation is a separate testable node
- State accumulates clearly
- Branching is explicit
- Error handling consistent
- Easy to add new validation steps
- Can emit events per step
- Can log/trace execution path
- Can add analytics/metrics

---

## 4. State Object Evolution Through Booking Graph

```
INITIAL STATE:
{
  appointment_data: {
    companyId: "...",
    customerId: "...",
    staffId: "...",
    start: Date,
    end: Date,
    serviceId: "...",
    serviceItemId: "...",
    locationId: "..."
  },
  validation_errors: [],
  status: "validating"
}

AFTER validate_input_node:
{
  ...
  validation_errors: [],  // or populated with errors
  status: "validating"
}

AFTER check_availability_node:
{
  ...
  availability_check: {
    available: true,
    reason: null
  },
  status: "checking_availability"
}

AFTER validate_qualification_node:
{
  ...
  staff_qualified: true,
  service: { _id: "...", name: "Grooming", ... },
  status: "qualifying"
}

AFTER validate_service_node:
{
  ...
  service_valid: true,
  service_item: { _id: "...", duration: 60, ... },
  required_resources: [ { resourceTypeId: "...", qty: 1 }, ... ]
  status: "validating_service"
}

AFTER check_resources_node:
{
  ...
  resources_available: true,
  resource_check_details: { totalCapacity: 5, used: 2, available: 3 },
  status: "checking_resources"
}

AFTER create_transaction_node:
{
  ...
  appointment_created: {
    _id: "...",
    companyId: "...",
    start: Date,
    end: Date,
    status: "scheduled",
    ...
  },
  resource_reservations: [ { _id: "...", resourceTypeId: "...", ... }, ... ],
  status: "committed",
  error: null
}
```

---

## 5. Concurrent Message Processing in LangGraph

```
┌────────────────────────────────────────────┐
│ Multiple webhook events for same customer  │
│ (FB may retry, or rapid messages)          │
└──────────┬────────────────────────────────┘
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
  Msg1          Msg2
    │             │
    ▼             ▼
Check  Process1   Check  Process2
Graph                Graph
    │             │
    ├─ Lock? ──┐  └─ Lock? ──┐
    │          │             │
    ▼          │             ▼
Obtain    Obtain fails    Obtain
Lock         Wait         Lock
    │        Retry             │
    ▼                          ▼
Execute    After 1st    Execute
Node       completes    Node
    │                       │
    ▼                       ▼
Release                 Release
Lock                    Lock

Benefits:
- Explicit locking at state graph level
- Prevents concurrent state corruption
- Automatic retry for lock contention
- Clear debugging of concurrency issues
```

---

## 6. Integration Points with REST API

```
EXPRESS ROUTE
   │
   ├─ Parse request
   ├─ Validate with express-validator
   ├─ Check auth/permissions
   │
   ▼
GRAPH INVOCATION
   │
   ├─ Build initial state
   ├─ Call graph.invoke(state)
   │  │
   │  ├─ Execute nodes
   │  ├─ Track state evolution
   │  ├─ Handle errors
   │  │
   │  └─ Return final state
   │
   ▼
RESPONSE FORMATTING
   │
   ├─ Extract result from final state
   ├─ Format for HTTP response
   ├─ Set status code
   │
   ▼
HTTP RESPONSE
   └─ 200 OK, 400 Bad Request, 409 Conflict, etc.

Example (Appointment Creation):
POST /api/v1/appointments
  ↓
appointmentController.createAppointment()
  ↓
bookingGraph.invoke(appointmentData)
  ↓
State evolves through 6 nodes
  ↓
Return final state with appointment_created
  ↓
Response 200 OK { appointment: {...} }
  or
Response 409 CONFLICT { reason: "Availability conflict" }
```

---

## 7. LangGraph in Microservices Context

```
┌──────────────────────────────────────┐
│         Frontend (React)              │
│  - Customer Dashboard                │
│  - Appointment Booking                │
│  - Message Management                │
└──────────────┬───────────────────────┘
               │ HTTP API
               ▼
┌──────────────────────────────────────┐
│      Backend (Express + Graph)       │
│  ┌────────────────────────────────┐  │
│  │ Appointment GraphQL/REST       │  │
│  │  - BookingWorkflow (Graph)     │  │
│  │  - MessageForwardingPipeline   │  │
│  │  - CompanySetupWorkflow        │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │ Authentication/RBAC            │  │
│  │ - JWT validation               │  │
│  │ - Role-based access            │  │
│  └────────────────────────────────┘  │
└──────────┬────────────────────────────┘
           │ API Calls
           │ Socket.io Events
           │
    ┌──────┴──────────────────────┐
    │                             │
    ▼                             ▼
┌─────────────────────┐  ┌──────────────────────┐
│   Meta-Bot Server   │  │   MongoDB            │
│                     │  │  - Messages          │
│ ┌─────────────────┐ │  │  - Appointments      │
│ │Facebook Graph   │ │  │  - Contacts          │
│ │  (Graph)        │ │  │  - Companies         │
│ ├─────────────────┤ │  │  - Services          │
│ │Instagram Graph  │ │  │  - Users             │
│ │  (Graph)        │ │  └──────────────────────┘
│ └─────────────────┘ │
│                     │
│ Tool Handlers:      │
│ - booking           │
│ - availability      │
│ - customer_info     │
│ - services          │
└─────────────────────┘
        │
        ▼
  Facebook/Instagram
  Webhooks & Send API
```

---

## 8. Node Execution Timeline Visualization

### Conversation Graph Example:

```
Timeline: 0ms → 100ms → 200ms → 300ms → 400ms → 500ms

T0ms:  ┌─ receive_message
       │  └─ Parse incoming Facebook message
       │     Parsing time: ~5ms
       │
T5ms:  ├─ check_bot_status
       │  ├─ Query MongoDB for bot_active flag
       │  └─ Check suspension status
       │     DB time: ~20ms
       │
T25ms: ├─ get_llm_response [MAIN WAIT POINT]
       │  ├─ Build message list (50 msgs from DB)
       │  ├─ Call OpenAI API
       │  └─ Parse response
       │     API round-trip: ~300ms (typical LLM latency)
       │
T325ms:├─ [Conditional Branch]
       │  ├─ IF tool_calls:
       │  │  └─ execute_tools
       │  │     ├─ Tool 1: check_availability (~30ms)
       │  │     ├─ Tool 2: get_services (~20ms)
       │  │     └─ Tool 3: book_appointment (~50ms)
       │  │        Total: ~100ms
       │  │
       │  └─ Then: generate_final_response
       │     └─ LLM call with tool results
       │        API time: ~200ms
       │  │
       │  └─ ELSE (no tools):
       │     └─ respond_node (skip to persist)
       │
T425ms:├─ persist_and_send
       │  ├─ Save message to MongoDB (~20ms)
       │  ├─ Send to Facebook API (~30ms)
       │  └─ Emit Socket.io event (~10ms)
       │     Total: ~60ms
       │
T485ms: └─ END

Total Latency: ~485ms (mostly LLM waiting time)

Breakdown:
- Parsing: 5ms
- Database: 20ms
- LLM Initial: 300ms
- Tools: 100ms
- LLM Follow-up: 200ms
- Persistence: 60ms
- ────────────
- Total: 685ms (with tools)
         or ~325ms (without tools)
```

---

## 9. Error Handling and Recovery Graph

```
┌─────────────────────────────────────┐
│    Node Execution                   │
└─────────────────────────────────────┘
         │
         ▼
    ┌─────────────┐
    │ Try Execute │
    └─────────────┘
         │
     ┌───┴────────────────────────┐
     │ Success?                   │ Error?
     ▼                            ▼
 ┌────────┐              ┌──────────────────┐
 │Continue│              │ Error Handler    │
 │to next │              │                  │
 │  node  │              │ 1. Log error     │
 └────────┘              │ 2. Categorize    │
     │                   │    - Retryable?  │
     ▼                   │    - Fatal?      │
  [SUCCESS]              │    - User error? │
                         └────────┬─────────┘
                                  │
                          ┌───────┴────────┐
                          │                │
                    Retryable?        Non-retryable
                          │                │
                    ┌─────▼─────┐    ┌────▼─────┐
                    │ Retry Node│    │Error Resp│
                    │ (up to 3x) │    │ Node     │
                    │ w/ backoff │    │          │
                    └─────┬─────┘    └────┬─────┘
                          │               │
                    ┌─────┴─────┐         │
                    │           │        │
                Success?   Still fail?   │
                    │           │        │
                    ▼           ▼        ▼
                 [Continue] [Error] [ERROR]
```

---

## 10. State Persistence and Recovery

```
Graph Execution Flow with Checkpointing:

Initial State
    │
    ▼
Node 1: receive_message
    │
    ├─ Checkpoint 1: Save state after Node 1
    │
    ▼
Node 2: check_bot_status
    │
    ├─ Checkpoint 2: Save state after Node 2
    │
    ▼
Node 3: get_llm_response
    │
    ├─ ERROR OCCURS (network timeout)
    │
    ├─ Checkpoint 3: Save failed state
    │
    ├─ Can REPLAY from Checkpoint 2
    │  - Re-execute Node 3 with same input
    │  - Don't need to re-run Node 1, 2
    │
    └─ Or RESUME from Checkpoint 3
       - Continue from where it failed
       - Depending on implementation

Benefits in Production:
- Recover from transient failures
- Resume long-running workflows
- Audit trail of state changes
- Replay for debugging
```

---

This comprehensive visualization suite shows:

1. Current vs. proposed architectures
2. State evolution through workflows
3. Concurrency handling
4. Integration with REST APIs
5. Microservices interaction
6. Execution timeline and latency
7. Error handling and recovery
8. Persistence and checkpoint mechanisms

All of these make LangGraph particularly valuable for PetBuddy 2.0's complex agent and workflow scenarios.
