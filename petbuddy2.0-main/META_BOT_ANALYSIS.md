# Meta-Bot Server Implementation - Comprehensive Analysis

**Generated:** November 11, 2025  
**Codebase:** PetBuddy 2.0 - Meta-Bot Package  
**Location:** `/packages/meta-bot/`

---

## Executive Summary

The Meta-Bot is a sophisticated AI-powered customer service bot built for Facebook Messenger and Instagram Direct Messages. It features:

- **Dual AI Provider Support**: OpenAI and Google Gemini with hybrid fallback
- **LangGraph Integration**: Advanced multi-step reasoning and tool orchestration
- **Appointment Booking**: Complex booking logic with availability checking
- **Multi-Platform**: Facebook and Instagram unified implementation
- **Message Buffering**: Intelligent message batching for rapid user input
- **Comprehensive Logging**: Structured logging for production monitoring

**Key Statistics:**
- ~3,000+ lines of core implementation
- 12 major test suites covering critical functionality
- Modular architecture with clear separation of concerns
- Production-ready with circuit breakers and error handling

---

## 1. Architecture Overview

### Directory Structure

```
meta-bot/
├── server.js                          # Express app entry point
├── config/
│   ├── env.js                        # Environment configuration & validation
│   └── database.js                   # MongoDB connection management
│
├── routes/
│   └── operatorBot.routes.js         # API route definitions
│
├── controllers/                       # Request handlers (24KB facebook.controller.js)
│   ├── facebook.controller.js        # Facebook webhook processing
│   ├── instagram.controller.js       # Instagram webhook processing
│   ├── facebookManualOperator.controllers.js  # Manual message sending
│   └── instagramManualOperator.controllers.js # Manual message sending
│
├── langgraph/                        # AI Orchestration Layer
│   ├── controller.js                # Main entry point for message processing
│   ├── graph.js                     # State graph definition (13KB)
│   ├── state/
│   │   └── schema.js               # ConversationState Zod schema
│   ├── nodes/
│   │   ├── agent.js                # OpenAI agent node
│   │   ├── geminiAgent.js          # Google Gemini agent node
│   │   ├── humanDetector.js        # Human handoff detection
│   │   └── toolExecutor.js         # Tool execution with circuit breaker
│   └── tools/
│       └── index.js                # LangChain tool definitions
│
├── lib/                             # Core business logic
│   ├── toolHandlers.js             # Tool implementation (81KB - being refactored)
│   ├── tools/                      # NEW: Modular tool handlers
│   │   ├── index.js               # Barrel export
│   │   ├── datetime.js            # DateTime tools
│   │   └── customer.js            # Customer info tools
│   ├── LLM.js                      # LLM wrapper utilities
│   ├── imageModel.js              # Image analysis with vision models
│   ├── bookingContext.js           # Booking logic helpers
│   ├── bookingHoldManager.js       # Temporary booking reservation
│   ├── authorization.js            # Access control verification
│   ├── databaseWrapper.js          # Database operation wrapper
│   └── book_appointment_refactored.js  # Appointment booking logic
│
├── services/                        # Data access layer
│   ├── company.service.js          # Company & integration lookups
│   ├── contact.service.js          # Contact CRUD operations
│   └── message.service.js          # Message storage
│
├── models/
│   └── CompanyIntegration.js       # MongoDB schema for platform integrations
│
├── middlewares/                     # Platform API clients
│   ├── facebookMsgSender.js        # Facebook graph API client
│   └── instagramMsgSender.js       # Instagram graph API client
│
├── apis/
│   ├── facebookAxios.js            # Facebook API wrapper
│   ├── instagramAxios.js           # Instagram API wrapper
│   └── sendToServer.js             # Backend API client
│
├── core/                           # Shared utilities
│   ├── bufferManager.js            # Message buffering logic
│   ├── duplicateDetector.js        # Webhook deduplication
│   ├── platformHelpers.js          # Common helper functions
│   └── constants.js                # Shared constants
│
├── utils/
│   ├── logger.js                   # Winston-based structured logging
│   ├── webhookVerifier.js          # Webhook signature verification
│   ├── time.js                     # Timezone/working hours helpers
│   ├── metrics.js                  # Tool metrics tracking
│   ├── openaiTools.js              # OpenAI tool definitions
│   ├── piiDetection.js             # PII detection utilities
│   └── delay.js                    # Delay helpers
│
├── __tests__/                      # Unit tests
│   ├── authorization.test.js
│   ├── bookingHoldManager.test.js
│   ├── circuitBreaker.test.js
│   └── databaseWrapper.test.js
│
├── langgraph/__tests__/           # LangGraph tests
│   ├── hybridFlow.test.js
│   ├── toolEnforcement.test.js
│   ├── toolExecutor.test.js
│   ├── toolHandlers.test.js
│   ├── toolSchemaValidation.test.js
│   └── bookingConflict.test.js
│
├── controllers/__tests__/
│   └── buffer-race-condition.test.js
│
├── core/__tests__/
│   └── bufferManager.test.js
│
├── tests/
│   ├── booking-location-staff-selection.test.js
│   └── realtimeAppointments.test.js
│
├── scripts/
│   ├── check-indexes.js
│   ├── ensure-indexes.js
│   ├── test-hybrid-flow.js
│   └── verify-tool-enforcement.js
│
├── docs/                          # Comprehensive documentation
│   ├── INDEX.md                  # Documentation index
│   ├── refactoring/             # Refactoring work in progress
│   ├── features/                # Feature documentation
│   └── guides/                  # Usage guides
│
└── logs/                          # Log files (runtime)
    ├── error.log
    ├── combined.log
    └── message-flow.log
```

