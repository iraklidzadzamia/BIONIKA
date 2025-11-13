# PetBuddy Backend - Tech Stack Quick Reference

## Core Stack
| Layer | Technology | Version |
|-------|-----------|---------|
| **Framework** | Express.js | 4.18.2 |
| **Runtime** | Node.js | >= 18.0.0 |
| **Database** | MongoDB | 4+ (via Mongoose 8.0.3) |
| **Real-Time** | Socket.io | 4.8.1 |
| **Testing** | Jest | 29.7.0 |
| **HTTP Client** | Axios | 1.11.0 |
| **Logging** | Winston | 3.11.0 |

## Security Libraries
| Feature | Library | Purpose |
|---------|---------|---------|
| **Headers** | helmet | 7.1.0 | Security headers |
| **CORS** | cors | 2.8.5 | Cross-origin requests |
| **Passwords** | bcrypt | 5.1.1 | Hash & salt passwords |
| **Auth Tokens** | jsonwebtoken | 9.0.2 | JWT generation/validation |
| **Input Sanitization** | express-mongo-sanitize | 2.2.0 | NoSQL injection prevention |
| **Rate Limiting** | express-rate-limit | 7.1.5 | Request throttling |

## Message Processing Pattern

### Current Flow
```
REST API Call (POST /api/v1/messages)
  ↓
[Validation] - Company/Contact IDs, Role, Platform, Direction
  ↓
[Try Message Forwarding] - If operator + outbound + Facebook/Instagram
  ├─ Call Meta Bot server (10s timeout)
  └─ Best-effort delivery (errors logged, not critical)
  ↓
[Save to MongoDB] - Regardless of forwarding result
  ↓
[Emit Socket Event] - Real-time update to connected clients
  ├─ Broadcast to company:{companyId} room
  └─ Include conversationId and full message data
  ↓
[Return Response] - With message data and forwarding status
```

### Socket.io Broadcasting
```
Rooms:
  - company:{companyId}  → All staff members
  - conversation:{conversationId}  → Specific conversation
  
Events Emitted:
  - message:new         → Full message object
  - message:status      → Read/delivered status
  - typing:indicator    → Typing notifications
```

## Database Schema Highlights

### Message Schema (from @petbuddy/shared)
```javascript
{
  company_id: ObjectId,
  contact_id: ObjectId,
  role: String (user | operator | assistant),
  platform: String (instagram | facebook | telegram | whatsapp | web | other),
  direction: String (inbound | outbound),
  content: String (max 5000 chars),
  attachments: [{
    type: String,
    url: String,
    file_description: String
  }],
  external_message_id: String,
  read: Boolean,
  delivered: Boolean,
  read_at: Date,
  created_at: Date,
  updated_at: Date
}
```

### Contact Schema (from @petbuddy/shared)
```javascript
{
  company_id: ObjectId,
  fullName: String,
  email: String,
  phone: String,
  socialNetworkName: String,
  contactStatus: String,
  botSuspended: Boolean,
  botSuspendUntil: Date,
  leadStage: String,
  social: {
    facebookId: String,
    instagramId: String,
    // ... other platforms
  },
  profile: {
    name: String,
    // ... profile data
  }
}
```

## Async Processing

### Existing Jobs
1. **Token Refresh** (every 24 hours)
   - File: `/src/jobs/tokenRefreshJob.js`
   - Refreshes expiring Facebook access tokens
   - Initial run: 10 seconds after startup

### Architecture Gap
- **No Queue System** - Using native setTimeout/setInterval
- **No Retry Mechanism** - Best-effort delivery for external calls
- **No Dead Letter Queue** - Failed messages not stored for replay

### Future Implementation Suggestion
```
Bull + Redis:
  → Message forwarding queue
  → Token refresh queue
  → Automatic retries with exponential backoff
  → Dead letter queue for monitoring
```

## API Endpoints Summary

### Messages `/api/v1/messages`
```
POST   /              - Create message (with optional forwarding)
POST   /instagram     - Get Instagram conversations (paginated)
POST   /             - Get messages by contact (filters by platform)
GET    /:id           - Get single message
PATCH  /              - Update message
DELETE /              - Delete message
PUT    /mark-read     - Mark messages as read
```

