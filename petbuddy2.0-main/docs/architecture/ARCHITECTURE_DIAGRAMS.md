# PetBuddy Backend - Architecture Diagrams

## 1. Overall System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Frontend (React/Next.js)                    │
│                        http://localhost:3000                        │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         │ HTTP + WebSocket (Socket.io)
                         │ CORS: Configured Origins
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Express.js Backend Server                      │
│                      http://localhost:4000                          │
├─────────────────────────────────────────────────────────────────────┤
│  Middleware Layer:                                                  │
│  ├─ Helmet (security headers)                                       │
│  ├─ CORS (cross-origin requests)                                    │
│  ├─ Morgan (HTTP request logging)                                   │
│  ├─ JWT Authentication                                              │
│  ├─ Rate Limiting                                                   │
│  ├─ NoSQL Injection Protection (mongo-sanitize)                     │
│  └─ Global Error Handler                                            │
├─────────────────────────────────────────────────────────────────────┤
│  API Layer (/api/v1/):                                              │
│  ├─ /auth - Authentication & Authorization                         │
│  ├─ /messages - Message CRUD + Forwarding                          │
│  ├─ /conversations - Conversation management                       │
│  ├─ /appointments - Booking system                                 │
│  ├─ /meta - Meta integration webhooks                              │
│  ├─ /socket - Internal socket emission                             │
│  └─ ... (other routes)                                             │
├─────────────────────────────────────────────────────────────────────┤
│  Real-Time Layer (Socket.io):                                       │
│  ├─ connection - Auto-join company room                            │
│  ├─ conversation:join/leave - Room management                      │
│  ├─ message:new - Broadcast new messages                           │
│  ├─ message:read - Broadcast read status                           │
│  ├─ typing:start/stop - Typing indicators                          │
│  └─ message:status - Delivery status                               │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ├──────────────────────────────┬──────────────────────────┐
                         │                              │                          │
                         ▼                              ▼                          ▼
        ┌─────────────────────────┐    ┌──────────────────────────┐   ┌─────────────────────────┐
        │      MongoDB 4+         │    │   External Services      │   │  Background Jobs        │
        │   (Mongoose 8.0.3)      │    │                          │   │                         │
        ├─────────────────────────┤    ├──────────────────────────┤   ├─────────────────────────┤
        │ Collections:            │    │ - Meta Bot Server        │   │ - Token Refresh (24h)   │
        │ ├─ messages             │    │   (HTTP POST)            │   │ - Message Forwarding    │
        │ ├─ contacts             │    │ - Facebook Graph API     │   │ - ... (future: queue)   │
        │ ├─ companies            │    │ - Google Calendar API    │   │                         │
        │ ├─ appointments         │    │ - Instagram Graph API    │   │ Implementation:         │
        │ ├─ users                │    │                          │   │ setInterval/setTimeout  │
        │ └─ ... (11 more)        │    └──────────────────────────┘   └─────────────────────────┘
        │                         │
        │ Pool: 10 connections    │
        │ Max timeout: 45s        │
        └─────────────────────────┘
```

## 2. Message Processing Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          Message Creation Request                               │
│                    POST /api/v1/messages (REST API)                             │
└──────────────────────────────┬──────────────────────────────────────────────────┘
                               │
                               ▼
                    ┌────────────────────┐
                    │   Validation       │
                    │ ├─ company_id      │
                    │ ├─ contact_id      │
                    │ ├─ role            │
                    │ ├─ platform        │
                    │ └─ direction       │
                    └────────┬───────────┘
                             │
                    ┌────────▼─────────────────────────────┐
                    │ Is Operator + Outbound + Social?     │
                    └────────┬─────────────────┬───────────┘
                             │ YES             │ NO
                    ┌────────▼─────────┐       │
                    │  Forward to      │       │
                    │ Meta Bot Server  │       │
                    │ ├─ /facebook     │       │
                    │ └─ /instagram    │       │
                    │  Timeout: 10s    │       │
                    └────────┬─────────┘       │
                             │                 │
                ┌────────────▼──────────────┐  │
                │ Forwarding Result?        │  │
                ├────────────┬──────────────┤  │
                │ success    │ error/timeout│  │
                │            │              │  │
                ▼            ▼              ▼  │
            (logged)    (log warning)  (no action)
                │            │              │  │
                └────────────┴──────────────┴──┘
                             │
                             ▼
                    ┌─────────────────────┐
                    │  Save to MongoDB    │
                    │ (ALWAYS - no matter │
                    │  if forwarding      │
                    │  succeeded or not)  │
                    └────────┬────────────┘
                             │
                             ▼
                    ┌─────────────────────┐
                    │ Emit Socket Event   │
                    │ (non-blocking)      │
                    │ ├─ event: message:new
                    │ ├─ room: company:X  │
                    │ └─ data: message    │
                    └────────┬────────────┘
                             │
                             ▼
                    ┌─────────────────────┐
                    │  Return Response    │
                    │ ├─ messageData      │
                    │ ├─ forwarding:      │
                    │ │  success/failed   │
                    │ └─ warning (if      │
                    │    forwarding failed)
                    └─────────────────────┘
```