---

## 2. Entry Points & Main Server

### **File:** `/server.js`

**Purpose**: Express application setup and server lifecycle management

**Key Features:**
- Health check endpoint (`/health`)
- Webhook verification endpoints
- Test endpoints for debugging
- Graceful shutdown handling (SIGTERM, SIGINT)
- MongoDB connection management
- CORS and JSON middleware setup

**Endpoints:**
```
GET  /health                    - Health check
GET  /chat/facebook            - Facebook webhook verification
POST /chat/facebook            - Facebook webhook events (routed to operatorBot)
GET  /chat/instagram           - Instagram webhook verification
POST /chat/instagram           - Instagram webhook events (routed to operatorBot)
POST /chat/manual-facebook     - Manual message sending
POST /chat/manual-instagram    - Manual message sending
POST /chat/message-to-admin    - Admin notifications
POST /chat/instagram-message-to-admin - Instagram admin notifications
GET  /test-webhook             - Verify webhook setup
GET  /test-company-lookup      - Test company lookup
GET  /test-logs                - Generate sample logs
```

**Example Health Response:**
```json
{
  "status": "healthy",
  "service": "Meta Bot Server",
  "timestamp": "2025-11-11T12:00:00.000Z",
  "endpoints": {
    "facebook": "/chat/facebook",
    "instagram": "/chat/instagram"
  }
}
```

---

## 3. Configuration System

### **File:** `/config/env.js`

**Architecture**: Environment variable validation with typed configuration

**Key Validations:**
- `MONGODB_URI` (required) - Database connection string
- `INTERNAL_SERVICE_API_KEY` (required, min 32 chars) - Backend communication
- `VERIFY_TOKEN` (required) - Webhook verification
- `FB_PAGE_ACCESS_TOKEN` (required for Facebook) - Platform integration
- `INSTA_PAGE_ACCESS_TOKEN` (required for Instagram) - Platform integration
- `OPENAI_API_KEY` (required for OpenAI) - AI provider
- `GEMINI_API_KEY` (optional) - Alternative AI provider

**Feature Flags:**
```javascript
{
  features: {
    useLangGraph: true,           // Enable LangGraph orchestration
    useGemini: false,             // Use Gemini instead of OpenAI
    enforceToolUsage: true,       // Hybrid mode: force tool enforcement
  }
}
```

**Configuration Structure:**
```javascript
export const config = {
  env, port, isProduction, isDevelopment, isTest,
  mongodb: { uri },
  backend: { apiUrl, outboundServerUrl },
  security: { internalApiKey, verifyToken },
  jwt: { accessSecret, refreshSecret },
  facebook: { pageAccessToken, appSecret, adminPageAccessToken, adminChatId },
  instagram: { pageAccessToken, adminAccessToken, adminChatId },
  openai: { apiKey, chatModel, imageModel },
  gemini: { apiKey, chatModel, visionModel, apiVersion },
  bot: { responseDelayMs, systemInstructions },
  features: { useLangGraph, useGemini, enforceToolUsage }
}
```

### **File:** `/config/database.js`

**Purpose**: MongoDB connection management

**Key Functions:**
- `connectDB()` - Establishes Mongoose connection with connection pooling
- `disconnectDB()` - Graceful disconnect
- Error handling and event logging

**Connection Options:**
```javascript
{
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
}
```

---

## 4. Routes & API Endpoints

### **File:** `/routes/operatorBot.routes.js`

**Simple router using Express:** Routes webhook events to appropriate controllers

```javascript
POST /chat/facebook                    → handlerFacebook
POST /chat/instagram                   → handlerInstagram
POST /chat/manual-facebook             → handlerManualFbSend
POST /chat/manual-instagram            → handlerManualInstagramSend
POST /chat/message-to-admin            → sendMessageToAdmin (Facebook)
POST /chat/instagram-message-to-admin  → sendMessageToAdmin (Instagram)
```

---

## 5. Request Handling - Controllers

### **File:** `/controllers/facebook.controller.js` (24 KB)

**Purpose**: Process incoming Facebook Messenger webhooks and coordinate response flow

**Key Function:** `handlerFacebook(req, res)`

**Processing Pipeline:**
```
1. Webhook verification
   ├─ Validate signature (HMAC-SHA256)
   └─ Echo hub.challenge if verification request

2. Event extraction & validation
   ├─ Extract messaging entries from webhook
   ├─ Handle message types (text, attachments, echoes, read receipts)
   └─ Filter bot echoes (marked with zero-width joiner)

3. Deduplication
   ├─ Check for duplicate webhook deliveries
   └─ Skip if already processed

4. Contact lookup/creation
   ├─ Get or create Contact record for sender
   ├─ Update profile from Facebook API (name, profile picture)
   └─ Associate with company

5. Company lookup
   ├─ Find company by Facebook page ID
   └─ Load company configuration, AI settings, working hours

6. Message validation
   ├─ Check bot suspension status
   ├─ Verify working hours (if enabled)
   ├─ Check rate limiting

7. Message buffering
   ├─ Add message to buffer queue
   ├─ Reset timeout when new messages arrive
   └─ Process batch when user stops typing

8. AI Processing (via LangGraph)
   ├─ Load conversation history
   ├─ Pass to LangGraph for intelligent processing
   ├─ Handle tool calls (booking, customer info, etc.)
   └─ Get final response

9. Response delivery
   ├─ Call typing indicator API
   ├─ Send response message
   ├─ Save message to database
   ├─ Emit real-time socket event
   └─ Return 200 OK to webhook

10. Error handling
    ├─ Detailed logging at each step
    ├─ Automatic bot suspension on errors
    ├─ Admin notifications on failures
    └─ Graceful degradation
```

