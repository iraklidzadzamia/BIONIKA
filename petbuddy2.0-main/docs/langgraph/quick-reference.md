# LangGraph Integration - Quick Reference Guide

## Executive One-Pager

**Project**: PetBuddy 2.0 - Pet Grooming Salon Management System
**Primary Use Case**: Agentic customer service chatbot (Facebook/Instagram)
**Secondary Use Case**: Appointment booking workflow automation
**LangGraph Fit**: EXCELLENT (tool-using agents + state machines)

**Top Priority**: Meta-Bot Conversation Agent
**Timeline**: 2-3 weeks to production-ready
**Impact**: Cleaner code, easier testing, better state management

---

## File Summary Table

| File Path                                                            | Lines | Current Issue                  | LangGraph Benefit         |
| -------------------------------------------------------------------- | ----- | ------------------------------ | ------------------------- |
| `/packages/meta-bot/controllers/facebookOperatorBot.controllers.js`  | 900+  | Monolithic, no state tracking  | Extract to 6 clear nodes  |
| `/packages/meta-bot/controllers/instagramOperatorBot.controllers.js` | 900+  | Duplicate logic                | Reuse same graph          |
| `/packages/meta-bot/lib/LLM.js`                                      | 222   | Embedded in controller         | Wrap as utility functions |
| `/packages/meta-bot/lib/toolHandlers.js`                             | 1700+ | Well-modularized (good)        | Wrap tool calls in node   |
| `/packages/backend/src/services/bookingService.js`                   | 532   | Sequential, tangled validation | Extract to 6 nodes        |
| `/packages/backend/src/routes/appointments.js`                       | 157   | Direct service calls           | Call graph instead        |
| `/packages/backend/src/services/messageForwarding.service.js`        | 227   | Linear pipeline                | Could be graph pipeline   |

---

## State Structures Quick Reference

### ConversationState

```javascript
{
  // Context
  company_id, customer_id, platform,

  // Data
  messages[], customer_info{},

  // Execution
  last_llm_response{}, tool_results[],

  // Control
  status, error_message, final_response
}
```

### BookingState

```javascript
{
  // Input
  appointment_data{},

  // Validation
  validation_errors[], availability_check{},

  // Results
  staff_qualified, service{}, resources_available,

  // Outcome
  appointment{}, status, error
}
```

---

## Node Templates

### Conversation Node Template

```javascript
async function nodeFunction(state) {
  try {
    // 1. Extract from state
    const { company_id, customer_id, messages } = state;

    // 2. Do work (query, API call, LLM, etc)
    const result = await someAsyncOperation();

    // 3. Update state
    return {
      ...state,
      updated_field: result,
      processing_steps: [...(state.processing_steps || []), "node_name"],
    };
  } catch (error) {
    return {
      ...state,
      status: "error",
      error_message: error.message,
    };
  }
}
```

### Booking Node Template

```javascript
async function validationNode(state) {
  // Validate something specific
  const { appointment_data } = state;

  // Check condition
  if (!isValid(appointment_data)) {
    return {
      ...state,
      validation_errors: [...state.validation_errors, "specific error"],
      status: "validation_failed",
    };
  }

  return {
    ...state,
    validation_passed: true,
    status: "next_step",
  };
}
```

---

## Router/Edge Functions

### Conditional Router

```javascript
function routeOnResult(state) {
  if (state.tool_calls && state.tool_calls.length > 0) {
    return "execute_tools";
  }
  return "respond_node";
}
```

### Error Router

```javascript
function routeOnError(state) {
  if (state.error) {
    return state.error === "retryable" ? "retry_node" : "error_response";
  }
  return "next_node";
}
```

---

## Key Tools (Current)

