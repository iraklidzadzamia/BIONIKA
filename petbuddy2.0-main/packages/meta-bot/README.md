# Meta-Bot - Facebook & Instagram AI Bot

AI-powered customer service bot for Facebook Messenger and Instagram Direct Messages.

## Features

- 🤖 **AI-Powered Responses** - Uses LangGraph + OpenAI for intelligent conversations
- 📱 **Multi-Platform** - Supports both Facebook Messenger and Instagram DMs
- 💬 **Message Buffering** - Handles rapid user messages gracefully
- ⏰ **Working Hours** - Configurable bot active hours
- 🔄 **Auto-Suspension** - Automatic bot suspension when humans reply
- 📊 **Comprehensive Logging** - Structured logging for debugging and monitoring
- 🔌 **Real-time Updates** - Socket.io integration for live message updates

## Architecture

```
meta-bot/
├── apis/                   # API clients
│   ├── facebookAxios.js    # Facebook API client
│   ├── instagramAxios.js   # Instagram API client
│   └── sendToServer.js     # Backend API client
│
├── core/                   # Shared business logic
│   ├── bufferManager.js    # Message buffering for rapid typing
│   ├── constants.js        # Shared constants
│   ├── duplicateDetector.js # Prevent duplicate message processing
│   └── platformHelpers.js  # Shared helper functions
│
├── controllers/            # Request handlers
│   ├── facebook.controller.js
│   ├── instagram.controller.js
│   ├── facebookManualOperator.controllers.js
│   └── instagramManualOperator.controllers.js
│
├── langgraph/             # AI orchestration
│   ├── controller.js      # Main entry point
│   ├── graph.js           # State graph definition
│   ├── nodes/             # Graph nodes (agent, toolExecutor, humanDetector)
│   ├── state/             # State schema
│   └── tools/             # Available tools
│
├── lib/                   # AI utilities
│   ├── tools/             # Modular tool handlers (NEW - Nov 2025)
│   │   ├── datetime.js    # DateTime tools
│   │   ├── customer.js    # Customer info tools
│   │   └── index.js       # Barrel export
│   ├── LLM.js             # LLM wrapper
│   ├── imageModel.js      # Image analysis
│   ├── toolHandlers.js    # Legacy tool implementations (being refactored)
│   └── bookingContext.js  # Booking context utilities
│
├── services/              # Business logic
│   ├── company.service.js
│   ├── contact.service.js
│   └── message.service.js
│
├── middlewares/           # Platform API clients
│   ├── facebookMsgSender.js
│   └── instagramMsgSender.js
│
├── utils/                 # Utilities
│   ├── logger.js          # Structured logging
│   ├── metrics.js         # Tool metrics tracking
│   ├── time.js            # Time/timezone helpers
│   ├── webhookVerifier.js # Webhook verification
│   ├── delay.js           # Delay helpers
│   ├── openaiTools.js     # OpenAI tool definitions
│   └── piiDetection.js    # PII detection
│
├── config/               # Configuration
│   ├── env.js            # Environment variables
│   └── database.js       # MongoDB connection
│
├── docs/                 # Documentation
│   ├── INDEX.md          # 📖 Documentation index (START HERE)
│   ├── refactoring/      # Current refactoring work
│   ├── features/         # Feature-specific docs
│   ├── guides/           # User guides
│   └── archive/          # Old documentation
│
├── models/              # Mongoose models
│   └── CompanyIntegration.js
│
├── routes/              # API routes
│   └── operatorBot.routes.js
│
├── scripts/             # Utility scripts
│   └── check-facebook-integration.js
│
└── server.js            # Express server
```

## Setup

### Prerequisites

- Node.js >= 18.0.0
- MongoDB
- Facebook Page Access Token
- Instagram Page Access Token
- OpenAI API Key

### Installation

```bash
cd packages/meta-bot
npm install
```

### Configuration

Copy `.env.example` to `.env` and configure:

```env
# Server
NODE_ENV=development
META_BOT_PORT=5001

# Database
MONGODB_URI=mongodb://localhost:27017/petbuddy

# Backend Integration
BACKEND_API_URL=http://localhost:3000
INTERNAL_SERVICE_API_KEY=your-secure-api-key

# Security
VERIFY_TOKEN=your-webhook-verify-token

# Facebook
FB_PAGE_ACCESS_TOKEN=your-facebook-token

# Instagram
INSTA_PAGE_ACCESS_TOKEN=your-instagram-token

# OpenAI
OPENAI_API_KEY=sk-your-openai-key
CHAT_MODEL=gpt-4o
IMAGE_MODEL=gpt-4o

# Features
USE_LANGGRAPH=true
RESPONSE_DELAY_MS=4000
```