**Key Features:**
- **Message Buffering**: Waits for typing completion before responding
- **Duplicate Detection**: Prevents processing same webhook twice
- **Contact Management**: Creates/updates contact profiles
- **Working Hours Check**: Bot only responds during configured hours
- **Real-time Updates**: Emits socket events to frontend
- **Error Recovery**: Automatic suspension and retry logic

**Imports:**
```javascript
import { processMessageWithLangGraph } from "../langgraph/controller.js"
import { ConversationBufferManager } from "../core/bufferManager.js"
import { DuplicateDetector } from "../core/duplicateDetector.js"
```

### **File:** `/controllers/instagram.controller.js`

**Purpose**: Similar to Facebook but for Instagram Direct Messages

**Key Differences:**
- Instagram API uses different payload structure
- `sender.id` vs Facebook's `sender.id` (similar, but different profile fetch)
- Same buffer manager and duplicate detector pattern
- Reuses most core logic through `services/` layer

### **Files:** `/controllers/facebookManualOperator.controllers.js` & `/controllers/instagramManualOperator.controllers.js`

**Purpose**: Manual message sending from backend system

**Exports:**
- `sendMessageToAdmin(req, res)` - Send message to admin channel
- `handlerManualFbSend(req, res)` - Send arbitrary message to user

---

## 6. AI Orchestration - LangGraph

### **File:** `/langgraph/graph.js` (13 KB)

**Purpose**: Define the conversational AI flow with state machine pattern

**Architecture**: Hybrid AI Model
- Primary: Google Gemini (fast, cost-effective)
- Fallback: OpenAI (when Gemini misses tools)
- Human Detector: Route to human agents when needed

**State Graph Flow:**

```
┌─────────────────────────────────────────────────────┐
│                 START                               │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│          HUMAN DETECTOR NODE                        │
│ - Check if human intervention needed               │
│ - Detect keywords like "connect to agent"          │
│ - Check handoff rules                              │
└────────────────┬────────────────────────────────────┘
                 │
        ┌────────┴─────────┐
        │                  │
   (handoff)         (continue)
        │                  │
        │                  ▼
        │    ┌─────────────────────────────────┐
        │    │    GEMINI AGENT NODE (Primary) │
        │    │ - Process message               │
        │    │ - Decide if tools needed       │
        │    │ - Generate response             │
        │    └────────────────┬────────────────┘
        │                     │
        │          ┌──────────┼──────────┐
        │          │          │          │
        │     (tools)  (text)  │      (error)
        │          │          │          │
        │          ▼          ▼          ▼
        │    ┌──────────┐  END   ┌─────────────────┐
        │    │ EXECUTE  │        │ OPENAI FALLBACK │
        │    │ TOOLS    │        │ (if enforce)    │
        │    └────┬─────┘        └────────┬────────┘
        │         │                       │
        │         └───────────┬───────────┘
        │                     │
        │                     ▼
        │    ┌─────────────────────────────┐
        │    │ GEMINI AGENT (Process Res)  │
        │    └────────────────┬────────────┘
        │                     │
        │              ┌──────┴──────┐
        │              │             │
        │         (tools)        (end)
        │              │             │
        │              ▼             ▼
        └────────────────────────── END
```

**Node Details:**

#### 1. **Human Detector Node**
```javascript
function humanDetectorNode(state) {
  // Checks if message contains handoff keywords
  // e.g., "connect to agent", "speak to human", etc.
  // Returns state.needsHumanHandoff = true/false
}
```

#### 2. **Gemini Agent Node**
```javascript
function geminiAgentNode(state) {
  // Always used as primary in hybrid mode
  // 1. Build prompt with tools
  // 2. Call Gemini API
  // 3. Parse response for tool_calls
  // 4. Return state with:
  //    - assistantMessage: text response
  //    - toolCalls: array of tool calls to execute
  //    - currentStep: "execute_tools" or "end"
}
```

#### 3. **OpenAI Agent Node** (Fallback in hybrid mode)
```javascript
function agentNode(state) {
  // Used as fallback when Gemini misses tools
  // Same structure as Gemini but calls OpenAI API
  // Re-processes message if Gemini didn't recognize tools
}
```

#### 4. **Tool Executor Node**
```javascript
function toolExecutorNode(state) {
  // Execute all tool_calls from agent
  // Tools include: book_appointment, get_current_datetime, etc.
  // Returns tool_results for agent to process
  // Has circuit breaker to prevent cascading failures
}
```

**Configuration:**
```javascript
const isHybridMode = config.features.useGemini && config.openai.apiKey
```

If hybrid mode enabled:
- Start with Gemini (cheaper, faster)
- If Gemini detects tools → direct to tool execution
- If Gemini misses tools (and enforce enabled) → fallback to OpenAI
- OpenAI handles remaining tools

If hybrid mode disabled (legacy):
- Use single provider (Gemini or OpenAI based on config)
- Simpler flow but less robust

### **File:** `/langgraph/controller.js`

**Purpose**: Main entry point for LangGraph processing

**Function:** `processMessageWithLangGraph(params)`