| Tool                       | Input            | Output                           | Used By |
| -------------------------- | ---------------- | -------------------------------- | ------- |
| `get_current_datetime`     | timezone         | {local_text, iso_local, utc_iso} | LLM     |
| `get_customer_info`        | full_name, phone | {full_name}                      | LLM     |
| `list_services`            | none             | [services]                       | LLM     |
| `check_availability`       | date, staff_id   | {available, reason}              | LLM     |
| `book_appointment`         | appointment_data | {success, appointment}           | LLM     |
| `list_appointments`        | customer_id      | [appointments]                   | LLM     |
| `cancel_appointment`       | appointment_id   | {success}                        | LLM     |
| `get_or_create_pet`        | pet_data         | {pet}                            | LLM     |
| `get_location_for_company` | company_id       | [locations]                      | LLM     |
| `get_customer_full_name`   | full_name        | {full_name}                      | LLM     |

---

## Webhook Flow - Current vs Proposed

### Current (Synchronous)

```
Webhook → Controller {
  ├─ Duplicate check
  ├─ Get customer
  ├─ Save message
  ├─ Check bot status
  ├─ Get LLM response
  ├─ if tools: run each, get follow-up
  ├─ Send response
  ├─ Save response
  └─ Emit socket event
} → Response (500-700ms)
```

### Proposed (LangGraph)

```
Webhook → Graph.invoke(state) {
  Node 1: receive_message → state
  Node 2: check_bot_status → state
  Node 3: call_llm → state
  Router: branch on tool_calls
    ├─ Path A: execute_tools → generate_response → ...
    └─ Path B: respond_node → ...
  Final: persist_and_send → state
} → Response (same latency, cleaner code)
```

---

## Database Queries by Node

| Node                    | Collections     | Operation              |
| ----------------------- | --------------- | ---------------------- |
| receive_message         | Message         | Find recent 50         |
| check_bot_status        | Company         | FindById bot_active    |
| check_bot_status        | Contact         | FindById bot_suspended |
| execute_tools (booking) | Appointment     | Find overlapping       |
| execute_tools (booking) | TimeOff         | Find in range          |
| execute_tools (booking) | StaffSchedule   | Find by weekday        |
| execute_tools (booking) | ServiceCategory | FindById               |
| execute_tools (booking) | ServiceItem     | FindById               |
| persist_and_send        | Message         | Insert (bot message)   |

---

## API Integration Points

### Backend ← Meta-Bot

```
POST /api/v1/socket/emit-message-internal
  Headers: x-api-key: INTERNAL_API_KEY
  Body: { companyId, conversationId, message }
  Purpose: Real-time socket notification

GET /api/v1/appointments/{customerId}
  Purpose: Get customer appointments (in tool handler)

POST /api/v1/appointments
  Purpose: Create appointment (in tool handler)
```

### Facebook ← Meta-Bot

```
POST /graph.instagram.com/v18.0/{psid}/messages
  Headers: Authorization: Bearer {access_token}
  Body: { recipient: {...}, message: {...} }

POST /graph.facebook.com/v18.0/{psid}/messages
  Purpose: Send message to customer
```

---

## Latency Breakdown (Current)

| Stage                 | Latency       | Notes                   |
| --------------------- | ------------- | ----------------------- |
| Webhook parsing       | 5ms           | FB message parsing      |
| Bot status check      | 20ms          | MongoDB query           |
| LLM initial call      | 300ms         | OpenAI API (main wait)  |
| Tool execution        | 0-100ms       | Depends on tools called |
| LLM follow-up         | 0-200ms       | Only if tools called    |
| DB save + socket emit | 60ms          | Message persistence     |
| **Total**             | **385-685ms** | Most time = LLM waiting |

---

## Testing Strategy

### Unit Tests (Per Node)

```javascript
describe("receive_message_node", () => {
  test("parses incoming message correctly");
  test("checks for duplicate message IDs");
  test("fetches message history");
});

describe("execute_tools_node", () => {
  test("calls book_appointment tool");
  test("handles tool errors gracefully");
  test("accumulates results");
});
```

### Integration Tests (Full Graph)

