# Meta-Bot Quick Reference Guide

## File Locations & Purposes

### Entry Point
- **`/server.js`** (256 lines) - Express app, health check, webhook verification

### Configuration
- **`/config/env.js`** - Environment validation & typed config object
- **`/config/database.js`** - MongoDB connection with pooling

### Routes & Controllers
- **`/routes/operatorBot.routes.js`** - Route definitions (simple Express router)
- **`/controllers/facebook.controller.js`** (24 KB) - Facebook webhook handler
- **`/controllers/instagram.controller.js`** - Instagram webhook handler
- **`/controllers/facebookManualOperator.controllers.js`** - Manual Facebook sends
- **`/controllers/instagramManualOperator.controllers.js`** - Manual Instagram sends

### AI Orchestration (LangGraph)
- **`/langgraph/controller.js`** - Main entry point for message processing
- **`/langgraph/graph.js`** (13 KB) - State machine graph definition
- **`/langgraph/state/schema.js`** - Zod conversation state schema
- **`/langgraph/nodes/agent.js`** - OpenAI agent node
- **`/langgraph/nodes/geminiAgent.js`** - Google Gemini agent node
- **`/langgraph/nodes/humanDetector.js`** - Handoff detection
- **`/langgraph/nodes/toolExecutor.js`** - Tool execution with circuit breaker
- **`/langgraph/tools/index.js`** - LangChain tool definitions

### Business Logic
- **`/lib/toolHandlers.js`** (81 KB) - Main tool implementations (REFACTORING IN PROGRESS)
- **`/lib/tools/`** - NEW modular tool handlers directory
  - `index.js` - Barrel export
  - `datetime.js` - DateTime tools
  - `customer.js` - Customer info tools
- **`/lib/bookingContext.js`** - Booking helper functions
- **`/lib/bookingHoldManager.js`** - Temporary booking reservation (prevent double-book)
- **`/lib/authorization.js`** - Access control verification
- **`/lib/databaseWrapper.js`** - Database operation wrapper
- **`/lib/imageModel.js`** - Vision/image analysis
- **`/lib/LLM.js`** - LLM wrapper utilities

### Services (Data Access Layer)
- **`/services/company.service.js`** - Company & integration lookups
- **`/services/contact.service.js`** - Contact CRUD operations
- **`/services/message.service.js`** - Message storage & retrieval

### Database Models
- **`/models/CompanyIntegration.js`** - MongoDB schema for platform integrations

### Platform Clients
- **`/middlewares/facebookMsgSender.js`** - Facebook Graph API wrapper
- **`/middlewares/instagramMsgSender.js`** - Instagram Graph API wrapper
- **`/apis/facebookAxios.js`** - Low-level Facebook API calls
- **`/apis/instagramAxios.js`** - Low-level Instagram API calls
- **`/apis/sendToServer.js`** - Backend communication

### Core Utilities
- **`/core/bufferManager.js`** - Message buffering for rapid typing
- **`/core/duplicateDetector.js`** - Webhook deduplication
- **`/core/platformHelpers.js`** - Shared helper functions
- **`/core/constants.js`** - Centralized constants

### Utils
- **`/utils/logger.js`** - Winston-based structured logging
- **`/utils/webhookVerifier.js`** - Webhook signature verification
- **`/utils/time.js`** - Timezone & working hours helpers
- **`/utils/metrics.js`** - Tool metrics tracking
- **`/utils/openaiTools.js`** - OpenAI tool schema definitions
- **`/utils/piiDetection.js`** - PII detection utilities
- **`/utils/delay.js`** - Delay helpers

### Tests (14 test suites)
- **`/__tests__/`** - Unit tests (authorization, booking, circuit breaker, database)
- **`/langgraph/__tests__/`** - LangGraph tests (hybrid flow, tool enforcement, handlers)
- **`/controllers/__tests__/`** - Controller tests (race conditions)
- **`/core/__tests__/`** - Core tests (buffer manager)
- **`/tests/`** - Integration tests (booking, real-time appointments)

### Scripts
- **`/scripts/check-indexes.js`** - Verify MongoDB indexes
- **`/scripts/ensure-indexes.js`** - Create MongoDB indexes
- **`/scripts/test-hybrid-flow.js`** - Test Gemini+OpenAI flow
- **`/scripts/verify-tool-enforcement.js`** - Test tool enforcement

---

## Request Flow Diagram

