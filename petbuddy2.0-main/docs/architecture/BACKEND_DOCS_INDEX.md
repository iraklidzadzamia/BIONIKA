# Backend Documentation Index

Welcome! This directory contains comprehensive documentation about the PetBuddy backend architecture. Start here to navigate the documentation.

## Quick Start (5 min read)

1. **[TECH_STACK_QUICK_REFERENCE.md](./TECH_STACK_QUICK_REFERENCE.md)** - Start here!
   - Core technology stack at a glance
   - Message processing patterns
   - API endpoints summary
   - Common debugging commands

## Detailed Architecture (20-30 min read)

2. **[BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md)** - Comprehensive deep dive
   - Framework & server setup
   - Database & persistence layer
   - Complete message/event handling patterns
   - Async processing & queue systems
   - Logging & monitoring setup
   - Testing framework & patterns
   - Infrastructure & deployment
   - Architectural decisions
   - Directory structure

3. **[ARCHITECTURE_DIAGRAMS.md](./ARCHITECTURE_DIAGRAMS.md)** - Visual representations
   - System architecture diagram
   - Message processing flow
   - Socket.io real-time communication
   - Database schema relationships
   - Error handling flow
   - Authentication & authorization
   - Message forwarding pipeline
   - Technology stack layers
   - Deployment infrastructure
   - Message delivery sequence

## Key Questions Answered