```javascript
describe("FacebookConversationGraph", () => {
  test("handles simple text response");
  test("handles tool calling + follow-up");
  test("handles bot suspension");
  test("handles API errors gracefully");
});
```

### Load Tests

```javascript
// Test concurrent webhook processing
// Test memory usage (state objects)
// Test LLM timeout handling
```

---

## Environment Variables Needed

```bash
# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_CHAT_MODEL=gpt-4-turbo

# MongoDB
MONGODB_URI=mongodb://...

# Facebook/Instagram
FB_PAGE_ACCESS_TOKEN=...
INSTAGRAM_CHAT_ID=...
META_APP_ID=...
META_APP_SECRET=...
VERIFY_TOKEN=...

# Internal Service
INTERNAL_API_KEY=...
BACKEND_API_URL=http://localhost:3001
META_BOT_BASE_URL=http://localhost:3002
```

---

## Monitoring & Observability

### Key Metrics to Track

- **Latency per node** (especially LLM call)
- **Tool success rate** (which tools fail most?)
- **Error rate by type** (network, validation, DB)
- **Concurrent message processing** (per customer)
- **State size** (memory impact)

### Logging Pattern

```javascript
// In each node:
logger.info(`[Node: receive_message] Starting`, {
  customer_id: state.customer_id,
  platform: state.platform,
});

// After node completes:
logger.info(`[Node: receive_message] Complete`, {
  duration_ms: Date.now() - start,
  messages_count: state.messages.length,
});
```

### Error Tracking

