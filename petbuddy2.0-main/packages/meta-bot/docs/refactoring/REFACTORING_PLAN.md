# Meta-Bot Refactoring Plan

## Executive Summary

This document outlines the comprehensive refactoring plan for the meta-bot package to improve code organization, eliminate duplication, fix bugs, and enhance maintainability.

## Current Issues

### 1. Code Duplication

#### Duplicate Message Detection
- **Issue**: Both `facebook.controller.js` and `instagram.controller.js` implement identical `isDuplicateMessage()` functions
- **Impact**: ~80 lines of duplicated code, inconsistent behavior risk
- **Existing Solution**: `core/duplicateDetector.js` class exists but is **not being used**
- **Fix**: Replace inline duplicate detection with `DuplicateDetector` class

#### Platform-Specific Logic
- **Issue**: Similar message saving, contact creation, AI processing across both controllers
- **Impact**: 1,359 + 995 = 2,354 lines with significant overlap
- **Existing Solution**: `core/platformHelpers.js` partially addresses this
- **Fix**: Extract more shared logic to platformHelpers, create base controller class

### 2. Oversized Files

| File | Lines | Status | Target |
|------|-------|--------|--------|
| `lib/toolHandlers.js` | 2,090 | Critical | Split into modules |
| `controllers/instagram.controller.js` | 1,359 | High | Extract to helpers |
| `controllers/facebook.controller.js` | 995 | High | Extract to helpers |

### 3. Architecture Issues

#### Tight Coupling
- `lib/toolHandlers.js:9` imports from `../../backend/src/services/bookingService.js`
- Creates direct dependency on backend package structure
- Should use shared package or service interface

#### Unused Code
- `core/duplicateDetector.js` - fully implemented but never imported
- Multiple helper functions in `platformHelpers.js` not fully utilized

#### Mixed Concerns
- Controllers handle: webhook parsing, validation, duplicate detection, message saving, AI processing, response sending
- Should be separated into: handlers → validators → services → processors

### 4. Known Bugs & TODOs