## Running

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## API Endpoints

### Webhooks
- `GET /chat/facebook` - Facebook webhook verification
- `POST /chat/facebook` - Facebook webhook events
- `GET /chat/instagram` - Instagram webhook verification
- `POST /chat/instagram` - Instagram webhook events

### Manual Messaging
- `POST /chat/manual-facebook` - Send Facebook message manually
- `POST /chat/manual-instagram` - Send Instagram message manually

### Health & Monitoring
- `GET /health` - Health check
- `GET /test-logs` - Generate test logs (development only)

## Key Components

### Buffer Manager
Handles rapid user messages by buffering and waiting for the user to finish typing before responding.

### Duplicate Detector
Prevents processing the same webhook message multiple times (Facebook/Instagram can send duplicates).

### Platform Helpers
Shared functions for:
- Saving messages to database
- Emitting socket events
- Handling token errors
- Managing bot suspensions
- Processing attachments

### LangGraph Integration
Uses LangGraph for intelligent multi-step conversations with tool calling capabilities.

## Logging

All logs are structured and written to:
- Console (development)
- `logs/message-flow.log` (production)

Log categories:
- `incoming` - Incoming webhooks/messages
- `processing` - Processing steps
- `outgoing` - Outgoing messages
- `llm` - LLM/AI operations
- `warning` - Non-critical issues
- `error` - Errors and exceptions

View logs:
```bash
# Docker
docker-compose logs -f meta-bot

# Local
tail -f logs/message-flow.log
```

## Development

### Code Style
- ES6+ modules
- Async/await
- Structured logging (no console.log)
- Comprehensive error handling

### Adding a New Platform

1. Create platform API client in `middlewares/`
2. Create controller in `controllers/`
3. Add routes in `routes/operatorBot.routes.js`
4. Reuse shared logic from `core/`

## Recent Updates (November 2025)

### ✅ Phase 1 & 2 Refactoring Complete

**What Changed:**
- ✅ **Eliminated Duplicate Code** - Removed 80 lines of duplicated message detection logic
- ✅ **Fixed Critical Bug** - Admin notifications now actually send (was only logging before)
- ✅ **Started Modularization** - Extracted 4 tools into focused modules
- ✅ **100% Backward Compatible** - Zero breaking changes, all existing code still works

**New Structure:**
- `lib/tools/` - New modular tool handler directory
- `docs/refactoring/` - Complete refactoring documentation
- `docs/features/` - Feature-specific documentation
- Cleaner root directory (only README.md now)

**Documentation:**
- 📖 **[Documentation Index](docs/INDEX.md)** - Find what you need quickly
- 🔄 **[Refactoring Complete](docs/refactoring/REFACTORING_COMPLETE.md)** - Comprehensive summary
- 📋 **[Refactoring Plan](docs/refactoring/REFACTORING_PLAN.md)** - Future work roadmap

**For Developers:**
- Tool handlers are being modularized for better maintainability
- Use `lib/tools/index.js` for tool imports (old path still works)
- See [Refactoring Plan](docs/refactoring/REFACTORING_PLAN.md) for contribution guidelines

## Documentation

📖 **Start here**: [Documentation Index](docs/INDEX.md)

Quick links:
- [Setup Guide](docs/HYBRID_SETUP_GUIDE.md) - Complete setup instructions
- [Logging Guide](docs/guides/LOGGING_GUIDE.md) - How to use logging
- [Troubleshooting](docs/guides/TROUBLESHOOTING.md) - Common issues
- [Refactoring Status](docs/refactoring/REFACTORING_COMPLETE.md) - Recent changes

## Troubleshooting

See [docs/guides/TROUBLESHOOTING.md](docs/guides/TROUBLESHOOTING.md) for detailed troubleshooting.

Common issues:
- **Admin notifications not working?** - Check environment variables (see refactoring docs)
- **Duplicate messages?** - Now handled by DuplicateDetector class
- **Logs not showing?** - See [View Logs Guide](docs/guides/VIEW_LOGS.md)

## Contributing

When working on this codebase:
1. Read [Refactoring Plan](docs/refactoring/REFACTORING_PLAN.md) for coding standards
2. Use structured logging (see [Logging Guide](docs/guides/LOGGING_GUIDE.md))
3. Maintain backward compatibility
4. Update documentation

## License

MIT
