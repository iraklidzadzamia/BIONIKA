# Meta-Bot Implementation Analysis - Documentation Index

**Generated:** November 11, 2025  
**Scope:** Complete analysis of `/packages/meta-bot/` server implementation  
**Status:** Comprehensive analysis complete with 2 detailed documents

---

## Available Documentation

### 1. Comprehensive Analysis Document
**File:** `META_BOT_ANALYSIS.md` (45 KB, 1,576 lines)

**Contains:** Complete detailed analysis with 22 sections

**Sections:**
- Executive Summary
- Architecture Overview (directory structure)
- Entry Points & Main Server (server.js)
- Configuration System (env.js, database.js)
- Routes & API Endpoints
- Request Handling - Controllers
- AI Orchestration - LangGraph (detailed)
- Business Logic Layer (toolHandlers.js and tools)
- Service Layer (Data Access)
- Database Models
- Core Utilities (bufferManager, duplicateDetector, etc.)
- Middleware & API Clients
- Utilities (logger, webhookVerifier, time, etc.)
- Testing (14 test suites)
- Scripts (utility and verification scripts)
- Dependencies & Integrations
- Known Issues & Areas for Improvement
- Deployment & Operations
- Code Organization Highlights
- Integration Points
- Summary Statistics
- Quick Reference
- Contact & Support

**Best For:** Understanding every component in depth, architectural decisions, integration patterns

### 2. Quick Reference Guide
**File:** `META_BOT_QUICK_REFERENCE.md` (13 KB)

**Contains:** Quick lookup reference with practical information

**Sections:**
- File Locations & Purposes (organized by functionality)
- Request Flow Diagram
- Configuration Requirements (required & optional env vars)
- API Endpoints Table
- LangGraph Flow Diagram (Hybrid Mode)
- Message Processing Pipeline
- Key Features Summary
- Common Tasks (development, testing, logging)
- Tools Available
- Troubleshooting Table
- Dependencies List
- File Sizes
- Documentation Links
- Recent Changes

**Best For:** Quick lookups, finding file locations, API reference, troubleshooting

---

## Quick Navigation

### By Task

**Getting Started**
- Read: `META_BOT_QUICK_REFERENCE.md` - Configuration Requirements section
- Read: `/packages/meta-bot/README.md` - Project README
- Read: `/packages/meta-bot/.env.example` - Environment template

**Understanding Architecture**
- Read: `META_BOT_ANALYSIS.md` - Sections 1-6 (Overview through Controllers)
- Reference: `META_BOT_QUICK_REFERENCE.md` - Request Flow Diagram

**Understanding AI Orchestration**
- Read: `META_BOT_ANALYSIS.md` - Section 6 (LangGraph in detail)
- Reference: `META_BOT_QUICK_REFERENCE.md` - LangGraph Flow Diagram

**Understanding Business Logic**
- Read: `META_BOT_ANALYSIS.md` - Section 7 (Business Logic Layer)
- Source: `/packages/meta-bot/lib/toolHandlers.js` (81 KB)

**Setting Up Development**
- Read: `META_BOT_QUICK_REFERENCE.md` - Common Tasks section
- Run: `npm run dev`
- Check logs: `tail -f logs/message-flow.log`

**Running Tests**
- Read: `META_BOT_ANALYSIS.md` - Section 13 (Testing)
- Read: `META_BOT_QUICK_REFERENCE.md` - Common Tasks (Run Tests)
- Run: `npm test`

**Troubleshooting Issues**
- Reference: `META_BOT_QUICK_REFERENCE.md` - Troubleshooting Table
- Read: `/packages/meta-bot/docs/guides/TROUBLESHOOTING.md`
- Check: Logs in `logs/message-flow.log`

**Deployment**
- Read: `META_BOT_ANALYSIS.md` - Section 17 (Deployment & Operations)
- Read: `/packages/meta-bot/DEPLOYMENT_GUIDE.md`
- Check: `docker-compose` setup

---

## Component Reference

### Quick Links to Components

**Server & Configuration**
- Main server: `/packages/meta-bot/server.js` (256 lines)
- Environment config: `/packages/meta-bot/config/env.js`
- Database connection: `/packages/meta-bot/config/database.js`