### "What framework is being used?"
Express.js 4.18.2 with Node.js >= 18.0.0 on a native HTTP server with Socket.io 4.8.1 for real-time communication.
See: [BACKEND_ARCHITECTURE.md - Section 1](./BACKEND_ARCHITECTURE.md#1-framework--server)

### "How are messages handled?"
Three-layer approach:
1. REST API for message creation (with optional forwarding to social platforms)
2. Socket.io for real-time updates (broadcast to company/conversation rooms)
3. MongoDB for persistence (fallback if forwarding fails)
See: [BACKEND_ARCHITECTURE.md - Section 3](./BACKEND_ARCHITECTURE.md#3-messageevent-handling-patterns)

### "What database is used?"
MongoDB 4+ via Mongoose 8.0.3 with a connection pool of 10 and 45-second socket timeout.
See: [BACKEND_ARCHITECTURE.md - Section 2](./BACKEND_ARCHITECTURE.md#2-database--persistence)

### "What queue/async system is in place?"
Currently using native setInterval/setTimeout (no external queue system). This is a known gap for reliability.
See: [TECH_STACK_QUICK_REFERENCE.md - Async Processing](./TECH_STACK_QUICK_REFERENCE.md#async-processing)

### "How is logging set up?"
Winston 3.11.0 logging to /logs/ directory with environment-specific output (console in dev, file in prod).
See: [BACKEND_ARCHITECTURE.md - Section 5](./BACKEND_ARCHITECTURE.md#5-logging--monitoring)

### "What testing framework is used?"
Jest 29.7.0 with Supertest 6.3.3, using mocking for dependencies.
See: [BACKEND_ARCHITECTURE.md - Section 6](./BACKEND_ARCHITECTURE.md#6-testing-framework)

## Directory Structure Reference

```
packages/backend/
├── server.js                 # Entry point
├── src/
│   ├── app.js               # Express setup
│   ├── config/              # Configuration
│   ├── controllers/         # Request handlers
│   ├── middleware/          # Express middleware
│   ├── models/              # Mongoose schemas
│   ├── routes/              # API routes
│   ├── services/            # Business logic
│   ├── socket/              # Socket.io setup
│   ├── jobs/                # Scheduled jobs
│   ├── utils/               # Utilities
│   ├── tests/               # Test files
│   ├── scripts/             # Migration scripts
│   └── seed/                # Database seeding
├── jest.config.js
└── package.json
```

For detailed structure: See [BACKEND_ARCHITECTURE.md - Section 10](./BACKEND_ARCHITECTURE.md#10-directory-structure)

## Message Processing Deep Dive

**The Flow:**
```
REST API Call
  → Validate fields
  → Try forward to Meta Bot (if operator + outbound + social)
  → Save to MongoDB (regardless of forwarding result)
  → Emit Socket.io event to company room
  → Return response with status
```

Visual: See [ARCHITECTURE_DIAGRAMS.md - Section 2](./ARCHITECTURE_DIAGRAMS.md#2-message-processing-flow)

## API Endpoints Quick Reference

### Messages `/api/v1/messages`
- `POST /` - Create message with optional forwarding
- `POST /instagram` - Get Instagram conversations
- `POST /` - Get messages by contact
- `GET /:id` - Get single message
- `PATCH /` - Update message
- `DELETE /` - Delete message
- `PUT /mark-read` - Mark messages as read

Full documentation: See [TECH_STACK_QUICK_REFERENCE.md - API Endpoints Summary](./TECH_STACK_QUICK_REFERENCE.md#api-endpoints-summary)

## Socket.io Events

### Server Emits
- `message:new` - New message received
- `message:status` - Read/delivered status
- `typing:indicator` - User typing state

### Client Emits
- `conversation:join` - Join conversation room
- `conversation:leave` - Leave conversation room
- `typing:start` - User started typing
- `typing:stop` - User stopped typing
- `message:read` - Mark messages read

Full documentation: See [TECH_STACK_QUICK_REFERENCE.md - Socket.io Events](./TECH_STACK_QUICK_REFERENCE.md#socketio-events)

## Security Features

The backend includes:
- Helmet security headers
- CORS with configurable origins
- NoSQL injection protection (mongo-sanitize)
- Password hashing (bcrypt, 12 rounds)
- JWT authentication (access + refresh tokens)
- Request rate limiting (300 req/15min for messages)
- Input validation (express-validator + Joi)
- Account lockout mechanism
- Graceful shutdown handling

Full list: See [TECH_STACK_QUICK_REFERENCE.md - Security Checklist](./TECH_STACK_QUICK_REFERENCE.md#security-checklist)

## Performance Configuration

- **Database:** 10 connection pool, 45s socket timeout
- **Socket.io:** 25s ping interval, 60s timeout
- **API:** 10MB body limit, 5000 char message limit
- **Rate Limiting:** 300 requests per 15 minutes

See: [TECH_STACK_QUICK_REFERENCE.md - Performance Considerations](./TECH_STACK_QUICK_REFERENCE.md#performance-considerations)

## Common Issues & Debugging

### Check Server Health
```bash
curl http://localhost:4000/health
```

### View Logs
```bash
tail -f logs/error.log
tail -f logs/combined.log
```

### Run Tests
```bash
npm test
npm run test:coverage
```

Full debugging guide: See [TECH_STACK_QUICK_REFERENCE.md - Common Debugging](./TECH_STACK_QUICK_REFERENCE.md#common-debugging)

## Known Limitations

1. **No Persistent Queue System** - Using native setTimeout/setInterval
2. **No Automatic Retries** - Best-effort delivery for external calls
3. **No Dead Letter Queue** - Failed messages not tracked
4. **Single-Threaded Processing** - Won't scale across multiple processes
5. **Token Refresh not Cluster-Aware** - Simple setInterval approach

Recommendations: See [TECH_STACK_QUICK_REFERENCE.md - Known Limitations & TODOs](./TECH_STACK_QUICK_REFERENCE.md#known-limitations--todos)

## Future Improvements Roadmap

### High Priority
1. Implement Bull + Redis for message queue
2. Add distributed locking for token refresh
3. Implement message delivery tracking
4. Add health checks for external service dependencies

### Medium Priority
5. Implement Socket.io Redis adapter for horizontal scaling
6. Add Prometheus metrics for monitoring
7. Implement SLA monitoring for message delivery

### Low Priority
8. Event sourcing for audit trails
9. Implement distributed tracing (OpenTelemetry)
10. Redis caching layer for frequently accessed data

Detailed roadmap: See [BACKEND_ARCHITECTURE.md - Section 9](./BACKEND_ARCHITECTURE.md#9-future-improvements-needed)

## Technology Stack Summary

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Express.js | 4.18.2 |
| Runtime | Node.js | >= 18.0.0 |
| Database | MongoDB | 4+ (Mongoose 8.0.3) |
| Real-Time | Socket.io | 4.8.1 |
| Testing | Jest | 29.7.0 |
| Logging | Winston | 3.11.0 |
| Security | helmet, cors, bcrypt | Latest |

Full stack: See [TECH_STACK_QUICK_REFERENCE.md - Core Stack](./TECH_STACK_QUICK_REFERENCE.md#core-stack)

## Environment Configuration

### Required Variables
- `MONGODB_URI` - MongoDB connection string
- `JWT_ACCESS_SECRET` - Min 32 characters
- `JWT_REFRESH_SECRET` - Min 32 characters
- `INTERNAL_SERVICE_API_KEY` - Min 32 characters

### Optional Variables
- `NODE_ENV` - development|production|test
- `PORT` - Default: 4000
- `LOG_LEVEL` - error|warn|info|debug
- `FACEBOOK_*` - Facebook integration
- `GOOGLE_*` - Google Calendar integration
- `META_BOT_BASE_URL` - Internal service endpoint

Full config: See [TECH_STACK_QUICK_REFERENCE.md - Environment Configuration](./TECH_STACK_QUICK_REFERENCE.md#environment-configuration)

## Related Documents

If you're working on specific features:
- **Appointments/Booking:** See booking-related documentation in project root
- **Meta Integration:** Check `TOOL_ENFORCEMENT_SUMMARY.md`
- **Real-Time Features:** See `REALTIME_APPOINTMENTS_IMPLEMENTATION.md`
- **Reschedule Logic:** Check `RESCHEDULE_DOCUMENTATION_INDEX.md`

## Getting Help

1. Start with [TECH_STACK_QUICK_REFERENCE.md](./TECH_STACK_QUICK_REFERENCE.md) for quick answers
2. Check [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md) for detailed information
3. Review [ARCHITECTURE_DIAGRAMS.md](./ARCHITECTURE_DIAGRAMS.md) for visual context
4. See specific sections linked throughout this index

## Contributing

When adding new features:
1. Follow the existing Express/MongoDB patterns
2. Add logging using Winston logger
3. Use Socket.io for real-time updates
4. Write tests using Jest
5. Update relevant documentation

---

**Last Updated:** November 5, 2025
**Backend Version:** 1.0.0
**Status:** Production Ready (with noted limitations)