## 3. Socket.io Real-Time Communication

```
                        ┌─────────────────────────────────────┐
                        │   Frontend WebSocket Connection     │
                        └──────────────────┬──────────────────┘
                                           │
                                           ▼
                        ┌──────────────────────────────────────┐
                        │  Socket.io Server on Express         │
                        │  (same HTTP server)                  │
                        └──────────────────┬───────────────────┘
                                           │
                                Ping: 25s, Timeout: 60s
                                           │
                            ┌──────────────┴──────────────┐
                            │                             │
                            ▼                             ▼
                    ┌─────────────────┐         ┌──────────────────┐
                    │ Auth Middleware │         │ Room Management  │
                    │ (verify token)  │         │                  │
                    └────────┬────────┘         │ Auto-join:       │
                             │                 │ company:{compId}  │
                             ▼                 │                  │
                    ┌─────────────────┐         │ On request:      │
                    │  Connected!     │         │ conversation:X   │
                    │ Logged: socketId│         └──────────────────┘
                    │        userId   │
                    │        companyId│
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
         ┌─────────┐   ┌──────────┐   ┌──────────┐
         │ Receives│   │ Receives │   │ Receives │
         │  Client │   │  Client  │   │  Server  │
         │  Events │   │  Events  │   │  Emits  │
         └─────────┘   └──────────┘   └──────────┘
              │              │              │
              │              │              ▼
              │              │      ┌─────────────────┐
              │              │      │ message:new     │
              │              │      │ (new message)   │
              │              │      ├─────────────────┤
              │              │      │ Broadcast to:   │
              │              │      │ company:X room  │
              │              │      └────────┬────────┘
              │              │               │
              │              │      ┌────────▼─────────┐
              │              │      │ Clients receive  │
              │              │      │ message:new      │
              │              │      │ event + data     │
              │              │      └──────────────────┘
              │              │
              ▼              ▼
        conversation    message:read
        :join/leave     status updates
        typing:start    typing indicators
        typing:stop
```

## 4. Database Schema Relationships

```
┌──────────────────────────────────────────────────────────────────┐
│                         Companies                               │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ _id                                                        │ │
│  │ companyName                                                │ │
│  │ integration: {fbAccessToken, instagramAccessToken}        │ │
│  │ ... (other fields)                                         │ │
│  └────────────────────────────────────────────────────────────┘ │
└────────────────┬─────────────────────────────────────────────────┘
                 │ 1 to Many
                 │
      ┌──────────▼──────────┐         ┌────────────────────────────┐
      │                     │         │ CompanyIntegrations        │
      │                     │         │ ┌────────────────────────┐ │
      ▼                     │         │ │ _id                    │ │
   Contacts                 │         │ │ companyId              │ │
   ┌──────────────────────┐ │         │ │ facebookAccessToken    │ │
   │ _id                  │ │         │ │ instagramAccessToken   │ │
   │ company_id (FK)  ────┼─┼─────────┤─│ facebookChatId         │ │
   │ fullName             │ │         │ │ instagramChatId        │ │
   │ email                │ │         │ │ ... (other integrations)
   │ phone                │ │         │ └────────────────────────┘ │
   │ social {             │ │         └────────────────────────────┘
   │   facebookId         │ │
   │   instagramId        │ │
   │ }                    │ │
   │ ... (other fields)   │ │
   └──────────┬───────────┘ │
              │ 1 to Many    │
              │              │
              ▼              │
    ┌──────────────────────┐ │
    │      Messages        │ │
    │ ┌──────────────────┐ │ │
    │ │ _id              │ │ │
    │ │ company_id (FK)──┼─┼─┘
    │ │ contact_id (FK)──┼─┘
    │ │ role             │
    │ │ platform         │
    │ │ direction        │
    │ │ content          │
    │ │ attachments      │
    │ │ read             │
    │ │ delivered        │
    │ │ created_at       │
    │ │ updated_at       │
    │ └──────────────────┘
    └──────────────────────┘
```