```javascript
// Track all state errors
logger.error(`[Graph Error]`, {
  node: "execute_tools",
  error: error.message,
  state_snapshot: { company_id, customer_id }, // Don't log sensitive data
});
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] All unit tests passing
- [ ] Integration tests with mock LLM
- [ ] Load test with 10 concurrent users
- [ ] Error handling for network failures
- [ ] Logging at all critical points
- [ ] State size monitoring

### Deployment Steps

1. Deploy new graph code alongside old
2. Route 10% traffic to new graph
3. Monitor error rates and latency
4. Gradually increase traffic (25%, 50%, 100%)
5. Keep old code available for rollback
6. Monitor for 24 hours

### Post-Deployment

- [ ] Monitor error rates
- [ ] Check latency impact (should be neutral)
- [ ] Verify customer satisfaction (no response change)
- [ ] Analyze logging for insights
- [ ] Set up alerts for new issues

---

## Common Pitfalls to Avoid

### 1. Mutable State

**WRONG:**

```javascript
state.messages.push(newMessage); // Mutates!
return state;
```

**RIGHT:**

```javascript
return {
  ...state,
  messages: [...state.messages, newMessage],
};
```

### 2. Long-Running Operations in Nodes

**WRONG:**

```javascript
async function node(state) {
  // Polling API for 30 seconds
  while (!done) {
    await sleep(1000);
  }
}
```

**RIGHT:**

```javascript
async function node(state) {
  // Quick timeout with error
  const result = await fetchWithTimeout(api, 5000);
}
```

### 3. Not Handling Missing State

**WRONG:**

```javascript
const { customer_id } = state;
const customer = await getCustomer(customer_id); // If customer_id null?
```

**RIGHT:**

```javascript
const { customer_id } = state;
if (!customer_id) {
  return { ...state, status: "error", error: "No customer_id" };
}
const customer = await getCustomer(customer_id);
```

### 4. Storing Sensitive Data

**WRONG:**

```javascript
return {
  ...state,
  facebook_access_token: token, // Never store in state!
};
```

**RIGHT:**

```javascript
// Keep tokens in secure storage (DB, env)
// Only reference by ID in state
return { ...state, token_id: "token_abc123" };
```

---

## Rollback Plan

If new graph causes issues:

1. **Immediate**: Route traffic back to old controller
2. **Investigation**: Check logs for which node failed
3. **Fix**: Patch node logic or revert changes
4. **Retest**: Run full test suite before retry
5. **Gradual Rollout**: Start at 10% again

**Rollback command** (example):

```javascript
// In router, add feature flag
if (config.use_langgraph) {
  result = await conversationGraph.invoke(state);
} else {
  result = await processCustomerMessage(legacy); // Old code
}
```

---

## Performance Optimization Tips

### For Latency

1. **Cache service list** - Don't query every message
2. **Batch LLM calls** - If processing multiple messages
3. **Timeout LLM** - Return fallback after 5s
4. **Use cheaper model** - For non-critical paths

### For Memory

1. **Limit message history** - Already at 50, maybe go lower
2. **Clean processed IDs** - Every 10 minutes (already doing)
3. **Stream large responses** - Don't buffer all in state
4. **Archive old conversations** - Move to archive collection

### For Reliability

1. **Retry on transient errors** - Network, rate limits
2. **Circuit breaker** - If LLM failing, fallback
3. **Graceful degradation** - Work without tools if needed
4. **Monitoring alerts** - Alert on error rate spike

---

## Decision Matrix: Graph vs No Graph

| Criterion       | Current Code      | With LangGraph        |
| --------------- | ----------------- | --------------------- |
| Code clarity    | Poor (900 lines)  | Excellent (6 nodes)   |
| Testability     | Hard (monolithic) | Easy (isolated nodes) |
| State tracking  | Implicit          | Explicit              |
| Tool management | Manual loop       | Built-in              |
| Error recovery  | Scattered         | Centralized           |
| Extensibility   | Hard              | Easy                  |
| Debugging       | Difficult         | Clear                 |
| Learning curve  | N/A               | 1-2 days              |
| Performance     | ~500ms            | ~500ms (same)         |
| Maintenance     | Hard              | Easy                  |

**Verdict**: LangGraph wins on almost all metrics except initial learning time.

---

## Quick Start Implementation

### Step 1: Install

```bash
npm install @langchain/langgraph @langchain/core
```

### Step 2: Create State Type

```javascript
const ConversationState = {
  company_id: string,
  customer_id: string,
  messages: array,
  status: string,
  // ... etc
};
```

### Step 3: Create Nodes

```javascript
const receiveMessageNode = async (state) => { ... };
const checkBotStatusNode = async (state) => { ... };
// ... etc
```

### Step 4: Build Graph

```javascript
const graph = new StateGraph(ConversationState)
  .addNode("receive_message", receiveMessageNode)
  .addNode("check_bot_status", checkBotStatusNode)
  // ... etc
  .addEdge("receive_message", "check_bot_status")
  .addConditionalEdges("call_llm", router)
  // ... etc
  .compile();
```

### Step 5: Use in Webhook

```javascript
router.post("/webhook", async (req, res) => {
  const initialState = {
    company_id: req.body.company_id,
    customer_id: req.body.customer_id,
    messages: [],
    status: "processing",
  };

  const result = await graph.invoke(initialState);
  res.json({ success: true, final_status: result.status });
});
```

---

## Additional Resources

- LangGraph Docs: https://python.langchain.com/docs/langgraph
- LangChain JS Docs: https://js.langchain.com/
- OpenAI Tools Docs: https://platform.openai.com/docs/guides/function-calling
- MongoDB Transactions: https://docs.mongodb.com/manual/core/transactions/
- Socket.io Docs: https://socket.io/docs/

---

## Next Steps

1. Review the two main analysis docs:

   - [integration-analysis.md](integration-analysis.md) (comprehensive)
   - [diagrams.md](diagrams.md) (visual)

2. Discuss with team:

   - Do we want to proceed with LangGraph?
   - What's timeline for implementation?
   - Any concerns about dependencies?

3. If approved:

   - Set up test environment
   - Create POC (proof of concept) with single node
   - Expand to full conversation graph
   - Test with real Facebook webhooks

4. Iterate and optimize based on real-world usage