1. **Missing Feature** ([humanDetector.js:144](langgraph/nodes/humanDetector.js#L144))
   ```javascript
   // TODO: Send actual notification to admin
   ```

2. **Missing Awaits** (potential race conditions)
   - Review async functions without await in call chains

3. **Null Safety**
   - Add null checks for company lookups before accessing properties
   - Validate webhook data structure before processing

### 5. Documentation Sprawl

**Root Level (6 files)**
- BUFFER_REFACTORING.md
- CHANGELOG_BOOKING_CONFLICTS.md
- DYNAMIC_DELAY_FEATURE.md
- GEMINI_QUICK_START.md
- INDEX_FIX_SUMMARY.md
- README.md

**docs/ Directory (30+ files)**
- Multiple archived refactoring summaries
- Duplicate guides and troubleshooting docs
- Should consolidate and organize

## Proposed Structure

### New Directory Layout

```
packages/meta-bot/
├── src/                          # All source code
│   ├── server/                   # Server initialization
│   │   ├── app.js               # Express app setup
│   │   ├── server.js            # Server startup & shutdown
│   │   └── middleware.js        # Global middleware
│   │
│   ├── routes/                   # Route definitions
│   │   ├── index.js             # Main router
│   │   ├── webhooks.js          # Webhook routes
│   │   ├── health.js            # Health & test endpoints
│   │   └── operator.js          # Manual operator routes
│   │
│   ├── controllers/              # Request handlers (thin layer)
│   │   ├── facebook.controller.js    (reduced to ~200 lines)
│   │   ├── instagram.controller.js   (reduced to ~200 lines)
│   │   ├── base.controller.js        (shared controller logic)
│   │   └── manual/
│   │       ├── facebook.js
│   │       └── instagram.js
│   │
│   ├── services/                 # Business logic
│   │   ├── message/
│   │   │   ├── message.service.js
│   │   │   ├── duplicate-detector.service.js
│   │   │   └── buffer.service.js
│   │   ├── contact/
│   │   │   ├── contact.service.js
│   │   │   └── platform-adapter.js
│   │   ├── company/
│   │   │   └── company.service.js
│   │   └── ai/
│   │       ├── processor.service.js
│   │       └── langgraph-client.js
│   │
│   ├── lib/                      # Core business logic
│   │   ├── ai/
│   │   │   ├── llm.js
│   │   │   ├── image-model.js
│   │   │   └── tools/           # Tool handlers split by domain
│   │   │       ├── index.js
│   │   │       ├── datetime.js       (~100 lines)
│   │   │       ├── customer.js       (~200 lines)
│   │   │       ├── appointments.js   (~800 lines)
│   │   │       ├── services.js       (~300 lines)
│   │   │       ├── availability.js   (~400 lines)
│   │   │       └── pets.js          (~200 lines)
│   │   ├── booking/
│   │   │   ├── booking-context.js
│   │   │   ├── booking-hold-manager.js
│   │   │   └── appointment-helpers.js
│   │   └── auth/
│   │       ├── authorization.js
│   │       └── database-wrapper.js
│   │
│   ├── core/                     # Core utilities (framework-level)
│   │   ├── buffer-manager.js
│   │   ├── duplicate-detector.js
│   │   ├── constants.js
│   │   └── platform-helpers.js
│   │
│   ├── integrations/             # External API clients
│   │   ├── facebook/
│   │   │   ├── messenger.client.js  (renamed from facebookAxios)
│   │   │   └── message-sender.js    (from middleware)
│   │   ├── instagram/
│   │   │   ├── messaging.client.js  (renamed from instagramAxios)
│   │   │   └── message-sender.js    (from middleware)
│   │   └── backend/
│   │       └── api.client.js        (renamed from sendToServer)
│   │
│   ├── langgraph/                # AI agent system (keep as-is, well organized)
│   │   ├── controller.js
│   │   ├── graph.js
│   │   ├── nodes/
│   │   ├── state/
│   │   ├── tools/
│   │   └── utils/
│   │
│   ├── models/                   # Database models
│   │   └── CompanyIntegration.js
│   │
│   ├── config/                   # Configuration
│   │   ├── env.js
│   │   └── database.js
│   │
│   └── utils/                    # Shared utilities
│       ├── logger.js
│       ├── delay.js
│       ├── time.js
│       ├── metrics.js
│       ├── pii-detection.js
│       ├── webhook-verifier.js
│       ├── openai-tools.js
│       └── realtime-appointments.js
│
├── tests/                        # All tests in one place
│   ├── unit/
│   │   ├── services/
│   │   ├── controllers/
│   │   ├── lib/
│   │   └── core/
│   ├── integration/
│   └── e2e/
│
├── scripts/                      # Utility scripts
│   ├── check-indexes.js
│   ├── ensure-indexes.js
│   └── verify/
│       ├── buffer-fix.js
│       └── tool-enforcement.js
│
├── docs/                         # Documentation (consolidated)
│   ├── README.md                # Main package documentation
│   ├── ARCHITECTURE.md          # System architecture
│   ├── API.md                   # API documentation
│   ├── CHANGELOG.md             # Consolidated changelog
│   ├── features/
│   │   ├── buffer-system.md
│   │   ├── hybrid-ai.md
│   │   └── booking-conflicts.md
│   ├── guides/
│   │   ├── setup.md
│   │   ├── development.md
│   │   ├── deployment.md
│   │   ├── logging.md
│   │   └── troubleshooting.md
│   └── archive/                 # Historical docs
│
├── logs/                        # Runtime logs
├── .env.example
├── .gitignore
├── Dockerfile
├── package.json
└── README.md                    # Project overview
```

## Refactoring Steps

### Phase 1: Immediate Fixes (No Breaking Changes)

#### 1.1 Use DuplicateDetector Class
- Replace inline `isDuplicateMessage()` in both controllers
- Import and use `core/duplicateDetector.js`
- Remove duplicate implementation

#### 1.2 Extract Shared Controller Logic
- Create `controllers/base.controller.js` with:
  - Common webhook parsing
  - Shared validation logic
  - Error handling patterns
- Update Facebook and Instagram controllers to extend base

#### 1.3 Fix Known Bugs
- Implement admin notification in `langgraph/nodes/humanDetector.js:144`
- Add null checks before company property access
- Review and add missing `await` keywords

#### 1.4 Add Missing Null Checks
```javascript
// Before:
const company = await getCompanyByFb(fbPageId);
const delayMs = company.bot.responseDelay.standard;  // Can fail if company is null

// After:
const company = await getCompanyByFb(fbPageId);
if (!company) {
  logger.error('Company not found', { fbPageId });
  return res.status(404).json({ error: 'Company not found' });
}
const delayMs = company.bot?.responseDelay?.standard || RESPONSE_DELAY_MS;
```

### Phase 2: Split Oversized Files

#### 2.1 Split toolHandlers.js (2,090 lines → ~7 modules)

**New structure:**
```
lib/ai/tools/
├── index.js                 # Export all handlers
├── datetime.js             # get_current_datetime (~100 lines)
├── customer.js             # Customer info tools (~200 lines)
├── appointments.js         # Book/modify/cancel (~800 lines)
├── services.js            # Get services/categories (~300 lines)
├── availability.js        # Check availability (~400 lines)
└── pets.js               # Pet management (~200 lines)
```

**Migration:**
```javascript
// Before:
import { createToolHandlers } from "../lib/toolHandlers.js";

// After:
import { createToolHandlers } from "../lib/ai/tools/index.js";
// No breaking change - same export
```

#### 2.2 Extract Controller Helpers

Create focused helper modules:
```
services/message/
├── webhook-parser.js       # Parse webhook events
├── attachment-processor.js # Handle attachments
└── response-builder.js     # Build responses

services/contact/
├── facebook-contact.js     # Facebook contact management
└── instagram-contact.js    # Instagram contact management
```

### Phase 3: Directory Reorganization

#### 3.1 Create src/ Directory
- Move all source code into `src/`
- Update imports with path aliases
- Update package.json main entry point

#### 3.2 Consolidate Tests
- Move all `__tests__/` directories to top-level `tests/`
- Organize by test type: unit, integration, e2e

#### 3.3 Reorganize Integrations
- Rename `apis/` to `integrations/`
- Group by platform: facebook/, instagram/, backend/
- Rename files for clarity:
  - `facebookAxios.js` → `facebook/messenger.client.js`
  - `instagramAxios.js` → `instagram/messaging.client.js`
  - `sendToServer.js` → `backend/api.client.js`

#### 3.4 Move Middleware to Services
- Move `facebookMsgSender.js` → `integrations/facebook/message-sender.js`
- Move `instagramMsgSender.js` → `integrations/instagram/message-sender.js`

### Phase 4: Documentation Cleanup

#### 4.1 Consolidate Root Documentation
- Keep only `README.md` in root
- Move feature docs:
  - `BUFFER_REFACTORING.md` → `docs/features/buffer-system.md`
  - `DYNAMIC_DELAY_FEATURE.md` → append to `docs/features/buffer-system.md`
  - `GEMINI_QUICK_START.md` → `docs/features/hybrid-ai.md`
  - `CHANGELOG_BOOKING_CONFLICTS.md` → `docs/CHANGELOG.md`
  - `INDEX_FIX_SUMMARY.md` → `docs/archive/`

#### 4.2 Create Master Documentation
- `docs/README.md` - Documentation index
- `docs/ARCHITECTURE.md` - System architecture
- `docs/CHANGELOG.md` - Consolidated changelog
- Merge similar guides in `docs/guides/`

### Phase 5: Architecture Improvements

#### 5.1 Decouple from Backend Package
```javascript
// Before (tight coupling):
import { BookingService } from "../../backend/src/services/bookingService.js";

// After (use shared package or HTTP API):
import { BookingService } from "@petbuddy/shared";
// OR use HTTP client to backend API
```

#### 5.2 Create Service Layer
- Move business logic from controllers to services
- Controllers become thin request handlers
- Services handle orchestration
- Lib handles core business rules

#### 5.3 Improve Error Handling
- Centralized error handler middleware
- Consistent error response format
- Better error logging with context

### Phase 6: Testing & Quality

#### 6.1 Add Missing Tests
- Test duplicate detector usage
- Test null safety additions
- Test refactored tool handlers

#### 6.2 Run Linting
```bash
npm run lint
```

#### 6.3 Ensure Build Passes
```bash
npm run build  # if applicable
npm test
```

## Implementation Order

1. **Quick Wins (1-2 hours)**
   - Use DuplicateDetector class
   - Add null checks
   - Fix known bugs
   - Add missing awaits

2. **File Splitting (2-3 hours)**
   - Split toolHandlers.js
   - Extract controller helpers
   - Create base controller

3. **Directory Reorganization (2-3 hours)**
   - Create src/ structure
   - Move files to new locations
   - Update all imports
   - Update package.json

4. **Documentation (1-2 hours)**
   - Consolidate docs
   - Create architecture doc
   - Update README

5. **Testing & Validation (1-2 hours)**
   - Run tests
   - Fix any issues
   - Run linting
   - Manual testing

**Total Estimated Time: 7-12 hours**

## Breaking Changes

### Import Path Changes

All imports will need updating after directory reorganization:

```javascript
// Before:
import { handlerFacebook } from "./controllers/facebook.controller.js";
import { createToolHandlers } from "./lib/toolHandlers.js";
import { getCompanyByFb } from "./services/company.service.js";

// After:
import { handlerFacebook } from "./src/controllers/facebook.controller.js";
import { createToolHandlers } from "./src/lib/ai/tools/index.js";
import { getCompanyByFb } from "./src/services/company/company.service.js";
```

**Mitigation:** Use path aliases in package.json or jsconfig.json:
```json
{
  "imports": {
    "#controllers/*": "./src/controllers/*",
    "#services/*": "./src/services/*",
    "#lib/*": "./src/lib/*",
    "#core/*": "./src/core/*"
  }
}
```

## Success Metrics

- [ ] File count in root directory: 6 → 3 (package.json, README.md, Dockerfile)
- [ ] Largest controller file: 1,359 lines → <300 lines
- [ ] Largest lib file: 2,090 lines → <500 lines
- [ ] Code duplication: ~80 lines eliminated
- [ ] All tests passing
- [ ] Zero linting errors
- [ ] Documentation organized and consolidated

## Rollback Plan

1. Create feature branch: `git checkout -b refactor/meta-bot-restructure`
2. Commit after each phase
3. If issues arise, revert specific commits
4. Main branch remains stable throughout

## Post-Refactoring

### Benefits
- ✅ Clear separation of concerns
- ✅ Easier to test individual components
- ✅ Reduced file sizes (better IDE performance)
- ✅ Less code duplication
- ✅ Better documentation organization
- ✅ Easier onboarding for new developers

### Maintenance
- Update this plan as refactoring progresses
- Document any deviations from the plan
- Create migration guide for team members