## 5. Error Handling Flow

```
┌────────────────────────────────────────┐
│      Incoming Request/Operation        │
└────────────────────┬───────────────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │    Try/Catch Block     │
        └────────────┬───────────┘
                     │
          ┌──────────┴──────────┐
          │                     │
          ▼ Success             ▼ Error
       (Return)            ┌─────────────────┐
                           │  Error Object   │
                           │  ├─ name        │
                           │  ├─ message     │
                           │  ├─ stack       │
                           │  └─ code        │
                           └────────┬────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
            ValidationError    JWT Error       Database Error
            ├─ 400             ├─ 401          ├─ 400 (CastError)
            ├─ VALIDATION      ├─ INVALID_     ├─ 409 (Duplicate)
            │  _ERROR          │  TOKEN        ├─ 500 (Other)
            └─ Field details   │ _EXPIRED      └─ ...
                               └─ ...
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
            Global Error Handler          Logged with context
            ├─ Status code                 ├─ URL
            ├─ Error code                  ├─ Method
            ├─ Message                     ├─ User ID
            └─ Details                     └─ Stack trace
                    │
                    ▼
            JSON Response to Client
```

## 6. Authentication & Authorization Flow

```
┌────────────────────────────────────────┐
│     REST API Request with Token        │
│  (Header: Authorization: Bearer ...)   │
└────────────────────┬───────────────────┘
                     │
                     ▼
        ┌──────────────────────────┐
        │ authenticateToken        │
        │ Middleware               │
        └────────────┬─────────────┘
                     │
          ┌──────────▼──────────┐
          │ Token Valid?        │
          └──────┬──────┬───────┘
                 │      │
                 ▼      ▼
            (YES) │  (NO) 401 INVALID_TOKEN
                 │
                 ▼
        ┌──────────────────────────┐
        │ Extract User from Token  │
        │ Add to req.user          │
        └────────────┬─────────────┘
                     │
                     ▼
        ┌──────────────────────────┐
        │ requireRole(role)        │
        │ Middleware               │
        └────────────┬─────────────┘
                     │
          ┌──────────▼──────────┐
          │ User has role?      │
          └──────┬──────┬───────┘
                 │      │
                 ▼      ▼
            (YES) │  (NO) 403 FORBIDDEN
                 │
                 ▼
        ┌──────────────────────────┐
        │ Route Handler            │
        │ Execute endpoint logic   │
        └──────────────────────────┘
```

## 7. Message Forwarding Pipeline Detail

```
┌────────────────────────────────────────────────────────────────┐
│           Message Forwarding Service Flow                      │
└────────────────────┬───────────────────────────────────────────┘
                     │
     ┌───────────────▼──────────────┐
     │ Check preconditions          │
     │ ├─ direction === outbound    │
     │ ├─ role === operator         │
     │ └─ platform in (fb, ig)      │
     └────────┬────────────┬────────┘
              │ SKIP       │ FORWARD
              ▼            ▼
        (logged)    ┌─────────────────┐
                    │ Fetch data      │
                    │ ├─ Company info │
                    │ ├─ Contact info │
                    │ └─ Integration  │
                    └────┬────────────┘
                         │
                    ┌────▼──────────┐
                    │ Data missing? │
                    └───┬───────┬──┘
                        │ YES   │ NO
                        ▼       ▼
                      Error  ┌─────────────┐
                             │ Build payload
                             │ ├─ company_id
                             │ ├─ customer_id
                             │ ├─ platform
                             │ ├─ content
                             │ ├─ access_token
                             │ └─ customer_social_id
                             └────┬────────┘
                                  │
                             ┌────▼──────────┐
                             │ HTTP POST to  │
                             │ Meta Bot      │
                             │ (10s timeout) │
                             └────┬──┬───┬──┘
                                  │  │   │
        ┌─────────────────────────┘  │   └──────────────────────┐
        │ Success: 200             │                Success: OK   │
        │ Response: { ... }        │                Response data │
        ▼                          ▼                             ▼
     Logged              Error/Timeout               Return Success
                         ├─ ECONNREFUSED
                         │  "Meta Bot unreachable"
                         ├─ ETIMEDOUT
                         │  "Meta Bot timed out"
                         ├─ 4xx
                         │  "Bad request"
                         └─ 5xx
                            "Server error"
                              │
                              ▼
                      Logged as warning
```

