# PetBuddy Meta-Bot: AI & Tools Quick Reference

## System Overview

```
User Message → Webhook → Controller → LangGraph → Agent Node
                                          ↓
                                    (Tool needed?)
                                     ↙         ↘
                              YES            NO
                              ↓               ↓
                        Tool Executor    Response Ready
                              ↓
                        Back to Agent (loop)
```

## Key Files and Their Purpose

| File | Purpose | Key Classes/Functions |
|------|---------|----------------------|
| `langgraph/graph.js` | Graph definition | `createConversationGraph()`, `invokeConversation()` |
| `langgraph/controller.js` | Entry point | `processMessageWithLangGraph()` |
| `langgraph/state/schema.js` | State definition | `ConversationState` (Annotation API) |
| `langgraph/nodes/agent.js` | AI reasoning | `agentNode()` (OpenAI ChatGPT-4o) |
| `langgraph/nodes/toolExecutor.js` | Tool execution | `toolExecutorNode()` |
| `langgraph/tools/index.js` | Tool wrappers | `createLangChainTools()` |
| `lib/toolHandlers.js` | Tool implementation | `createToolHandlers()` |
| `controllers/facebook.controller.js` | Facebook webhook | Uses LangGraph if enabled |
| `controllers/instagram.controller.js` | Instagram webhook | Uses LangGraph if enabled |
| `config/env.js` | Configuration | Feature flags, API keys |
| `utils/logger.js` | Logging | Winston structured logging |

## Available Tools (6 Core)

| Tool | Purpose | Triggers |
|------|---------|----------|
| `get_current_datetime` | Get time in company timezone | When AI needs "now", "today" |
| `get_customer_full_name` | Ask for/save customer name | When customer name unknown |
| `get_customer_info` | Ask for name + phone | When both needed |
| `get_customer_phone_number` | Ask for phone | When phone unknown |
| `book_appointment` | Create appointment | When customer confirms booking |
| `get_available_times` | Check service availability | When customer asks "when available" |

## State Schema Quick Map

```javascript
{
  // User IDs
  chatId: string,              // Platform user ID
  platform: 'facebook'|'instagram',
  companyId: string,           // For multi-tenant

  // Contact (loaded from DB)
  fullName: string | null,
  phoneNumber: string | null,

  // Conversation
  messages: Array,             // OpenAI format
  systemInstructions: string,  // AI system prompt
  timezone: string,            // e.g., 'America/New_York'

  // Flow Control
  currentStep: 'agent'|'execute_tools'|'end',
  
  // Results
  assistantMessage: string | null,  // Response to user
  toolCalls: Array,            // Tools called
  error: Object | null,        // Error info
  
  // Optional
  bookingContext: Object,      // Booking state
  needsHumanHandoff: boolean,  // Escalation flag
}
```

## Message Flow Walkthrough

```javascript
// 1. Facebook webhook sends message
POST /chat/facebook
{
  entry: [{
    messaging: [{
      sender: { id: 'user123' },
      message: { text: 'Book grooming tomorrow' }
    }]
  }]
}

// 2. Controller extracts message
const senderId = 'user123';
const message = 'Book grooming tomorrow';

// 3. Load company + instructions from DB
const company = await getCompanyByFb(companyId);

// 4. Build LangGraph input
const input = {
  chatId: senderId,
  platform: 'facebook',
  companyId: company._id,
  systemInstructions: company.systemInstructions,
  timezone: company.timezone,
  fullName: existingContact?.fullName,  // From DB
  phoneNumber: existingContact?.phoneNumber,
  messages: [
    ...previousMessages,  // From DB
    { role: 'user', content: message }
  ],
  currentStep: 'agent'
};

// 5. Invoke graph
const result = await invokeConversation(input);

// Graph execution:
// Agent receives input →
//   Creates ChatOpenAI with tools →
//   Sends to OpenAI API →
//   Receives: needs get_available_times tool →
//   Returns { currentStep: 'execute_tools', toolCalls: [...] }
//
// Tool Executor receives →
//   Calls get_available_times handler →
//   Returns results as tool messages →
//   Returns { currentStep: 'agent', messages: [...tool results] }
//
// Agent loop-back →
//   Receives tool results →
//   Sends to OpenAI with context →
//   Receives: ready to respond →
//   Returns { assistantMessage: '...', currentStep: 'end' }

// 6. Extract response
const assistantMessage = result.assistantMessage;
// "Great! For grooming tomorrow, we have availability at 10am or 2pm. 
//  Which time works for you?"

// 7. Send to user
await facebookMsgSender(senderId, assistantMessage);

// 8. Save to DB
await createMessage({
  chatId: senderId,
  content: assistantMessage,
  role: 'assistant'
});
```

