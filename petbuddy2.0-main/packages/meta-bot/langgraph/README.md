# LangGraph Integration for PetBuddy Meta-Bot

This directory contains the LangGraph implementation for the PetBuddy conversation AI. LangGraph provides a more structured and maintainable way to handle complex conversation flows compared to the previous simple prompt/response pattern.

## 📁 Directory Structure

```
langgraph/
├── graph.js              # Main graph definition and orchestration
├── controller.js         # High-level controller for using the graph
├── test.js              # Standalone test script
├── state/
│   └── schema.js        # State schema definition (what flows through the graph)
├── nodes/
│   ├── agent.js         # Main AI agent node (OpenAI with tools)
│   └── toolExecutor.js  # Tool execution node
└── tools/
    └── index.js         # LangChain tool wrappers for existing tools
```

## 🔄 How It Works

### Graph Flow

```
START
  ↓
┌─────────────┐
│   Agent     │ ← Analyzes message, decides action
│  (OpenAI)   │
└─────┬───────┘
      │
      ├─→ Tool calls? → ┌──────────────┐
      │                 │ Tool Executor│
      │                 └──────┬───────┘
      │                        │
      │                        ↓
      │                   Back to Agent
      │
      └─→ Response ready → END
```

### State Management

The conversation state includes:
- **User Identity**: chatId, platform, companyId
- **Contact Info**: fullName, phoneNumber, contactId
- **Conversation**: messages (history), systemInstructions, timezone
- **Booking Context**: Current booking details being assembled
- **AI Response**: assistantMessage, toolCalls
- **Flow Control**: currentStep, error, needsHumanHandoff

## 🚀 Usage

### Basic Usage

```javascript
import { processMessageWithLangGraph } from "./langgraph/controller.js";

const result = await processMessageWithLangGraph({
  chatId: "user-123",
  platform: "facebook",
  message: "I want to book a grooming appointment",
  companyId: "company-abc",
  systemInstructions: "You are a helpful pet care assistant...",
  timezone: "America/New_York",
  conversationHistory: [], // Previous messages
});

console.log(result.assistantMessage); // Send this to user
```

### Testing

Run the test script to verify LangGraph is working:

```bash
# Test with default message
node langgraph/test.js

# Test with custom message
node langgraph/test.js "What services do you offer?"
```

## 🔧 Tools Available

The graph has access to these tools (same as legacy implementation):

1. **get_current_datetime** - Get current date/time in company timezone
2. **get_customer_full_name** - Ask for and save customer name
3. **get_customer_info** - Get customer name and phone
4. **get_customer_phone_number** - Ask for phone number
5. **book_appointment** - Book an appointment
6. **get_available_times** - Check availability for a service

## 🔄 Migration Strategy

### Current Status

✅ LangGraph structure created
✅ State schema defined
✅ Tools wrapped for LangChain
✅ Basic agent + tool executor nodes
✅ Test script working

### Next Steps

1. **Side-by-Side Testing**
   - Run LangGraph alongside legacy code
   - Compare responses
   - Gradually increase LangGraph usage

2. **Update Controllers**
   - Modify controllers to use `processMessageWithLangGraph`
   - Keep legacy code as fallback
   - Add feature flag for A/B testing

3. **Full Migration**
   - Once confident, remove legacy LLM code
   - Deprecate old functions
   - Clean up dependencies

## 🎯 Benefits of LangGraph

### Compared to Legacy Code

**Legacy (lib/LLM.js)**:
```javascript
// Simple request/response
const result = await createChatWithTools(messages, instructions, apiKey);
if (result.tool_calls) {
  // Handle tools manually
  // Call continueChatWithToolResults
}
```

**LangGraph**:
```javascript
// Automatic tool execution and looping
const result = await invokeConversation(input);
// Tools are executed automatically
// Agent continues until response is ready
```

### Key Advantages

1. **Automatic Tool Orchestration** - No manual tool call handling
2. **Multi-Step Reasoning** - Agent can call multiple tools sequentially
3. **State Management** - Conversation state flows naturally through graph
4. **Conditional Routing** - Easy to add branches (e.g., human handoff)
5. **Observability** - Clear logging at each node
6. **Extensibility** - Easy to add new nodes (e.g., memory, RAG)

## 🧩 Extending the Graph

### Adding a New Node

```javascript
// 1. Create node function
export async function myNewNode(state) {
  // Process state
  return {
    // Return state updates
  };
}

// 2. Add to graph
workflow
  .addNode("my_new_node", myNewNode)
  .addEdge("agent", "my_new_node")
  .addEdge("my_new_node", END);
```

### Adding a New Tool

```javascript
// In tools/index.js
const myNewTool = new DynamicStructuredTool({
  name: "my_new_tool",
  description: "What this tool does",
  schema: z.object({
    param1: z.string().describe("Description"),
  }),
  func: async ({ param1 }) => {
    // Tool implementation
    return JSON.stringify(result);
  },
});

// Add to tools array
return [...existingTools, myNewTool];
```

## 🐛 Debugging

### Enable Verbose Logging

LangGraph includes built-in tracing. To see detailed execution:

```javascript
const result = await graph.invoke(input, {
  recursionLimit: 25,
  // Add streaming callback for live updates
  callbacks: [{
    handleLLMStart: (llm, prompts) => console.log("LLM Start:", prompts),
    handleLLMEnd: (output) => console.log("LLM End:", output),
  }]
});
```

### Common Issues

1. **Tool not found** - Check tool name matches exactly
2. **Infinite loop** - Increase recursionLimit or check routing logic
3. **OpenAI timeout** - Increase timeout in agent.js
4. **State not updating** - Check reducer functions in schema.js

## 📚 Resources

- [LangGraph Docs](https://langchain-ai.github.io/langgraph/)
- [LangChain Tools](https://js.langchain.com/docs/modules/tools/)
- [State Management](https://langchain-ai.github.io/langgraph/concepts/low_level/#state)
