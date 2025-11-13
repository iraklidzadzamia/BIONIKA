# PetBuddy Backend Architecture Summary

## 1. FRAMEWORK & SERVER
- **Framework:** Express.js 4.18.2
- **Node Version:** >= 18.0.0
- **HTTP Server:** Native Node.js `http` module (used with Socket.io)
- **Server Entry Point:** `server.js` with graceful shutdown handling

### Key Express Middleware Stack
- **helmet** - Security headers
- **morgan** - HTTP request logging
- **cors** - CORS middleware with environment-specific origins
- **express-mongo-sanitize** - NoSQL injection protection
- **body-parser** - Built-in JSON/URL-encoded parsing (10MB limit)
- **cookie-parser** - Cookie handling

---

## 2. DATABASE & PERSISTENCE
- **Database:** MongoDB 4+ (via Mongoose 8.0.3)
- **Connection Pool:** Max 10 connections
- **Timeouts:** 
  - Server selection: 5 seconds
  - Socket timeout: 45 seconds
- **Connection String:** From environment variable `MONGODB_URI`

### Models Structure
```
/src/models/
├── AIPrompt.js
├── BookingHold.js
├── CompanyIntegration.js - Integration tokens & credentials
├── LoginAttempt.js
├── Media.js
├── RefreshToken.js
├── Resource.js
├── ResourceReservation.js
├── ResourceType.js
├── StaffSchedule.js
├── TimeOff.js
```

### Shared Models (from @petbuddy/shared)
- **Message** - For all message data (platform-agnostic)
- **Contact** - Customer/contact information with social media IDs
- **Company** - Organization and integration data

### Database Patterns
- Uses MongoDB aggregation pipelines for complex queries
- Lean queries for read-heavy operations
- Pagination support with skip/limit
- Indexed fields: created_at, contact_id, company_id, platform

---

## 3. MESSAGE/EVENT HANDLING PATTERNS

### Real-Time Event System (Socket.io)
**Socket.io Version:** 4.8.1
- Listening on same HTTP server as Express
- CORS configured for frontend communication
- Ping interval: 25 seconds, timeout: 60 seconds

#### Socket.io Events
1. **Connection Events**
   - `connection` - New client connected (auto-join company room)
   - `disconnect` - Client disconnection

2. **Room Management**
   - `conversation:join` - Join conversation-specific room
   - `conversation:leave` - Leave conversation room
   - Auto-join: `company:{companyId}` room on connection

3. **Typing Indicators**
   - `typing:start` - User started typing
   - `typing:stop` - User stopped typing
   - `typing:indicator` - Emitted to others in conversation

4. **Message Events**
   - `message:new` - New message received (broadcast to company room)
   - `message:read` - Mark messages as read
   - `message:status` - Message status updates (read/delivered)

#### Socket Message Flow
```
Message Created (via REST API)
  → Save to MongoDB
  → Emit socket event: message:new
    └── Broadcast to company:{companyId} room
    └── Includes: conversationId, message data
```

### REST API Message Routes
**Base Path:** `/api/v1/messages`

- `POST /` - Add new message
  - Handles message creation and optional forwarding to social platforms
  - Falls back to local storage if forwarding fails
  - Validates: company_id, contact_id, role, platform, direction

- `POST /instagram` - Get Instagram customers (with pagination)
- `POST /` - Get messages by contact (filters by platform)
- `GET /:id` - Get single message
- `PATCH /` - Update message
- `DELETE /` - Delete message
- `PUT /mark-read` - Mark messages as read

### Message Controller Pattern
```javascript
// Key Pattern: Message forwarding with fallback
1. Attempt to forward to Meta Bot (if operator + outbound + social)
2. Save to MongoDB regardless of forwarding result
3. Emit socket event for real-time updates
4. Return response with forwarding status
```