## 8. Technology Stack Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                    Presentation Layer                            │
│  ├─ Socket.io Client Events                                     │
│  └─ HTTP Client (Fetch/Axios)                                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                   API / Communication Layer                      │
│  ├─ Express.js Routes & Middleware                              │
│  ├─ Socket.io Server (4.8.1)                                    │
│  ├─ Request Validation (express-validator)                      │
│  ├─ CORS & Security (helmet, mongo-sanitize)                    │
│  └─ Rate Limiting & Authentication                              │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                 Business Logic Layer (Services)                  │
│  ├─ messageForwarding.service.js                                │
│  ├─ bookingService.js                                           │
│  ├─ companySetupService.js                                      │
│  ├─ authService.js                                              │
│  └─ ... (other services)                                        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                  Data Access Layer (Controllers)                 │
│  ├─ Mongoose Models (Contacts, Messages, Companies)             │
│  ├─ Database Queries & Aggregations                             │
│  └─ Data Transformation                                         │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                    Persistence Layer                             │
│  ├─ MongoDB 4+ (Mongoose 8.0.3)                                 │
│  ├─ Connection Pool (max 10)                                    │
│  └─ Indexes on: company_id, contact_id, created_at, platform   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
         ┌─────────────────────────────────┐
         │  External Services Integration  │
         ├─ Meta Bot Server (HTTP)         │
         ├─ Facebook Graph API             │
         ├─ Instagram Graph API            │
         ├─ Google Calendar API            │
         └─ Axios HTTP Client              │
```

## 9. Deployment & Infrastructure

```
┌─────────────────────────────────────────────────────────────────┐
│                      Production Environment                      │
│                         (Render/Cloud)                           │
└─────────────────────────┬───────────────────────────────────────┘
                          │
        ┌─────────────────┴──────────────────┐
        │                                    │
        ▼                                    ▼
    ┌─────────────┐                  ┌──────────────┐
    │   Load      │                  │   SSL/TLS    │
    │  Balancer   │                  │  Certificate │
    │(Cloudflare?)│                  │(Auto-Renew)  │
    └────┬────────┘                  └──────┬───────┘
         │                                   │
         └───────────────┬───────────────────┘
                         │
                         ▼
         ┌────────────────────────────┐
         │   Node.js Server           │
         │  Express + Socket.io       │
         │  Port: 4000                │
         └────────┬───────────────────┘
                  │
        ┌─────────┴──────────┐
        │                    │
        ▼                    ▼
    MongoDB             Logging
    Atlas/SelfHosted    Winston
    Connection Pool: 10 /logs/error.log
    Max Timeout: 45s    /logs/combined.log

Environment Variables (from .env):
├─ NODE_ENV
├─ PORT
├─ MONGODB_URI
├─ JWT_*
├─ CORS_ORIGINS
├─ BCRYPT_SALT_ROUNDS
├─ META_BOT_BASE_URL
└─ ... (other configs)
```

## 10. Message Delivery Sequence Diagram

```
Frontend          Backend                 MongoDB            Meta Bot
   │                │                        │                 │
   │ POST /messages │                        │                 │
   ├───────────────>│ Validate               │                 │
   │                ├─ Validate fields      │                 │
   │                │                        │                 │
   │                │ Try Forward            │                 │
   │                │ (if operator+outbound+social)            │
   │                ├───────────────────────────────────────> │
   │                │                        │    POST /chat    │
   │                │                        │ (10s timeout)    │
   │                │< ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤
   │                │ (success or error)     │                 │
   │                │                        │                 │
   │                │ Save Message           │                 │
   │                ├───────────────────────>│                 │
   │                │                        │ SAVED            │
   │                │< ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┤                 │
   │                │                        │                 │
   │                │ Emit Socket Event      │                 │
   │                │ (company:X room)       │                 │
   │< ─ ─ ─ ─ ─ ─ ─┤ message:new            │                 │
   │ Real-time      │                        │                 │
   │ update         │ Return Response        │                 │
   │<───────────────┤ { messageData, ...}    │                 │
   │                │                        │                 │
```