```
REQUEST
  │
  ├─→ Server.js
  │     (Express app, middleware)
  │
  ├─→ operatorBot.routes.js
  │     (Route to controller)
  │
  ├─→ facebook.controller.js or instagram.controller.js
  │     1. Verify webhook signature
  │     2. Extract events, validate
  │     3. Check for duplicates (DuplicateDetector)
  │     4. Get/create Contact
  │     5. Get/create Company
  │     6. Check bot suspension, working hours
  │     7. Add to message buffer (ConversationBufferManager)
  │     8. On buffer flush:
  │
  ├─→ langgraph/controller.js
  │     (Main entry point)
  │     1. Load contact info
  │     2. Build conversation state
  │     3. Invoke graph
  │
  ├─→ langgraph/graph.js
  │     (State machine)
  │     1. humanDetectorNode
  │     2. geminiAgentNode (primary) or agentNode (fallback)
  │     3. toolExecutorNode (if tools needed)
  │     4. Return final response
  │
  ├─→ langgraph/nodes/*
  │     Agent: Call LLM, parse response, detect tools
  │     ToolExecutor: Execute tool_calls, circuit breaker
  │
  ├─→ lib/toolHandlers.js
  │     Execute individual tools
  │     (get_current_datetime, book_appointment, etc.)
  │
  ├─→ services/*.js
  │     Access database (Company, Contact, Message)
  │
  ├─→ Back to controller
  │     1. Get response from LangGraph
  │     2. Send typing indicator
  │     3. Send response message (via Facebook/Instagram API)
  │     4. Save message to database
  │     5. Emit socket event to frontend
  │
  └─→ Response 200 OK to webhook
```

---

## Configuration Requirements

### Environment Variables (Required)

```env
# Server
NODE_ENV=development|production
META_BOT_PORT=5001

# Database
MONGODB_URI=mongodb://user:pass@host/db

# Security
INTERNAL_SERVICE_API_KEY=<32+ chars>
VERIFY_TOKEN=<webhook-verify-token>

# Facebook
FB_PAGE_ACCESS_TOKEN=<access-token>

# Instagram
INSTA_PAGE_ACCESS_TOKEN=<access-token>

# AI Provider (at least one required)
OPENAI_API_KEY=sk-<key>
GEMINI_API_KEY=<key>

# Backend
BACKEND_API_URL=http://localhost:3000
```

### Optional Variables

```env
# Gemini config
GEMINI_CHAT_MODEL=gemini-1.5-pro
GEMINI_VISION_MODEL=gemini-1.5-pro-vision
GEMINI_API_VERSION=v1

# OpenAI config
CHAT_MODEL=gpt-4o
IMAGE_MODEL=gpt-4o

# Bot behavior
RESPONSE_DELAY_MS=4000
SYSTEM_INSTRUCTIONS=<custom-prompt>

# Features
USE_LANGGRAPH=true
USE_GEMINI=false
ENFORCE_TOOL_USAGE=true

# JWT (if using token verification)
JWT_ACCESS_SECRET=<secret>
JWT_REFRESH_SECRET=<secret>

# Admin notifications
ADMIN_PAGE_ACCESS_TOKEN=<token>
ADMIN_CHAT_ID=<chat-id>
ADMIN_INSTAGRAM_ACCESS_TOKEN=<token>
ADMIN_INSTAGRAM_CHAT_ID=<chat-id>
```

---

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health check |
| GET | `/chat/facebook` | Webhook verification + echo challenge |
| POST | `/chat/facebook` | Facebook webhook events |
| GET | `/chat/instagram` | Webhook verification |
| POST | `/chat/instagram` | Instagram webhook events |
| POST | `/chat/manual-facebook` | Send message manually |
| POST | `/chat/manual-instagram` | Send message manually |
| POST | `/chat/message-to-admin` | Send admin notification |
| POST | `/chat/instagram-message-to-admin` | Send Instagram admin notification |
| GET | `/test-webhook` | Test webhook setup |
| GET | `/test-company-lookup` | Test company lookup |
| GET | `/test-logs` | Generate sample logs |

---

## LangGraph Flow (Hybrid Mode)

```
START
  │
  └─→ humanDetectorNode
       ├─ Detect handoff keywords
       ├─ Check escalation rules
       │
       ├─ YES (needsHumanHandoff) → END (escalate to human)
       │
       └─ NO → geminiAgentNode
            ├─ Build prompt with tools
            ├─ Call Gemini API
            ├─ Parse response
            │
            ├─ toolCalls detected → execute_tools
            │                         │
            │                         └─→ toolExecutorNode
            │                              ├─ Execute each tool
            │                              ├─ Collect results
            │                              └─→ geminiAgentNode (again)
            │                                   └─ Process tool results
            │                                      └─ Generate final response
            │                                         → END
            │
            ├─ Text-only response → END
            │
            └─ Missed tools (enforce=true) → openai_agent
                 ├─ Re-process with OpenAI
                 └─→ execute_tools or END
```

---

## Message Processing Pipeline