## Configuration Checklist

```bash
# .env file must have:
OPENAI_API_KEY=sk-...
CHAT_MODEL=gpt-4o
FB_PAGE_ACCESS_TOKEN=...
INSTA_PAGE_ACCESS_TOKEN=...
MONGODB_URI=mongodb://...
BACKEND_API_URL=http://localhost:3000
VERIFY_TOKEN=... (for webhook validation)
INTERNAL_SERVICE_API_KEY=...

# Feature flag
USE_LANGGRAPH=true  # Must be string "true"
```

## Common Debugging

### "Tool not found" Error
1. Check tool name in error matches exactly
2. Verify tool is in `createLangChainTools()` return array
3. Verify handler exists in `createToolHandlers()`

### "Message formatting issue"
1. Check `tool_call_id` matches between tool call and tool result
2. Verify message role is 'tool' (not 'assistant')
3. Ensure tool result is JSON stringified

### Infinite loop (recursionLimit reached)
1. Check conditional edges routing logic
2. Verify `currentStep` is being set correctly
3. Agent should set `currentStep = 'end'` for final response

### OpenAI API errors
1. Check `OPENAI_API_KEY` is valid
2. Verify `CHAT_MODEL` is gpt-4o (or valid model name)
3. Check timeout: 30s per request
4. Retry logic handles 429 (rate limit), 500, 503

## Performance Tips

1. **Message history limit**: Keep < 50 messages (token budget)
2. **Tool execution**: Currently sequential (improvement: parallel)
3. **Caching**: No caching yet (improvement: Redis for availability)
4. **Response delay**: 4 seconds configured (configurable via RESPONSE_DELAY_MS)

## Testing

### Unit test a tool:
```javascript
import { createToolHandlers } from './lib/toolHandlers.js';

const handlers = createToolHandlers('facebook');
const result = await handlers.get_current_datetime({}, {
  timezone: 'America/New_York',
  company_id: 'test-company'
});
console.log(result); // { timezone, local_text, ... }
```

### Test entire LangGraph:
```bash
node langgraph/test-simple.js "What services do you offer?"
```

### Enable verbose logging:
```javascript
// In langgraph/graph.js, add callbacks:
const result = await graph.invoke(input, {
  recursionLimit: 25,
  callbacks: [{
    handleLLMStart: (llm, prompts) => console.log('LLM:', prompts[0]),
    handleLLMEnd: (output) => console.log('Response:', output),
  }]
});
```

## Feature Flag Usage

```javascript
// In controller:
if (config.features.useLangGraph) {
  // Use new system
  const result = await processMessageWithLangGraph({...});
} else {
  // Use legacy system
  const result = await createChatWithTools({...});
}
```

## When to Use Tools (AI Decision)

AI automatically decides based on user message:

- **get_current_datetime**: "What time are you open?", "Today"
- **get_customer_info**: "I need to book", "My name is...", first time
- **get_available_times**: "When available?", "Book tomorrow"
- **book_appointment**: "Book it", "Tomorrow at 2pm works"

AI does NOT use tools for:
- General questions about services
- Chitchat
- Goodbye messages

## Improvements Roadmap

**Priority 1** (Next 1-2 weeks):
- [ ] Parallel tool execution (40% faster multi-tool)
- [ ] Tool analytics dashboard

**Priority 2** (Next 1 month):
- [ ] Memory/RAG for company knowledge
- [ ] Human handoff detection
- [ ] Multi-language support

**Priority 3** (Future):
- [ ] Streaming responses
- [ ] Redis caching layer
- [ ] Conversation summarization

## Links and References

- LangGraph Docs: https://langchain-ai.github.io/langgraph/
- OpenAI API: https://platform.openai.com/docs/api-reference
- LangChain JS: https://js.langchain.com/docs/
- Project README: /packages/meta-bot/README.md
- Full Architecture: /docs/architecture/AI_TOOLS_ARCHITECTURE_ANALYSIS.md