**Routing & Controllers**
- Routes: `/packages/meta-bot/routes/operatorBot.routes.js`
- Facebook controller: `/packages/meta-bot/controllers/facebook.controller.js` (24 KB)
- Instagram controller: `/packages/meta-bot/controllers/instagram.controller.js`

**AI Orchestration**
- Graph definition: `/packages/meta-bot/langgraph/graph.js` (13 KB)
- Gemini agent: `/packages/meta-bot/langgraph/nodes/geminiAgent.js`
- OpenAI agent: `/packages/meta-bot/langgraph/nodes/agent.js`
- Tool executor: `/packages/meta-bot/langgraph/nodes/toolExecutor.js`

**Business Logic**
- Main tools: `/packages/meta-bot/lib/toolHandlers.js` (81 KB - REFACTORING)
- Modular tools: `/packages/meta-bot/lib/tools/`
- Booking logic: `/packages/meta-bot/lib/bookingContext.js`
- Authorization: `/packages/meta-bot/lib/authorization.js`

**Data Access**
- Company service: `/packages/meta-bot/services/company.service.js`
- Contact service: `/packages/meta-bot/services/contact.service.js`
- Message service: `/packages/meta-bot/services/message.service.js`

**Core Utilities**
- Message buffer: `/packages/meta-bot/core/bufferManager.js`
- Deduplication: `/packages/meta-bot/core/duplicateDetector.js`
- Logger: `/packages/meta-bot/utils/logger.js`

**Testing**
- All test files in:
  - `/__tests__/` - Unit tests
  - `/langgraph/__tests__/` - LangGraph tests
  - `/tests/` - Integration tests

---

## File Location Cheat Sheet

| Purpose | File |
|---------|------|
| Start here | `/server.js` |
| Environment variables | `/config/env.js` |
| Routes definition | `/routes/operatorBot.routes.js` |
| Facebook webhook | `/controllers/facebook.controller.js` |
| Instagram webhook | `/controllers/instagram.controller.js` |
| LangGraph graph | `/langgraph/graph.js` |
| Tools (main) | `/lib/toolHandlers.js` |
| Tools (modular) | `/lib/tools/` |
| Company data | `/services/company.service.js` |
| Contact data | `/services/contact.service.js` |
| Message data | `/services/message.service.js` |
| Message buffering | `/core/bufferManager.js` |
| Deduplication | `/core/duplicateDetector.js` |
| Logging | `/utils/logger.js` |
| Tests | `/__tests__/`, `/langgraph/__tests__/`, `/tests/` |

---

## Key Features at a Glance

**1. Message Buffering**
- Location: `/core/bufferManager.js`
- Waits for typing completion before responding
- 4-second configurable delay
- Prevents bot responding to message fragments

**2. Duplicate Detection**
- Location: `/core/duplicateDetector.js`
- Prevents processing same webhook twice
- Tracks last 1000 message IDs

**3. Hybrid AI Mode**
- Primary: Google Gemini (fast, cost-effective)
- Fallback: OpenAI (when Gemini misses tools)
- Location: `/langgraph/graph.js`

**4. Circuit Breaker**
- Location: `/langgraph/nodes/toolExecutor.js`
- Prevents cascading failures
- Per-company isolation

**5. Appointment Booking**
- Complex multi-step process
- Authorization checks
- Availability validation
- Temporary booking holds
- Location: `/lib/toolHandlers.js` (book_appointment tool)

---

## Configuration Reference

**Critical Required Variables:**
```env
MONGODB_URI=<database-url>
INTERNAL_SERVICE_API_KEY=<32+ chars>
VERIFY_TOKEN=<webhook-token>
FB_PAGE_ACCESS_TOKEN=<token>
INSTA_PAGE_ACCESS_TOKEN=<token>
OPENAI_API_KEY=<key> OR GEMINI_API_KEY=<key>
```

**Important Optional Variables:**
```env
RESPONSE_DELAY_MS=4000              # Buffer wait time
USE_LANGGRAPH=true                  # Enable LangGraph
USE_GEMINI=false                    # Use Gemini instead of OpenAI
ENFORCE_TOOL_USAGE=true             # Hybrid mode enforcement
```