### Socket.io Events
```
Server Emits:
  - message:new         (new message received)
  - message:status      (read/delivered status)
  - typing:indicator    (user typing state)

Client Emits:
  - conversation:join   (join conversation room)
  - conversation:leave  (leave conversation room)
  - typing:start        (user started typing)
  - typing:stop         (user stopped typing)
  - message:read        (mark messages read)
```

## Error Handling Strategy

### Graceful Degradation
```
Level 1: Service Error → Log warning, continue
Level 2: Validation Error → Return 400 with details
Level 3: Critical Error → Return 500, global handler catches
```

### Message Forwarding Error Handling
```
success: false, forwarding: failed
  → Message STILL saved locally
  → Response includes warning
  → Allows retry later
```

### Global Error Handler
```javascript
Specific errors:
  - ValidationError → 400
  - DuplicateKey (11000) → 409
  - CastError → 400
  - JsonWebTokenError → 401
  - TokenExpiredError → 401

Default:
  - 500 for unhandled errors
  - Logged with full context
```

## Logging Output

### Console (Development Only)
```
colorized simple format
```

### Files (All Environments)
```
/logs/error.log    → Error level only
/logs/combined.log → All logs (timestamp, service, context)
```

### Log Context Examples
```javascript
logger.info('Client connected', {
  socketId: socket.id,
  userId: socket.userId,
  companyId: socket.companyId
});

logger.error('Message forwarding failed', {
  error: error.message,
  messageData: { company_id, contact_id, platform },
  endpoint: metaBotUrl
});
```

## Security Checklist

- [x] Helmet security headers
- [x] CORS configuration (configurable origins)
- [x] NoSQL injection protection (mongo-sanitize)
- [x] Password hashing (bcrypt, 12 rounds)
- [x] JWT authentication (access + refresh tokens)
- [x] Request rate limiting (300 requests per 15min for messages)
- [x] Input validation (express-validator + Joi)
- [x] Account lockout (suspicious login attempts)
- [x] CSRF protection (disabled, can enable)
- [x] Graceful shutdown (SIGTERM/SIGINT handling)

## Performance Considerations

### Database
- MongoDB connection pool: 10 connections max
- Lean queries for read-heavy operations
- Aggregation pipelines for complex queries
- Indexed fields: created_at, contact_id, company_id, platform

### Socket.io
- Ping interval: 25 seconds
- Ping timeout: 60 seconds
- Room-based broadcasting (efficient filtering)

### API
- Body size limit: 10MB
- Message content limit: 5000 characters
- Rate limiting: 300 requests per 15 minutes

## Environment Configuration

### Required Variables
```
MONGODB_URI                    (MongoDB connection)
JWT_ACCESS_SECRET             (min 32 chars)
JWT_REFRESH_SECRET            (min 32 chars)
INTERNAL_SERVICE_API_KEY      (min 32 chars)
```

### Optional Variables
```
NODE_ENV                       (development|production|test, default: development)
PORT                          (default: 4000)
LOG_LEVEL                     (error|warn|info|debug, default: info)
FACEBOOK_*                    (Facebook integration)
GOOGLE_*                      (Google Calendar integration)
META_BOT_BASE_URL             (Internal service, default: http://localhost:5001)
```

## Testing Commands

```bash
npm test                      # Run all tests
npm run test:watch          # Watch mode
npm run test:coverage       # Generate coverage report
npm run lint                # Check code style
npm run lint:fix            # Auto-fix style issues
npm run format              # Prettier formatting
```

## Common Debugging

### Check Server Health
```bash
curl http://localhost:4000/health
```

### View Logs
```bash
tail -f logs/error.log
tail -f logs/combined.log
```

### Test Message Creation
```bash
curl -X POST http://localhost:4000/api/v1/messages \
  -H "Content-Type: application/json" \
  -d '{
    "company_id": "...",
    "contact_id": "...",
    "role": "operator",
    "platform": "facebook",
    "direction": "outbound",
    "content": "Hello!"
  }'
```

## Known Limitations & TODOs

### Current Issues
1. No persistent queue system (single-threaded processing)
2. No automatic retry mechanism for failed deliveries
3. Token refresh uses simple setInterval (not cluster-aware)
4. Socket.io scaling would require Redis adapter for multiple processes

### Recommendations
1. Implement Bull + Redis for message queue
2. Add distributed locking for token refresh job
3. Implement Socket.io Redis adapter for horizontal scaling
4. Add health checks for Meta Bot service dependency
5. Implement message delivery tracking/SLA monitoring
