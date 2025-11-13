# PetBuddy Meta-Bot Architecture Documentation

This directory contains comprehensive documentation of the PetBuddy Meta-Bot AI and tools system.

## Documents

### 1. AI_TOOLS_ARCHITECTURE_ANALYSIS.md (START HERE)
**Comprehensive 16-section analysis** covering:
- AI Integration with OpenAI GPT-4o
- Complete LangGraph architecture (graph structure, state management, nodes)
- Tool system design (6 core + 8 extended tools)
- Message flow walkthrough (user input to response delivery)
- Conversation management and state persistence
- Configuration and feature flags
- Logging and observability
- Error handling strategies
- 10 detailed improvement recommendations
- Technology stack and deployment
- Security considerations

**Use this when**: You need deep understanding of how everything works together

**Read time**: 45-60 minutes

### 2. QUICK_REFERENCE.md (USE DURING DEVELOPMENT)
**Quick lookup guide** with:
- System overview diagram
- File-to-purpose mapping table
- Tool inventory (all 14 tools)
- State schema quick map
- Message flow walkthrough (code examples)
- Configuration checklist
- Common debugging solutions
- Testing commands
- Performance tips
- Feature flag usage

**Use this when**: You're developing features, debugging issues, or need quick facts

**Read time**: 10-15 minutes

### 3. SYSTEM_DIAGRAMS.md (VISUAL LEARNERS)
**10 detailed architecture diagrams** showing:
1. High-level system architecture
2. LangGraph execution flow
3. Tool execution detail
4. Message state throughout execution
5. Controller decision tree
6. State reducer behavior
7. Tool parameter flow
8. Error handling flow
9. Conversation state lifecycle
10. Feature flag toggle impact

**Use this when**: You want visual representation of system flow

**Read time**: 5-10 minutes per diagram

## Quick Navigation

### I want to understand...

**How messages flow through the system?**
- Start: SYSTEM_DIAGRAMS.md (Diagram 1 & 2)
- Then: AI_TOOLS_ARCHITECTURE_ANALYSIS.md (Section 4)
- Finally: QUICK_REFERENCE.md (Message Flow Walkthrough)

**How tools work?**
- Start: QUICK_REFERENCE.md (Tools section)
- Then: AI_TOOLS_ARCHITECTURE_ANALYSIS.md (Section 3)
- Details: See individual tool handlers in lib/toolHandlers.js

**How the LangGraph system works?**
- Start: SYSTEM_DIAGRAMS.md (Diagrams 2, 4, 5)
- Then: AI_TOOLS_ARCHITECTURE_ANALYSIS.md (Sections 2, 5)
- Code: langgraph/graph.js, state/schema.js, nodes/

**How to implement a new feature?**
- Reference: AI_TOOLS_ARCHITECTURE_ANALYSIS.md (Section 10)
- Quick help: QUICK_REFERENCE.md (Improvements Roadmap)
- Code example: langgraph/langgraph/tools/index.js

**How to debug an issue?**
- Quick help: QUICK_REFERENCE.md (Common Debugging)
- Detailed: AI_TOOLS_ARCHITECTURE_ANALYSIS.md (Section 9)
- Logs: Watch logs/message-flow.log

**What to deploy?**
- Checklist: AI_TOOLS_ARCHITECTURE_ANALYSIS.md (Section 14)
- Quick ref: QUICK_REFERENCE.md (Configuration Checklist)

## Key Concepts

### LangGraph
State machine orchestration framework that automatically manages:
- Agent node (AI reasoning with OpenAI)
- Tool executor node (executing tools)
- State management (conversation history, contact info)
- Routing logic (conditional edges between nodes)

**File**: `packages/meta-bot/langgraph/`

### Tools
Function calls that the AI can decide to use:
- 6 core tools (datetime, customer info, booking, availability)
- 8 extended tools (appointments, pets, locations, staff)
- Implementation bridges legacy handlers to LangChain

**File**: `packages/meta-bot/lib/toolHandlers.js`

### Controllers
Entry points from webhooks:
- Facebook webhook handler
- Instagram webhook handler
- Both use LangGraph if feature flag enabled

**Files**: `packages/meta-bot/controllers/`

### State Schema
Everything flowing through the system:
- User identity (chatId, platform, company)
- Contact info (loaded from DB)
- Messages (conversation history)
- System instructions (AI prompt)
- Current step (agent, tool execution, or done)

**File**: `packages/meta-bot/langgraph/state/schema.js`

## Configuration

### Feature Flag (Most Important)
```bash
USE_LANGGRAPH=true   # Use new system (ACTIVE)
USE_LANGGRAPH=false  # Use legacy system (FALLBACK)
```

### API Keys
- `OPENAI_API_KEY` - ChatGPT-4o
- `FB_PAGE_ACCESS_TOKEN` - Facebook
- `INSTA_PAGE_ACCESS_TOKEN` - Instagram
- `INTERNAL_SERVICE_API_KEY` - Backend communication