**Message Validation:**
- Company ID and Contact ID (required, valid MongoDB ObjectId)
- Role: 'user', 'operator', 'assistant'
- Platform: 'instagram', 'facebook', 'telegram', 'whatsapp', 'web', 'other'
- Direction: 'inbound', 'outbound'
- Content: Optional, max 5000 characters
- Attachments: Array of {type, url, file_description}

---

## 4. ASYNC PROCESSING & QUEUE SYSTEMS

### Current Implementation
**No external queue system** (Bull, RabbitMQ, Kafka, Redis)
- Using Node.js native `setInterval` and `setTimeout` for scheduled jobs

### Existing Jobs
1. **Token Refresh Job** (`/src/jobs/tokenRefreshJob.js`)
   - Runs every 24 hours (86,400,000 ms)
   - Initial run after 10 seconds on startup
   - Refreshes expiring Facebook access tokens
   - Fallback mechanism for token expiration handling

2. **Message Forwarding Pattern**
   - Synchronous call to Meta Bot server (via axios)
   - 10-second timeout
   - HTTP POST to Meta Bot endpoints:
     - `/chat/manual-facebook`
     - `/chat/manual-instagram`
   - Fallback: Save to local DB if Meta Bot unreachable

### Async Patterns
- Controllers use `async/await`
- Error handling with try/catch
- Graceful degradation (continue on failure, log warnings)
- Non-blocking socket emission (doesn't fail request on socket error)

---

## 5. LOGGING & MONITORING

### Logger Setup
**Library:** Winston 3.11.0

#### Log Levels
- Development: Console + file output
- Production: File-only output
- Configurable via `LOG_LEVEL` env variable

#### Log Destinations
```
/logs/
├── error.log - Error level logs
└── combined.log - All logs
```

#### Log Format
- Timestamp, service name, error stack traces
- JSON structured logging for parsing
- Default metadata: `{ service: 'petbuddy-backend' }`

#### Logging Usage
- Request logging via morgan (combined format)
- Service-level logging for business logic
- Error logging with full context
- Health check endpoint at `/health`

---

## 6. TESTING FRAMEWORK

### Framework
- **Jest** 29.7.0
- **Supertest** 6.3.3 - HTTP assertion library
- **Node Testing:** Using `NODE_OPTIONS=--experimental-vm-modules` for ES modules

### Test Configuration
```javascript
// jest.config.js
- Test environment: node
- Test match: **/src/tests/**/*.test.js
- Coverage collection from src/**
- Setup file: /src/tests/setup.js
```

### Test Setup Pattern
```javascript
// Environment variables pre-configured for testing
- NODE_ENV: 'test'
- MongoDB URI: Local test database
- JWT secrets: Dummy values for testing
```

### Existing Tests
1. **MessageForwarding Service Tests** (`messageForwarding.service.test.js`)
   - Mock axios for HTTP calls
   - Mock logger
   - Test success and error scenarios
   - Network error handling (ECONNREFUSED, ETIMEDOUT)
   - HTTP status code handling (4xx, 5xx)

2. **Test Patterns**
   - Jest mocking for dependencies
   - Async/await test support
   - Error message verification
   - Logger call verification

### Scripts
```bash
npm test - Run all tests
npm run test:watch - Watch mode
npm run test:coverage - Generate coverage reports
npm run lint - ESLint validation
npm run lint:fix - Auto-fix linting issues
npm run format - Prettier formatting
```

---

## 7. INFRASTRUCTURE & DEPLOYMENT

### Environment Variables
```
NODE_ENV=development|production|test
PORT=4000
MONGODB_URI=mongodb://...
JWT_ACCESS_SECRET=(min 32 chars)
JWT_REFRESH_SECRET=(min 32 chars)
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=7d
CORS_ORIGINS=http://localhost:3000,...
FRONTEND_URL=http://localhost:3000
BCRYPT_SALT_ROUNDS=12
INTERNAL_SERVICE_API_KEY=(min 32 chars)
LOG_LEVEL=info|debug|warn|error
FACEBOOK_APP_ID
FACEBOOK_APP_SECRET
FACEBOOK_GRAPH_VERSION=v18.0
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI
META_BOT_BASE_URL=http://localhost:5001
```

### Security Features
- Helmet security headers
- CORS with configurable origins
- BCRYPT password hashing (salt rounds: 12)
- JWT authentication (access + refresh tokens)
- Express rate limiting on message endpoints
- NoSQL injection protection
- Account lockout mechanism
- CSRF protection (disabled by default, can be enabled)

### Graceful Shutdown
- Listens to SIGTERM and SIGINT signals
- Closes HTTP server first
- Closes MongoDB connection
- 30-second timeout before forced exit
- Logs all shutdown events

---

## 8. KEY ARCHITECTURAL DECISIONS

### Synchronous vs Asynchronous
- **Synchronous:** Message saving and REST responses
- **Asynchronous:** Socket.io events (non-blocking)
- **Scheduled Jobs:** Native setInterval (future: migrate to Bull/Bee-Queue)

### Error Handling Strategy
- Try/catch in controllers for error capture
- Global error handler middleware
- Graceful degradation (e.g., socket emit failure doesn't fail request)
- Detailed error logging with context

### Message Forwarding Architecture
```
Frontend/API → Save to MongoDB → Emit Socket Event
                           ↓
                    Attempt Meta Bot Forwarding
                    (Non-blocking, best-effort)
                           ↓
                    Fall back to local storage
```

### Room-based Broadcasting
- Company-level rooms: Real-time updates for all staff
- Conversation-level rooms: Specific conversation updates
- Efficient filtering using Socket.io rooms

---

## 9. FUTURE IMPROVEMENTS NEEDED

### Recommended
1. **Message Queue System**
   - Implement Bull + Redis for reliable job processing
   - Handle message forwarding retries
   - Decouple external service calls from request cycle

2. **Event Sourcing**
   - Consider event-driven architecture for audit trails
   - Message delivery status tracking

3. **Caching Layer**
   - Redis for session/token caching
   - Conversation history caching

4. **Monitoring & Observability**
   - Prometheus metrics
   - Distributed tracing (OpenTelemetry)
   - Performance monitoring

5. **API Versioning**
   - Currently v1, document deprecation strategy

---

## 10. DIRECTORY STRUCTURE

```
packages/backend/
├── server.js - Entry point
├── src/
│   ├── app.js - Express app setup
│   ├── config/ - Configuration files
│   │   ├── env.js - Environment validation
│   │   ├── database.js - MongoDB connection
│   │   └── cors.js - CORS setup
│   ├── controllers/ - Request handlers
│   │   ├── message.controller.js
│   │   ├── socket.controller.js
│   │   ├── conversation.controller.js
│   │   └── ... (other controllers)
│   ├── middleware/ - Express middleware
│   │   ├── auth.js - JWT authentication
│   │   ├── rbac.js - Role-based access control
│   │   ├── errorHandler.js
│   │   ├── validate.js - Request validation
│   │   └── ... (other middleware)
│   ├── models/ - Mongoose schemas
│   ├── routes/ - API route definitions
│   ├── services/ - Business logic
│   │   ├── messageForwarding.service.js
│   │   ├── bookingService.js
│   │   └── ... (other services)
│   ├── socket/ - Socket.io setup
│   │   ├── socketServer.js
│   │   ├── socketAuth.js
│   │   └── events/
│   │       ├── messageEvents.js
│   │       └── appointmentEvents.js
│   ├── jobs/ - Scheduled jobs
│   ├── utils/ - Utility functions
│   │   ├── logger.js
│   │   ├── tokenRefresh.js
│   │   └── ... (other utilities)
│   ├── tests/ - Test files
│   ├── scripts/ - Migration/utility scripts
│   └── seed/ - Database seeding
├── jest.config.js
└── package.json
```