**Parameters:**
```javascript
{
  chatId: string,                    // User's ID
  platform: "facebook" | "instagram",
  message: string,                   // User's message
  companyId: string,                 // Company ID
  systemInstructions: string,        // AI system prompt
  timezone: string,                  // Company timezone
  aiProvider: "openai" | "gemini",   // Optional override
  workingHours: Array,               // Company hours
  conversationHistory: Array,        // Previous messages
}
```

**Process:**
1. Load contact info from database
2. Build conversation state
3. Invoke graph.invokeConversation()
4. Return { assistantMessage, state }

### **File:** `/langgraph/state/schema.js`

**Purpose**: Zod schema defining conversation state structure

**Key Fields:**
```javascript
ConversationState = {
  messages: Array,                   // Message history
  chatId: string,
  platform: string,
  companyId: string,
  systemInstructions: string,
  timezone: string,
  activeProvider: string,            // "gemini" or "openai"
  currentStep: string,               // "start" | "end" | "execute_tools"
  assistantMessage: string,          // Final response
  toolCalls: Array<ToolCall>,       // Tools to execute
  toolResults: Object,               // Results from tool execution
  needsHumanHandoff: boolean,        // Should escalate to human
}
```

### **LangChain Nodes**

#### **File:** `/langgraph/nodes/geminiAgent.js`
- Google Gemini integration
- Tool schema definition
- Response parsing

#### **File:** `/langgraph/nodes/agent.js`
- OpenAI (legacy) integration
- OpenAI assistant API calls
- Tool schema definition

#### **File:** `/langgraph/nodes/humanDetector.js`
- Detects handoff keywords
- Evaluates escalation rules
- Returns handoff decision