### Database
- `MONGODB_URI` - Local MongoDB
- `MONGODB_URI_DOCKER` - Docker MongoDB

See QUICK_REFERENCE.md for full checklist.

## Tools Available

### Core (6) - Always Available
1. `get_current_datetime` - Get time in company timezone
2. `get_customer_full_name` - Ask for/save name
3. `get_customer_info` - Get/save name + phone
4. `get_customer_phone_number` - Ask for phone
5. `book_appointment` - Create appointment
6. `get_available_times` - Check availability

### Extended (8) - Less Common
7. `get_customer_appointments` - View bookings
8. `cancel_appointment` - Cancel booking
9. `reschedule_appointment` - Reschedule
10. `get_customer_pets` - List pets
11. `add_pet` - Register pet
12. `get_service_list` - Services & pricing
13. `get_locations` - Locations
14. `get_staff_list` - Staff members

AI automatically decides which tools to use based on conversation context.

## Current Status

### Active
- LangGraph system (production-ready)
- 14 tools fully integrated
- Multi-turn conversations
- Customer context awareness
- Structured logging

### In Progress
- Parallel tool execution
- Tool analytics dashboard

### Planned
- Memory/RAG system
- Human handoff detection
- Streaming responses
- Multi-language support

## Testing

### Quick Test
```bash
node langgraph/test-simple.js "What services do you offer?"
```

### Full Docker Test
```bash
docker-compose up -d meta-bot
docker-compose logs -f meta-bot
```

### Health Check
```bash
curl http://localhost:5001/health
```

## Files Overview

```
packages/meta-bot/
├── langgraph/                  # Graph orchestration
│   ├── graph.js               # Graph definition
│   ├── controller.js          # Entry point
│   ├── state/schema.js        # State definition
│   └── nodes/
│       ├── agent.js           # AI node
│       └── toolExecutor.js    # Tool execution
├── lib/
│   ├── toolHandlers.js        # Tool implementation
│   └── LLM.js                 # Legacy LLM (fallback)
├── controllers/               # Webhook handlers
│   ├── facebook.controller.js
│   └── instagram.controller.js
├── config/
│   └── env.js                 # Configuration
└── utils/
    ├── logger.js              # Logging
    └── openaiTools.js         # Tool specs
```

## Common Tasks

### Add a New Tool
1. Implement handler in `lib/toolHandlers.js`
2. Create wrapper in `langgraph/tools/index.js`
3. Add to tool list return
4. Document in this file

See AI_TOOLS_ARCHITECTURE_ANALYSIS.md Section 10 for details.

### Debug a Message
1. Check logs/message-flow.log for the message ID
2. Trace through agent → tool executor steps
3. Look for error details in logs/error.log
4. Use QUICK_REFERENCE.md Common Debugging

### Deploy to Production
1. Follow checklist in QUICK_REFERENCE.md
2. Verify all env vars set
3. Test with real webhooks
4. Monitor response times
5. Check error rates

### Performance Optimization
1. Current bottleneck: Sequential tool execution
2. Solution: See Section 10.2 in AI_TOOLS_ARCHITECTURE_ANALYSIS.md
3. Expected improvement: 40% faster for multi-tool scenarios

## Improvement Roadmap

### Priority 1 (1-2 weeks)
- Parallel tool execution
- Tool analytics dashboard

### Priority 2 (1 month)
- Memory/RAG system
- Human handoff detection
- Multi-language support

### Priority 3 (2+ months)
- Streaming responses
- Conversation summarization
- Advanced validation

See AI_TOOLS_ARCHITECTURE_ANALYSIS.md Section 10 for full details.

## Support

### Need Help?
1. Check QUICK_REFERENCE.md first (fastest answers)
2. Read relevant section in AI_TOOLS_ARCHITECTURE_ANALYSIS.md
3. Look at SYSTEM_DIAGRAMS.md for visual explanation
4. Check logs/ directory for error details

### Found an Issue?
1. Document the issue clearly
2. Check logs/message-flow.log for trace
3. Review error handling in AI_TOOLS_ARCHITECTURE_ANALYSIS.md Section 9
4. Test with a minimal reproduction

### Have an Idea?
1. Check improvement roadmap (Section 10)
2. Propose with cost/benefit analysis
3. Consider parallel work vs sequential
4. Discuss priority with team

## Related Documentation

- **Project README**: packages/meta-bot/README.md
- **LangGraph Docs**: https://langchain-ai.github.io/langgraph/
- **OpenAI API**: https://platform.openai.com/docs/api-reference
- **LangChain JS**: https://js.langchain.com/docs/

---

**Last Updated**: October 27, 2025
**Status**: Production Ready
**Next Review**: After parallel tool execution implementation