### Facebook/Instagram Controller

1. **Webhook Verification** - HMAC-SHA256 signature check
2. **Event Extraction** - Get messaging entries from webhook
3. **Deduplication** - Check DuplicateDetector
4. **Contact Lookup** - Get or create Contact, update profile
5. **Company Lookup** - Find company by page ID, load config
6. **Validation** - Check bot suspension, working hours, rate limits
7. **Message Buffering** - Add to ConversationBufferManager
8. **Flush Trigger** - Timer expires (4s default) after typing stops
9. **LangGraph Processing** - Process via graph → get response
10. **Send Response** - Typing indicator → send message → save → emit socket

---

## Key Features

### Message Buffering
- Waits for typing completion before responding
- Prevents bot responding to every message fragment
- 4-second configurable delay

### Duplicate Detection
- Prevents processing same webhook twice
- Tracks last 1000 message IDs
- LRU cache eviction

### Hybrid AI Mode
- Primary: Google Gemini (fast, cheap)
- Fallback: OpenAI (when Gemini misses tools)
- Automatic switching based on tool detection

### Circuit Breaker (Tool Execution)
- Per-company isolation
- Prevents cascading failures
- Auto-recovery after timeout

### Authorization
- Verifies contact belongs to company
- Platform isolation (Facebook/Instagram separate)
- JWT token verification for bookings

### Real-time Updates
- Socket event emission to frontend
- Message saved immediately after send
- Admin notifications on errors

---

## Common Tasks

### Start Development
```bash
cd packages/meta-bot
npm run dev
```

### Run Tests
```bash
npm test
npm test -- authorization.test.js
npm test -- --watch
```

### Check/Create Indexes
```bash
npm run check-indexes
npm run ensure-indexes
```

### View Logs
```bash
# Real-time
tail -f logs/message-flow.log

# Docker
docker-compose logs -f meta-bot

# Search
grep "book_appointment" logs/message-flow.log
```

### Test Endpoints
```bash
# Health check
curl http://localhost:5001/health

# Test webhook
curl http://localhost:5001/test-webhook

# Test company lookup
curl "http://localhost:5001/test-company-lookup?fbPageId=602445226293374"

# Generate logs
curl http://localhost:5001/test-logs
```

---

## Tools Available

### Customer Info Tools
- `get_current_datetime` - Current time in timezone
- `get_customer_full_name` - Ask for name, save to DB
- `get_customer_info` - Ask for name + phone
- `get_customer_phone_number` - Ask for phone

### Booking Tools
- `book_appointment` - Book appointment (complex)
- `get_service_categories` - List services
- `get_location_choices` - List locations
- `get_staff_list` - List available staff
- `get_availability` - Check open time slots

### Other
- See `lib/toolHandlers.js` for complete list

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Webhook not receiving | Check `VERIFY_TOKEN` matches Facebook config |
| Bot not responding | Check `RESPONSE_DELAY_MS`, bot suspension status |
| Messages duplicated | Check `DuplicateDetector` is working |
| Booking fails | Check authorization, working hours, staff availability |
| Logs not showing | Check `logs/` directory exists, file permissions |
| AI errors | Check API keys (OpenAI or Gemini) are valid |
| Database errors | Check MongoDB connection, indexes created |

---

## Dependencies

**Core:**
- express, cors, axios (HTTP)
- mongoose (MongoDB)
- @langchain/langgraph (AI orchestration)
- @langchain/google-genai, openai (AI providers)
- winston (logging)
- moment, moment-timezone (time)
- zod (validation)
- jsonwebtoken, bcrypt (security)

**See:** `/package.json` for complete list

---

## File Sizes

| File | Size | Purpose |
|------|------|---------|
| lib/toolHandlers.js | 81 KB | Tool implementations (REFACTORING) |
| controllers/facebook.controller.js | 24 KB | Facebook webhook handler |
| langgraph/graph.js | 13 KB | State machine definition |
| server.js | 6.8 KB | Express app |
| Others | <5 KB each | Various utilities |

---

## Documentation

- **`/README.md`** - Overview and quick start
- **`/docs/INDEX.md`** - Documentation index
- **`/docs/HYBRID_SETUP_GUIDE.md`** - Hybrid AI setup
- **`/docs/guides/TROUBLESHOOTING.md`** - Common issues
- **`/docs/refactoring/REFACTORING_PLAN.md`** - Future work

---

## Recent Changes (November 2025)

- ✅ Phase 1 & 2 refactoring complete
- ✅ Eliminated duplicate code
- ✅ Fixed admin notification bug
- ✅ Started lib/tools/ modularization
- 🔄 In progress: Split 81 KB toolHandlers.js
- 📋 Planned: Add Prometheus metrics, APM tracing