#### **File:** `/langgraph/nodes/toolExecutor.js`
- Executes tool_calls from agents
- Circuit breaker pattern (prevents cascade failures)
- Per-company isolation (failures don't cross tenants)
- Metrics tracking

**Circuit Breaker States:**
```
CLOSED    → Normal operation
HALF_OPEN → Testing recovery after failure
OPEN      → Rejecting requests (circuit broken)
```

### **File:** `/langgraph/tools/index.js`

**Purpose**: Convert tool handlers to LangChain StructuredTools

**Tools Defined:**
1. `get_current_datetime` - Current time in company timezone
2. `get_customer_full_name` - Ask for customer name
3. `get_customer_info` - Ask for name + phone
4. `get_customer_phone_number` - Ask for phone number
5. `book_appointment` - Book appointment (complex logic)
6. `get_service_categories` - List available services
7. `get_location_choices` - List company locations
8. `get_staff_list` - List available staff
9. `get_availability` - Check time slots
10. Additional tools in `toolHandlers.js`

---

## 7. Business Logic Layer

### **File:** `/lib/toolHandlers.js` (81 KB - Main tool implementations)

**Purpose**: Implement all tool functions called by LangGraph agents

**Key Tools:**

#### **get_current_datetime**
```javascript
// Returns current time in company timezone
{
  timezone: "America/New_York",
  local_text: "2025-11-11 12:30:45",
  iso_local: "2025-11-11T12:30:45",
  ymd: "2025-11-11",
  weekday: "Tuesday"
}
```

#### **get_customer_full_name**
```javascript
// Saves customer name to database
// Returns: { full_name }
```

#### **book_appointment** (Complex logic)
**Steps:**
1. Authorization check - Verify user can book
2. Service matching - Fuzzy match service name
3. Staff selection - Get qualified staff
4. Availability check - Find open slots
5. Location selection - Validate location
6. Create booking hold - Reserve for 5 minutes
7. Create appointment - Save to database
8. Return confirmation or needs_selection

**Authorization:**
- Verifies contact belongs to company
- Uses JWT verification
- Prevents cross-company bookings

**Availability Algorithm:**
- Checks working hours
- Checks staff time-off
- Checks appointment conflicts (with buffer)
- Considers service duration
- Returns list of available slots

#### **get_service_categories**
```javascript
// Lists service categories for company
[
  { id, name, services: [...] },
  ...
]
```

#### **get_location_choices**
```javascript
// Lists company locations with details
[
  { id, label, address, isMain: boolean },
  ...
]
```

#### **get_staff_list**
```javascript
// Lists staff qualified for service
[
  { id, name, specialties: [...] },
  ...
]
```

### **File:** `/lib/tools/` (NEW modular structure)

**Being refactored to separate concerns:**

#### **`/lib/tools/index.js`**
Barrel export for all tool handlers
```javascript
export { createToolHandlers } from './index.js'
```

#### **`/lib/tools/datetime.js`**
DateTime-related tools (under refactoring)

#### **`/lib/tools/customer.js`**
Customer information tools (under refactoring)

### **File:** `/lib/bookingContext.js`

**Purpose**: Helper functions for booking flow

**Key Functions:**
- `getBookingContext()` - Load all context needed for booking (services, staff, locations)
- `escapeRegex()` - Safely escape regex for service matching
- Service duration calculation
- Staff availability filtering

### **File:** `/lib/bookingHoldManager.js`

**Purpose**: Temporary booking reservation (prevents double-booking)

**Mechanism:**
1. When user confirms booking → Create 5-minute hold
2. Reserves slot for this user
3. Prevents race conditions during booking confirmation
4. Auto-release after 5 minutes or manual release

**Key Functions:**
```javascript
createBookingHold(appointmentData)  // Reserve slot
releaseBookingHold(holdId)          // Release early
```

### **File:** `/lib/authorization.js`

**Purpose**: Verify access control for tool operations

**Key Functions:**
```javascript
verifyAuthorization(chatId, companyId, platform)
  // Ensures chat belongs to company/platform

verifyResourceOwnership(contactId, companyId)
  // Ensures contact belongs to company

verifyCustomerOwnership(chatId, companyId, platform)
  // Same as above, platform-specific

isActionAllowed(action, context)
  // Generic authorization check
```

**Security Model:**
- Chat ID ↔ Company mapping via CompanyIntegration
- Contact ownership verified
- Platform isolation (Facebook/Instagram separate)

### **File:** `/lib/databaseWrapper.js`

**Purpose**: Wrap database operations with error handling

**Key Functions:**
```javascript
executeDatabaseOperation(operation)
  // Execute with try/catch and detailed logging

validateDatabaseResult(result, options)
  // Validate operation result format

validateWriteResult(writeResult)
  // Check MongoDB write operation success
```

**Error Handling:**
- Duplicated key errors
- Validation errors
- Connection errors
- Partial failure scenarios

### **File:** `/lib/imageModel.js`

**Purpose**: Image analysis and vision capabilities

**Function:** `imageInputLLM(imageUrl, prompt, model)`

Supports vision models (GPT-4 Vision, Gemini Vision) for analyzing images sent by users.

---

## 8. Service Layer (Data Access)

### **File:** `/services/company.service.js`

**Purpose**: Company and integration data management

**Key Functions:**

```javascript
getCompanyByFb(fbChatId)
  // Find company by Facebook page ID
  // Returns full company profile with AI settings

getCompanyByInstagram(instaChatId)
  // Find company by Instagram page ID
  // Returns full company profile

getCollectedSystemInstructions(company)
  // Build complete system prompt from:
  // - Company name, phone, website, timezone
  // - Working hours, locations
  // - Bot instructions and conversation examples
  // - Services list
  // Returns formatted instructions string

setBotActive(companyId, active)
  // Enable/disable bot for company
```

**Returned Profile Structure:**
```javascript
{
  _id: ObjectId,
  name: string,
  fb_page_access_token: string,
  insta_page_access_token: string,
  fb_chat_id: string,
  insta_chat_id: string,
  bot_active: boolean,
  bot_active_interval: {
    start_time: "09:00",
    end_time: "17:00",
    interval_active: boolean,
    timezone: string,
  },
  system_instructions: string,
  openai_api_key: string,
  gemini_api_key: string,
  ai_provider: "openai" | "gemini",
  working_hours: Array,
  locations: Array,
  timezone: string,
  main_currency: string,
}
```

### **File:** `/services/contact.service.js`

**Purpose**: Contact (customer) management

**Key Functions:**

```javascript
getOrCreateContact(socialId, companyId, platform, profileData)
  // Get existing contact or create new
  // Saves profile data (name, picture, etc.)
  // Creates lead if new user
  // Returns Contact document

getContactByChatId(chatId, companyId, platform)
  // Find contact by platform ID
  // Returns Contact with full details

getContactBySocialId(socialId, platform)
  // Find contact by social ID

updateContactInfo(contactId, updates)
  // Update contact fields (name, phone, etc.)

convertContactToCustomer(contactId, customerData)
  // Convert lead to customer
  // Requires email or phone

updateContactBotSuspension(contactId, suspensionData)
  // Mark contact as suspended from bot
  // Saves suspension reason and duration
```

**Contact Model Fields:**
```javascript
{
  companyId: ObjectId,
  fullName: string,
  socialNetworkName: string,
  phone: string,
  email: string,
  social: {
    facebookId: string,
    instagramId: string,
    whatsapp: string,
  },
  profile: {
    name: string,
    picture: string,
  },
  contactStatus: "lead" | "customer" | "archived",
  leadSource: "facebook" | "instagram" | "other",
  leadStage: "new" | "engaged" | "interested" | "quote" | "converted",
  messageCount: number,
  lastMessageAt: Date,
  botSuspendedUntil: Date,
  botSuspensionReason: string,
}
```

### **File:** `/services/message.service.js`

**Purpose**: Message storage and retrieval

**Key Functions:**

```javascript
createMessage(messageData)
  // Save message to database
  // Params: {
  //   contact_id, company_id, role, platform,
  //   content, direction, external_message_id, attachments
  // }

getMessagesByCustomer(options)
  // Fetch message history
  // Params: {
  //   customerId, platform, limit, skip
  // }
  // Returns: array, newest-first sorted then reversed
```

---

## 9. Database Models

### **File:** `/models/CompanyIntegration.js`

**Purpose**: MongoDB schema for platform integrations

**Schema:**
```javascript
{
  companyId: ObjectId (unique, indexed),  // Company reference
  facebookChatId: String,                 // Facebook page ID
  instagramChatId: String,                // Instagram page ID
  facebookAccessToken: String,            // Access token for this company
  facebookAppAccessToken: String,         // App-level token
  openaiApiKey: String,                   // Per-company OpenAI API key
  geminiApiKey: String,                   // Per-company Gemini API key
  aiProvider: "openai" | "gemini",        // Company's preferred AI
  googleAccessToken: String,              // For Google Calendar integration
  googleRefreshToken: String,
  createdAt: Date,
  updatedAt: Date,
}
```

**Indexes:**
- `companyId` (unique) - Fast company lookup
- `facebookChatId` - Fast Facebook webhook processing
- `instagramChatId` - Fast Instagram webhook processing

---

## 10. Core Utilities

### **File:** `/core/bufferManager.js`

**Purpose**: Smart message buffering for rapid user input

**Problem Solved:**
When user types multiple messages in quick succession, buffer them and wait for pause before responding. Otherwise bot responds to each fragment.

**Algorithm:**
```
User sends msg1 → Start 4-second timer
User sends msg2 → Cancel timer, restart 4-second timer
User sends msg3 → Cancel timer, restart 4-second timer
[4 seconds pass without new messages]
→ Timer fires → Process all 3 messages together
```

**Key Features:**
- Per-sender buffer tracking
- Configurable delay (from RESPONSE_DELAY_MS)
- Automatic cleanup of stale buffers (>5 min inactive)
- Per-platform isolation

### **File:** `/core/duplicateDetector.js`

**Purpose**: Prevent processing same webhook twice

**Problem Solved:**
Facebook/Instagram webhooks can deliver the same event multiple times. Without deduplication, bot responds multiple times.

**Implementation:**
- Tracks processed message IDs
- Stores last 1000 IDs
- LRU cache eviction
- Per-platform tracking

### **File:** `/core/platformHelpers.js`

**Purpose**: Shared functions across platforms

**Functions:**
- Message saving (saveMessage)
- Socket event emission
- Error handling and token refresh
- Bot suspension management
- Attachment processing

### **File:** `/core/constants.js`

**Purpose**: Centralized constants

**Key Constants:**
```javascript
RESPONSE_DELAY_MS = 4000        // Buffer wait time
BUFFER_CLEANUP_INTERVAL = 10min // Cleanup frequency
STALE_BUFFER_THRESHOLD = 5min   // Max buffer age
MAX_ATTACHMENTS = 10            // Attachment limit
MAX_MESSAGE_HISTORY = 100       // Context window size
ADMIN_REPLY_SUSPENSION = 14d    // Days to suspend after admin reply
ERROR_SUSPENSION = 30min        // Minutes to suspend after error
```

---

## 11. Middleware & API Clients

### **File:** `/middlewares/facebookMsgSender.js`

**Purpose**: Facebook Graph API wrapper

**Key Functions:**
```javascript
facebookMsgSender(recipientId, messageObject, pageAccessToken)
  // Send message to recipient

callTypingAPI(recipientId, pageAccessToken)
  // Show typing indicator

getCustomerFbInfo(userId, fields, accessToken)
  // Fetch user profile (name, picture, etc.)
```

### **File:** `/middlewares/instagramMsgSender.js`

**Purpose**: Instagram Graph API wrapper

**Key Functions:**
```javascript
instagramMsgSender(recipientId, message, accessToken)
  // Send message to Instagram DM recipient

callInstaTypingAPI(recipientId, accessToken)
  // Show typing indicator

getCustomerInstagramInfo(userId, fields, accessToken)
  // Fetch user profile
```

### **File:** `/apis/facebookAxios.js`

**Purpose**: Low-level Facebook API calls

**Functions:**
```javascript
facebookAxiosPostMessage(requestBody, accessToken, action)
facebookAxiosGetUser(userId, fields, accessToken)
facebookApiGet(url, params)
```

### **File:** `/apis/instagramAxios.js`

**Purpose**: Low-level Instagram API calls

Similar structure to facebookAxios.

### **File:** `/apis/sendToServer.js`

**Purpose**: Backend API client for cross-service communication

Used to emit socket events, send notifications, etc. to main backend.

---

## 12. Utilities

### **File:** `/utils/logger.js`

**Purpose**: Structured logging with Winston

**Log Levels:**
- `error` - Errors and exceptions
- `warn` - Warnings and potential issues
- `info` - General information
- `debug` - Debug information

**Log Files:**
- `logs/error.log` - Errors only
- `logs/combined.log` - All logs
- `logs/message-flow.log` - Message processing flow (custom format)

**Custom Logging Methods:**
```javascript
logger.messageFlow.incoming(platform, msgId, senderId, companyId, msg, metadata)
logger.messageFlow.processing(platform, msgId, senderId, action, msg, metadata)
logger.messageFlow.outgoing(platform, msgId, senderId, recipientId, msg, metadata)
logger.messageFlow.llm(platform, senderId, action, msg, metadata)
logger.messageFlow.warning(platform, msgId, senderId, action, msg, metadata)
logger.messageFlow.error(platform, senderId, action, error, metadata)
```

### **File:** `/utils/webhookVerifier.js`

**Purpose**: Verify webhook signatures

**Functions:**
```javascript
verifyFacebookWebhook(req, res, verifyToken)
  // Check X-Hub-Signature header
  // Verify hub.verify_token parameter
  // Echo hub.challenge for subscription

verifyInstagramWebhook(req, res, verifyToken)
  // Similar to Facebook
```

### **File:** `/utils/time.js`

**Purpose**: Timezone and working hours utilities

**Functions:**
```javascript
getCurrentTimeInRegion(timezone)
  // Get current moment in timezone

isWithinActiveInterval(time, interval)
  // Check if time within bot active hours

getWorkingHoursTodayInRegion(workingHours, timezone)
  // Get today's hours in company timezone
```

### **File:** `/utils/metrics.js`

**Purpose**: Track tool execution metrics

**Metrics Tracked:**
- Tool call count
- Success/failure rates
- Execution time
- Error categories

Used for monitoring and optimization.

### **File:** `/utils/openaiTools.js`

**Purpose**: OpenAI tool schema definitions

Used for legacy OpenAI integration (non-LangChain).

### **File:** `/utils/piiDetection.js`

**Purpose**: Detect personally identifiable information

Helps prevent logging sensitive data.

---

## 13. Testing

### Test Coverage

**Unit Tests:**

1. **`/__tests__/authorization.test.js`** - 12,494 bytes
   - Tests authorization checks
   - Verifies resource ownership
   - Tests custom error handling

2. **`/__tests__/bookingHoldManager.test.js`** - 10,897 bytes
   - Tests reservation creation
   - Tests hold expiration
   - Tests concurrent bookings

3. **`/__tests__/circuitBreaker.test.js`** - 5,251 bytes
   - Tests circuit breaker states
   - Tests failure threshold
   - Tests recovery mechanisms

4. **`/__tests__/databaseWrapper.test.js`** - 9,191 bytes
   - Tests database operation wrapping
   - Tests error handling
   - Tests validation

**Integration Tests:**

5. **`/langgraph/__tests__/hybridFlow.test.js`**
   - Tests Gemini + OpenAI hybrid mode
   - Tests fallback mechanism
   - Tests tool routing

6. **`/langgraph/__tests__/toolEnforcement.test.js`**
   - Tests tool calling enforcement
   - Tests when tools are required
   - Tests fallback behavior

7. **`/langgraph/__tests__/toolExecutor.test.js`**
   - Tests tool execution
   - Tests circuit breaker
   - Tests error handling

8. **`/langgraph/__tests__/toolHandlers.test.js`**
   - Tests individual tool functions
   - Tests authorization
   - Tests data validation

9. **`/langgraph/__tests__/toolSchemaValidation.test.js`**
   - Tests Zod schema validation
   - Tests tool input validation

10. **`/langgraph/__tests__/bookingConflict.test.js`**
    - Tests appointment conflicts
    - Tests staff availability
    - Tests booking holds

11. **`/controllers/__tests__/buffer-race-condition.test.js`**
    - Tests message buffer timing
    - Tests rapid message handling
    - Tests race conditions

12. **`/core/__tests__/bufferManager.test.js`**
    - Tests buffer creation
    - Tests timeout handling
    - Tests cleanup

13. **`/tests/booking-location-staff-selection.test.js`**
    - Tests booking flow end-to-end
    - Tests location/staff selection
    - Tests validation

14. **`/tests/realtimeAppointments.test.js`**
    - Tests appointment creation
    - Tests real-time updates
    - Tests conflict detection

### Running Tests

```bash
npm test                           # Run all tests
npm test -- authorization.test.js  # Run specific test
npm test -- --watch                # Watch mode
```

---

## 14. Scripts

### **`/scripts/check-indexes.js`**
Verify MongoDB indexes are created for optimal performance

### **`/scripts/ensure-indexes.js`**
Create missing MongoDB indexes

### **`/scripts/test-hybrid-flow.js`**
Test Gemini + OpenAI hybrid flow

### **`/scripts/verify-tool-enforcement.js`**
Verify tool enforcement rules are working

---

## 15. Dependencies & Integrations

### **Core Dependencies:**

**AI/LLM:**
- `@langchain/core` - LangChain core
- `@langchain/langgraph` - LangGraph orchestration
- `@langchain/google-genai` - Google Gemini
- `@langchain/openai` - OpenAI integration
- `openai` - OpenAI SDK
- `langchain` - LangChain base

**Database:**
- `mongoose` - MongoDB ODM
- `zod` - Schema validation

**HTTP:**
- `axios` - HTTP client
- `express` - Web framework
- `cors` - CORS middleware

**Security:**
- `jsonwebtoken` - JWT handling
- `bcrypt` - Password hashing
- `dotenv` - Environment variables

**Utilities:**
- `moment` - Date/time library
- `moment-timezone` - Timezone support
- `chrono-node` - Natural language date parsing
- `winston` - Logging
- `googleapis` - Google APIs

**Message Platforms:**
- `telegraf` - Telegram Bot API (future support)

**Shared Code:**
- `@petbuddy/shared` - Shared models (Company, Contact, Message, etc.)

---

## 16. Known Issues & Areas for Improvement

### Current Issues

1. **Large toolHandlers.js File (81 KB)**
   - Status: Under refactoring
   - Plan: Split into modular tool handlers
   - Expected completion: December 2025

2. **Legacy OpenAI Implementation**
   - Status: Deprecated (use LangGraph instead)
   - Impact: Code duplication
   - Migration: Move to LangGraph-only

3. **Manual Test Endpoints**
   - `/test-logs` and `/test-webhook` only for development
   - Should be disabled in production

### Areas for Improvement

1. **Database Query Optimization**
   - Add pagination to contact/message queries
   - Consider aggregation pipelines for complex queries
   - Add query result caching

2. **Error Recovery**
   - Implement exponential backoff for failed tool calls
   - Add request queuing for rate-limited APIs
   - Better error categorization

3. **Performance**
   - Cache company profiles (updated every hour)
   - Use Redis for message buffer (high-throughput scenarios)
   - Add connection pooling metrics

4. **Monitoring**
   - Add Prometheus metrics export
   - Implement APM tracing (DataDog, New Relic)
   - Better alerting on errors

5. **Documentation**
   - Add API documentation (OpenAPI/Swagger)
   - Create deployment runbooks
   - Add performance tuning guide

6. **Testing**
   - Increase test coverage to 80%+
   - Add load testing for buffer manager
   - Add webhook delivery testing

---

## 17. Deployment & Operations

### Docker Support

**Dockerfile:** `/Dockerfile`
- Node.js base image
- Installs dependencies
- Runs on port 5001

**Docker Compose:** (in root)
- `meta-bot` service
- MongoDB connection
- Volume mounts for logs

### Environment Variables (Production)

**Critical:**
```
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
INTERNAL_SERVICE_API_KEY=<long-random-string>
VERIFY_TOKEN=<webhook-verify-token>
FB_PAGE_ACCESS_TOKEN=<facebook-token>
INSTA_PAGE_ACCESS_TOKEN=<instagram-token>
OPENAI_API_KEY=sk-<openai-key>
```

**Optional:**
```
GEMINI_API_KEY=<gemini-key>
JWT_ACCESS_SECRET=<jwt-secret>
JWT_REFRESH_SECRET=<jwt-secret>
RESPONSE_DELAY_MS=4000
USE_LANGGRAPH=true
USE_GEMINI=false
ENFORCE_TOOL_USAGE=true
```

### Health Checks

**Endpoint:** `GET /health`

Returns: `{ status: "healthy", service: "Meta Bot Server", timestamp, endpoints }`

### Log Monitoring

**Logs Location:**
- Docker: `/app/packages/meta-bot/logs/`
- Local: `./logs/`

**Useful Commands:**
```bash
# Follow real-time logs
docker-compose logs -f meta-bot

# Check error logs
tail -f logs/error.log

# View message flow
tail -f logs/message-flow.log

# Search logs
grep "book_appointment" logs/message-flow.log
```

---

## 18. Code Organization Highlights

### Strengths

1. **Clear Separation of Concerns**
   - Controllers handle webhooks
   - LangGraph orchestrates AI flow
   - Services manage data access
   - Utils contain reusable functions

2. **Structured Logging**
   - Every operation logged
   - Traceable message flows
   - Easy debugging in production

3. **Error Handling**
   - Try/catch in critical sections
   - Circuit breaker for tools
   - Automatic bot suspension on errors
   - Admin notifications

4. **Type Safety**
   - Zod for state validation
   - Environment variable validation
   - Tool schema validation

5. **Scalability**
   - Modular structure
   - Service layer abstraction
   - Per-company circuit breakers
   - Message buffering for throughput

### Refactoring Opportunities

1. **Tool Modularization**
   - Split `toolHandlers.js` into `lib/tools/`
   - One tool per file
   - Consistent exports

2. **Config Management**
   - Move hardcoded strings to constants
   - Add feature flag system
   - Config validation schema

3. **API Documentation**
   - Add JSDoc comments
   - Generate OpenAPI spec
   - API examples

4. **Test Improvements**
   - Increase coverage
   - Add integration tests
   - Performance benchmarks

---

## 19. Integration Points

### Outbound Integrations (Meta-Bot calls)

1. **Facebook Graph API**
   - `/me/messages` - Send messages
   - `/me/` - Get user info
   - Message delivery and read status

2. **Instagram Graph API**
   - Direct message sending
   - User profile fetching
   - Delivery status

3. **OpenAI API**
   - `/chat/completions` - Text generation
   - `/v1/images/generations` - Image analysis (vision)

4. **Google Gemini API**
   - Text generation (chat)
   - Vision/image analysis

5. **Backend PetBuddy Server**
   - Socket event emission
   - Admin notifications
   - Customer/message storage

6. **MongoDB**
   - Contacts, Messages, Companies
   - CompanyIntegration lookups
   - Message history retrieval

### Inbound Integrations (calls to Meta-Bot)

1. **Facebook Webhooks**
   - Message events
   - Delivery reports
   - Read receipts

2. **Instagram Webhooks**
   - Message events
   - Delivery/read status

3. **Backend Server**
   - Manual message sending
   - Admin notifications
   - Bot status updates

---

## 20. Summary Statistics

| Metric | Value |
|--------|-------|
| Main server file | 256 lines (server.js) |
| Controllers (total) | ~24 KB (facebook), ~20 KB (instagram) |
| LangGraph graph | 13 KB |
| Tool handlers | 81 KB (refactoring in progress) |
| Services | 3 files, ~500 LOC |
| Tests | 14 test suites |
| Configuration | 2 files (env.js, database.js) |
| API endpoints | 10+ routes |
| AI providers | 2 (OpenAI, Gemini) |
| Message platforms | 2 (Facebook, Instagram) |
| Mongoose models | 1 (CompanyIntegration) |
| Dependencies | 23 packages |
| Node version | >= 18.0.0 |

---

## 21. Quick Reference

### Common Tasks

**Start Development Server:**
```bash
npm run dev
```

**Check Configuration:**
```bash
npm run check-indexes
```

**View Logs:**
```bash
tail -f logs/message-flow.log
```

**Test Webhook:**
```bash
curl http://localhost:5001/test-webhook
```

**Test Company Lookup:**
```bash
curl "http://localhost:5001/test-company-lookup?fbPageId=602445226293374"
```

**Generate Test Logs:**
```bash
curl http://localhost:5001/test-logs
```

---

## 22. Contact & Support

**Key Documentation Files:**
- `README.md` - Overview and quick start
- `docs/INDEX.md` - Complete documentation index
- `docs/HYBRID_SETUP_GUIDE.md` - Hybrid AI setup
- `docs/guides/TROUBLESHOOTING.md` - Common issues
- `docs/refactoring/REFACTORING_PLAN.md` - Future work