See `META_BOT_QUICK_REFERENCE.md` - Configuration Requirements for complete list

---

## Common Commands

```bash
# Development
npm run dev                      # Start dev server

# Testing
npm test                         # Run all tests
npm test -- authorization       # Run specific test

# Database
npm run check-indexes            # Verify indexes
npm run ensure-indexes           # Create indexes

# Logs
tail -f logs/message-flow.log    # Follow logs
docker-compose logs -f meta-bot  # Docker logs

# API Testing
curl http://localhost:5001/health                    # Health check
curl http://localhost:5001/test-webhook              # Test webhook
curl http://localhost:5001/test-logs                 # Generate logs
```

See `META_BOT_QUICK_REFERENCE.md` - Common Tasks for more

---

## Architecture Overview

```
Webhook (Facebook/Instagram)
    ↓
Server.js (Express app)
    ↓
operatorBot.routes.js (routing)
    ↓
facebook.controller.js / instagram.controller.js
    ├─ Webhook verification
    ├─ Contact/Company lookup
    ├─ Message buffering
    └─ LangGraph processing
        ├─ humanDetectorNode
        ├─ geminiAgentNode (primary)
        ├─ toolExecutorNode
        ├─ agentNode (fallback)
        └─ Tool execution
            └─ lib/toolHandlers.js
    ├─ Send response
    ├─ Save to database
    └─ Emit socket event
```

See `META_BOT_QUICK_REFERENCE.md` - Request Flow Diagram for detailed flow

---

## Testing & Quality

**Test Coverage:**
- 14 test suites
- Unit tests for critical components
- Integration tests for key flows
- Circuit breaker tests
- Authorization tests
- Buffer manager tests

**Test Locations:**
- `/__tests__/` - Unit tests
- `/langgraph/__tests__/` - LangGraph tests
- `/core/__tests__/` - Core utilities tests
- `/controllers/__tests__/` - Controller tests
- `/tests/` - Integration tests

See `META_BOT_ANALYSIS.md` - Section 13 (Testing) for details

---

## Known Issues & Roadmap

**In Progress:**
- Refactoring `lib/toolHandlers.js` (81 KB) into modular tools
- Expected completion: December 2025
- Status: Phase 2 complete, Phase 3 in progress

**Planned Improvements:**
- Database query optimization
- Prometheus metrics export
- APM tracing (DataDog, New Relic)
- Load testing for buffer manager
- Increase test coverage to 80%+

See `META_BOT_ANALYSIS.md` - Section 16 (Known Issues) for details

---

## Additional Resources

### In Project
- `/packages/meta-bot/README.md` - Project overview
- `/packages/meta-bot/docs/INDEX.md` - Documentation index
- `/packages/meta-bot/docs/HYBRID_SETUP_GUIDE.md` - Hybrid AI setup
- `/packages/meta-bot/docs/guides/TROUBLESHOOTING.md` - Troubleshooting
- `/packages/meta-bot/docs/refactoring/REFACTORING_PLAN.md` - Future work

### Generated Documents
- `META_BOT_ANALYSIS.md` - This comprehensive analysis
- `META_BOT_QUICK_REFERENCE.md` - Quick reference guide
- `META_BOT_DOCUMENTATION_INDEX.md` - This file

---

## Support & Questions

**For detailed component information:**
- See `META_BOT_ANALYSIS.md` for specific section
- Check source code comments

**For quick lookups:**
- Use `META_BOT_QUICK_REFERENCE.md`

**For file locations:**
- Use "File Location Cheat Sheet" in this document

**For troubleshooting:**
- See `META_BOT_QUICK_REFERENCE.md` - Troubleshooting Table
- Check `/packages/meta-bot/docs/guides/TROUBLESHOOTING.md`

**For API reference:**
- See `META_BOT_QUICK_REFERENCE.md` - API Endpoints Table

**For deployment:**
- See `META_BOT_ANALYSIS.md` - Section 17 (Deployment & Operations)

---

**Document Version:** 1.0  
**Last Updated:** November 11, 2025  
**Analysis Scope:** Complete `/packages/meta-bot/` implementation  
**Status:** Analysis Complete
