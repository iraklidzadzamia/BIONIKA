# Meta Bot Server Split Proposal

## Overview

This document outlines options for splitting the current `meta-bot` server into separate services.

## Current Architecture

```
meta-bot/
├── server.js                 # Express server
├── routes/                   # Webhook handlers
├── controllers/              # Message processing
├── lib/
│   ├── LLM.js               # OpenAI integration
│   ├── toolHandlers.js      # Business logic
│   └── bookingContext.js
├── apis/                     # Meta Graph API
├── middlewares/              # Message sending
├── services/                 # DB operations
└── utils/                    # Logging, time, etc.
```

## Proposed Split: Option A - Meta Gateway + AI Service

### Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│                 │         │                  │         │                 │
│  Meta/Facebook  │───────▶│   meta-server    │────────▶│    ai-server    │
│   Webhooks      │         │                  │         │                 │
│                 │         │  • Webhook verify │         │  • LLM calls    │
│                 │         │  • Meta API      │         │  • Tool exec    │
│                 │         │  • Message queue │         │  • Business     │
│                 │         │  • Basic routing │         │    logic        │
└─────────────────┘         └──────────────────┘         └─────────────────┘
                                      │                          │
                                      └────────────┬─────────────┘
                                                   │
                                          ┌────────▼─────────┐
                                          │                 │
                                          │    Backend      │
                                          │                 │
                                          └─────────────────┘
```

### Components

#### meta-server (Webhook & Meta API Gateway)

**Responsibilities:**

- Receive and verify Meta webhooks
- Handle Meta Graph API calls
- Parse incoming messages (Facebook/Instagram)
- Queue messages for AI processing
- Send messages back to Meta
- Handle Meta-specific features (typing indicators, seen receipts)

**Files:**

```
meta-server/
├── server.js
├── routes/
│   └── webhooks.js         # Webhook endpoints
├── services/
│   ├── webhookService.js   # Webhook verification
│   └── metaApiService.js   # Graph API calls
├── controllers/
│   ├── facebookController.js
│   └── instagramController.js
├── middlewares/
│   └── messageQueue.js     # Queue messages to AI server
└── apis/
    ├── facebookAxios.js
    └── instagramAxios.js
```

#### ai-server (AI & Business Logic)

**Responsibilities:**

- Process queued messages from meta-server
- Run LLM inference (OpenAI)
- Execute business logic (tools)
- Manage conversation context
- Generate responses
- Send responses back through meta-server

**Files:**

```
ai-server/
├── server.js
├── routes/
│   └── ai.js               # AI processing endpoint
├── services/
│   ├── llmService.js       # OpenAI wrapper
│   ├── contextService.js   # Conversation history
│   └── toolService.js      # Tool execution
├── lib/
│   ├── LLM.js
│   ├── toolHandlers.js
│   ├── bookingContext.js
│   └── messageProcessor.js
└── utils/
    ├── logger.js
    └── time.js
```

### Communication Flow

1. **Incoming Message:**

   ```
   Meta → meta-server → Parse → Queue → ai-server → Process → Response
   ```

2. **Outgoing Message:**
   ```
   ai-server → Generate → Send back to meta-server → Meta API → User
   ```

### API Contracts

#### meta-server → ai-server

```javascript
POST /api/v1/ai/process-message
{
  messageId: string,
  platform: "facebook" | "instagram",
  senderId: string,
  companyId: string,
  content: string,
  attachments: Array,
  timestamp: string
}

Response:
{
  success: boolean,
  response: {
    content: string,
    toolCalls?: Array
  }
}
```

### Pros & Cons

#### meta-server

✅ Pros:

- Simple, focused responsibility
- Easy to scale webhook handling
- Fast response to Meta webhooks
- Independent Meta API integration

❌ Cons:

- Added infrastructure complexity
- Network latency between services
- More deployment surfaces

#### ai-server

✅ Pros:

- Independent AI processing scaling
- LLM changes isolated
- Can serve other platforms (WhatsApp, SMS)
- Testable business logic

❌ Cons:

- Additional service management
- Need message queue/async handling

## Alternative: Option B - Keep Unified, Add Message Queue

Instead of splitting servers, keep unified but add internal queue:

```
meta-bot/
├── server.js
├── routes/
├── controllers/
├── queue/
│   ├── messageQueue.js     # Internal queue
│   └── processors/
│       └── aiProcessor.js
├── lib/
└── services/
```

**Benefits:**

- Better async handling
- Can batch process messages
- Easier to split later
- Single deployment

## Recommended Approach

### For Current Scale: **Option B (Queue First)**

1. Add internal message queue (BullMQ)
2. Keep everything in one server
3. Gain async benefits without infrastructure complexity
4. Easy to split later if needed

### When to Split (Option A):

Split when you experience:

- ✅ Webhook volume > 1000/day
- ✅ Need multi-platform support
- ✅ LLM costs require separate scaling
- ✅ Team growth justifies microservices

## Implementation Priority

1. **Short term:** Add message queue (BullMQ/Redis) to current architecture
2. **Medium term:** Monitor performance and scaling needs
3. **Long term:** Split only if bottlenecks emerge

## Technologies

### Option A (Split)

- **meta-server**: Express + Meta Graph API SDK
- **ai-server**: Express + OpenAI SDK
- **Communication**: HTTP or message queue (Redis/RabbitMQ)
- **Database**: Shared MongoDB

### Option B (Queue)

- **meta-bot**: Express + BullMQ
- **Database**: MongoDB
- **Queue**: Redis (BullMQ)

## Questions to Consider

1. What's your expected message volume?
2. Do you plan to add WhatsApp, Telegram, or SMS?
3. What's your deployment infrastructure complexity tolerance?
4. Do you have DevOps support for multiple services?
5. What's the team size and structure?

## Recommendation

**Start with Option B** (internal queue), then evaluate splitting based on actual needs rather than anticipated ones.

The famous quote applies: _"Make it work, make it right, make it fast"_ - in that order.
