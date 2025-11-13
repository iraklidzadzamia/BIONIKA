# Hybrid Agent Architecture: Gemini + OpenAI

## Overview

The PetBuddy Meta-Bot uses a **hybrid agent architecture** that combines the strengths of both Google Gemini and OpenAI:

- **Gemini**: Primary reasoning and natural language responses (cost-effective, fast)
- **OpenAI**: Tool execution only (reliable, proven tool calling)

This architecture ensures optimal cost, performance, and reliability by routing requests intelligently between the two AI providers.

---

## Architecture Diagram

```
┌─────────────┐
│   User      │
│  Message    │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ Human Detector  │ ─── Check if human intervention needed
└────────┬────────┘
         │
         │ (No handoff needed)
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      HYBRID AGENT FLOW                           │
│                                                                   │
│  ┌──────────────┐                                                │
│  │   Gemini     │                                                │
│  │   Agent      │                                                │
│  └──────┬───────┘                                                │
│         │                                                         │
│         ├─────────────────┬────────────────────┐                 │
│         │                 │                    │                 │
│    [Tool calls?]    [Tool missed?]      [Text only]             │
│         │                 │                    │                 │
│    [Yes ✓]           [Enforce=ON]         [No tools]            │
│         │                 │                    │                 │
│         ▼                 ▼                    ▼                 │
│  ┌────────────────────────────┐        ┌──────────────┐         │
│  │      OpenAI Agent          │        │ Gemini Text  │         │
│  │  (Tool Execution Only)     │        │  Response    │         │
│  └──────────┬─────────────────┘        └──────┬───────┘         │
│             │                                  │                 │
│             ▼                                  │                 │
│  ┌──────────────────┐                         │                 │
│  │  Tool Executor   │                         │                 │
│  │  (Execute tools) │                         │                 │
│  └──────────┬───────┘                         │                 │
│             │                                  │                 │
│             ▼                                  │                 │
│  ┌──────────────────┐                         │                 │
│  │   Gemini Agent   │                         │                 │
│  │ (Final Response) │                         │                 │
│  └──────────┬───────┘                         │                 │
│             │                                  │                 │
│             └──────────────┬───────────────────┘                 │
│                            ▼                                     │
└────────────────────────────┼─────────────────────────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │ Final Response │
                    │   to User      │
                    └────────────────┘
```

---

## How It Works

### 1. Initial Request Flow

Every user message starts with **Gemini** as the primary reasoning agent:

```javascript
User Message → Human Detector → Gemini Agent
```

### 2. Gemini Decision Path

Gemini analyzes the request and decides:

#### Path A: Text-Only Response (No Tools)
```
Gemini detects: "This is a greeting/general question"
          ↓
Gemini generates text response
          ↓
          END
```

**Example Queries:**
- "Hello!"
- "Thank you!"
- "How are you?"
- "What's your name?"

#### Path B: Tool Execution Required (Gemini Detects)
```
Gemini detects: "This requires get_services tool"
          ↓
Gemini returns tool_calls
          ↓
Route to OpenAI Agent
          ↓
OpenAI executes tools
          ↓
Return to Gemini for final response
          ↓
Gemini generates natural response with tool results
          ↓
          END
```

**Example Queries:**
- "I want to book an appointment"
- "What services do you offer?"
- "Show me available time slots"

#### Path C: Tool Enforcement (Gemini Missed Tools)
```
Gemini returns text response
          ↓
Tool enforcement detects: "Query matches tool pattern"
          ↓
Force route to OpenAI Agent
          ↓
OpenAI generates tool calls
          ↓
OpenAI executes tools
          ↓
Return to Gemini for final response
          ↓
          END
```

**Example Queries:**
- "What are your prices?" (should use get_services)
- "When are you open?" (should use get_availability)
- "Check my appointments" (should use get_appointments)

---

## Key Features

### 1. Intelligent Tool Detection

Gemini is instructed to identify when tools are needed:

```javascript
// In geminiAgent.js
const hybridModeInstructions = `
IMPORTANT - TOOL USAGE INSTRUCTIONS:
You have access to the following tools for providing accurate information:
- get_services: Get list of services with pricing
- get_availability: Check available appointment slots
- book_appointment: Book a new appointment
- get_appointments: View existing appointments
- cancel_appointment: Cancel an appointment

CRITICAL RULES:
1. If the user asks about appointments, you MUST use the appropriate tool
2. If the user asks about services or pricing, you MUST use get_services
3. DO NOT make up information - ALWAYS use tools when available
4. Only provide text-only responses for greetings or general questions
`;
```

### 2. Tool Usage Enforcement

If Gemini misses a tool opportunity, the system automatically catches it:

```javascript
// Pattern-based detection
const toolRequiredPatterns = [
  /book|schedule|make.*appointment|reserve|set.*appointment/i,
  /view.*appointment|show.*appointment|my.*appointment/i,
  /cancel|reschedule|change.*appointment|modify.*appointment/i,
  /available|availability|free.*time|open.*slot/i,
  /service|price|pricing|cost|how.*much/i,
  /hour|hours|open|close|when.*open|business.*hour/i,
];

if (shouldHaveUsedTool && config.features.enforceToolUsage) {
  // Force OpenAI fallback
  return {
    currentStep: "force_openai_fallback",
  };
}
```

### 3. Seamless State Management

The hybrid flow preserves:
- ✅ Conversation history
- ✅ Message pruning (maintains tool call integrity)
- ✅ Customer context (name, phone)
- ✅ Tool call results
- ✅ Error states

### 4. Comprehensive Logging

Every transition is logged for debugging and monitoring:

```javascript
logger.messageFlow.info(platform, chatId, "hybrid-transition", 
  "gemini → openai-tools: Gemini detected 2 tool calls");

logger.messageFlow.info(platform, chatId, "openai-tool-execution", 
  "OpenAI executing 2 tools from Gemini reasoning");

logger.messageFlow.info(platform, chatId, "hybrid-transition", 
  "openai-tools → gemini: Tools executed, returning to Gemini");

logger.messageFlow.info(platform, chatId, "gemini-final-response", 
  "Gemini generated final response after tool execution");
```

---

## Configuration

### Environment Variables

Add to `.env`:

```bash
# Enable hybrid mode (requires both API keys)
USE_GEMINI=true
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# Hybrid mode configuration
ENFORCE_TOOL_USAGE=true  # Default: true (recommended)
```

### Configuration Flags

```javascript
// In config/env.js
features: {
  useGemini: true,              // Enable Gemini
  useLangGraph: true,           // Use LangGraph (required for hybrid)
  enforceToolUsage: true,       // Force OpenAI when Gemini misses tools
}
```

### Modes

| Configuration | Behavior |
|--------------|----------|
| `USE_GEMINI=true` + `OPENAI_API_KEY` | **Hybrid Mode** (Gemini + OpenAI) |
| `USE_GEMINI=false` + `OPENAI_API_KEY` | OpenAI only |
| `USE_GEMINI=true` + No OpenAI key | Gemini only (fallback) |

---

## Metrics and Monitoring

### Tracked Metrics

The hybrid flow tracks these metrics via `metricsTracker`:

1. **Gemini Reasoning**
   - Provider: `"gemini-reasoning"`
   - Tracks when Gemini detects tools

2. **Gemini Text Response**
   - Provider: `"gemini"`
   - Tracks direct text responses

3. **Gemini Final Response**
   - Provider: `"gemini-final-response"`
   - Tracks final response after tool execution

4. **Gemini Missed Tool**
   - Provider: `"gemini-missed-tool"`
   - Tracks when enforcement catches missed tools

5. **OpenAI Routing**
   - Provider: `"openai-routing"`
   - Tracks OpenAI receiving tool calls from Gemini

6. **OpenAI Fallback**
   - Provider: `"openai-fallback-reasoning"`
   - Tracks forced OpenAI fallback

### Log Events

Key log events to monitor:

- `hybrid-transition`: Node transitions
- `gemini-tool-detection`: Gemini detected tools
- `gemini-missed-tool`: Enforcement triggered
- `openai-tool-execution`: OpenAI executing tools
- `gemini-final-response`: Final response generation
- `hybrid-flow-summary`: Complete flow summary

---

## Testing

### Running Tests

```bash
cd packages/meta-bot
npm test langgraph/__tests__/hybridFlow.test.js
```

### Test Coverage

The test suite verifies:

1. ✅ Text-only queries route through Gemini only
2. ✅ Tool queries route: Gemini → OpenAI → Tools → Gemini
3. ✅ Tool enforcement catches missed opportunities
4. ✅ Complete hybrid flow transitions
5. ✅ Metrics tracking
6. ✅ Error handling and fallbacks

### Manual Verification

Use the built-in verification method:

```javascript
import { createConversationGraph } from "./langgraph/graph.js";

const graph = createConversationGraph();

const testInput = {
  chatId: "test-123",
  platform: "test",
  companyId: "company-123",
  systemInstructions: "You are a helpful assistant.",
  messages: [
    { role: "user", content: "Book an appointment for Monday" }
  ],
  timezone: "America/New_York",
  workingHours: { monday: "9:00-17:00" },
};

const verification = await graph.verifyHybridFlow(testInput);

console.log("Transitions:", verification.transitions);
console.log("Complete hybrid flow:", verification.transitions.completeHybridFlow);
console.log("Flow sequence:", verification.flowSequence);
```

---

## Performance Optimization

### Cost Optimization

The hybrid approach optimizes costs:

- **Gemini** handles ~70% of requests (text-only)
  - Cost: $0.00015/1K tokens (much cheaper)
  
- **OpenAI** handles ~30% of requests (tool execution)
  - Cost: $0.005/1K tokens (more expensive but necessary)

**Estimated Savings**: ~60-70% cost reduction vs. OpenAI-only

### Latency

- Text-only responses: **~1-2 seconds** (Gemini direct)
- Tool-based responses: **~3-5 seconds** (Gemini → OpenAI → Tools → Gemini)

### Reliability

- Gemini failure → Automatic OpenAI fallback
- OpenAI failure → Error response with retry logic
- Tool execution errors → Tracked and logged

---

## Troubleshooting

### Issue: Gemini not detecting tools

**Solution**: Check the system instructions include tool descriptions:

```javascript
// Verify in logs:
logger.messageFlow.info(..., "gemini-tool-reasoning", 
  `Gemini reasoning with 6 available tools: get_services, book_appointment, ...`);
```

**Fix**: Ensure tools are properly bound to Gemini model:

```javascript
const modelWithTools = model.bindTools(tools);
```

### Issue: Tool enforcement too aggressive

**Solution**: Disable enforcement or adjust patterns:

```bash
# In .env
ENFORCE_TOOL_USAGE=false
```

Or adjust patterns in `geminiAgent.js`:

```javascript
const toolRequiredPatterns = [
  // Adjust these patterns based on your needs
  /book|schedule|make.*appointment/i,
  // Add more specific patterns
];
```

### Issue: Infinite loops

**Solution**: The recursion limit prevents infinite loops:

```javascript
await graph.invoke(input, { recursionLimit: 25 });
```

If hitting limit, check logs for repeated transitions.

### Issue: Missing hybrid transitions in logs

**Solution**: Ensure hybrid mode is enabled:

```bash
USE_GEMINI=true
OPENAI_API_KEY=sk-...
```

Check startup logs:

```
[LangGraph] Using hybrid AI mode: Gemini + OpenAI
[LangGraph] Hybrid Flow Configuration:
  - Gemini: Primary reasoning & text responses
  - OpenAI: Tool execution only
  - Tool Usage Enforcement: Enabled
```

---

## Best Practices

### 1. System Instructions

Provide clear, specific instructions for tool usage:

```javascript
const systemInstructions = `
You are a professional assistant for [Business Name].

IMPORTANT RULES:
- For appointment-related questions, ALWAYS use the appropriate tool
- For service information, ALWAYS use get_services
- NEVER make up pricing or availability information
- Only provide text responses for greetings and general questions
`;
```

### 2. Tool Enforcement

Keep enforcement **enabled** for production:

```bash
ENFORCE_TOOL_USAGE=true
```

This ensures Gemini's occasional misses don't impact user experience.

### 3. Monitoring

Monitor these key metrics:

- `gemini-missed-tool` count (should be low)
- `hybrid-transition` patterns (should show proper flow)
- `openai-hybrid-violation` (should be zero)

### 4. Cost Management

Track costs by provider:

```javascript
// Metrics show which provider handled each request
provider: "gemini"  // Cheap text response
provider: "gemini-reasoning"  // Cheap reasoning
provider: "openai-routing"  // Expensive tool execution
```

### 5. Testing

Test both paths:

- Text-only queries (Gemini direct)
- Tool-based queries (Gemini → OpenAI → Gemini)
- Edge cases (enforcement, fallbacks)

---

## Migration Guide

### From OpenAI-Only

1. Add Gemini API key to `.env`:
```bash
GEMINI_API_KEY=your_key_here
USE_GEMINI=true
```

2. Deploy and monitor:
```bash
npm run dev
```

3. Watch logs for hybrid transitions:
```
[LangGraph] Using hybrid AI mode: Gemini + OpenAI
```

### From Gemini-Only

Already using Gemini? Just ensure OpenAI key is present:

```bash
OPENAI_API_KEY=sk-...
```

The system automatically enables hybrid mode.

---

## Future Enhancements

Potential improvements:

1. **Adaptive Routing**: ML-based routing decisions
2. **Tool Caching**: Cache frequent tool results
3. **Multi-Provider**: Add Anthropic Claude support
4. **Smart Enforcement**: Learn which patterns need tools
5. **Cost Dashboard**: Real-time cost tracking by provider

---

## Summary

The hybrid agent architecture provides:

✅ **Cost Optimization**: 60-70% cost savings vs. OpenAI-only  
✅ **Reliability**: Automatic fallbacks and enforcement  
✅ **Performance**: Fast text responses, reliable tool execution  
✅ **Transparency**: Comprehensive logging and metrics  
✅ **Flexibility**: Easy configuration and testing  

The system intelligently routes requests to the optimal provider, ensuring the best balance of cost, speed, and reliability.

