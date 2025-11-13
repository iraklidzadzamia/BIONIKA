# Work Buffer System - Architecture & Design

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Work Buffer System                                 │
│                                                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                         Application Layer                               │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐          │ │
│  │  │ Express  │  │ Socket   │  │ Services │  │  Background  │          │ │
│  │  │ Routes   │  │ Events   │  │          │  │  Jobs        │          │ │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───────┬──────┘          │ │
│  │       │             │             │                 │                  │ │
│  │       └─────────────┴─────────────┴─────────────────┘                  │ │
│  │                              │                                          │ │
│  └──────────────────────────────┼──────────────────────────────────────────┘ │
│                                 │                                            │
│  ┌──────────────────────────────▼──────────────────────────────────────────┐ │
│  │                        WorkBuffer (Core)                                │ │
│  │  ┌────────────────┐  ┌────────────────┐  ┌───────────────────┐        │ │
│  │  │  Event Emitter │  │  Worker Pool   │  │  Lifecycle Mgmt   │        │ │
│  │  │  (Monitoring)  │  │  (Concurrency) │  │  (Start/Stop)     │        │ │
│  │  └────────────────┘  └────────────────┘  └───────────────────┘        │ │
│  │           │                   │                      │                  │ │
│  │           └───────────────────┴──────────────────────┘                  │ │
│  │                               │                                         │ │
│  └───────────────────────────────┼─────────────────────────────────────────┘ │
│                                  │                                           │
│  ┌───────────────────────────────▼─────────────────────────────────────────┐ │
│  │                      MessageProcessor (Router)                          │ │
│  │  ┌────────────────┐  ┌────────────────┐  ┌───────────────────┐        │ │
│  │  │  Handler       │  │  Circuit       │  │  Timeout          │        │ │
│  │  │  Registry      │  │  Breaker       │  │  Enforcement      │        │ │
│  │  └────────────────┘  └────────────────┘  └───────────────────┘        │ │
│  │           │                   │                      │                  │ │
│  │           └───────────────────┴──────────────────────┘                  │ │
│  │                               │                                         │ │
│  └───────────────────────────────┼─────────────────────────────────────────┘ │
│                                  │                                           │
│  ┌───────────────────────────────▼─────────────────────────────────────────┐ │
│  │                    Message Handlers (Strategy)                          │ │
│  │  ┌────────────────┐  ┌────────────────┐  ┌───────────────────┐        │ │
│  │  │  Socket        │  │  MetaBot       │  │  Custom           │        │ │
│  │  │  Emission      │  │  Forwarding    │  │  Handlers         │        │ │
│  │  └────────────────┘  └────────────────┘  └───────────────────┘        │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                  │                                           │
│  ┌───────────────────────────────▼─────────────────────────────────────────┐ │
│  │                      BufferStore (Persistence)                          │ │
│  │  ┌────────────────┐  ┌────────────────┐  ┌───────────────────┐        │ │
│  │  │  CRUD          │  │  Atomic        │  │  Cleanup          │        │ │
│  │  │  Operations    │  │  Claiming      │  │  & Stats          │        │ │
│  │  └────────────────┘  └────────────────┘  └───────────────────┘        │ │
│  │           │                   │                      │                  │ │
│  │           └───────────────────┴──────────────────────┘                  │ │
│  │                               │                                         │ │
│  └───────────────────────────────┼─────────────────────────────────────────┘ │
│                                  │                                           │
│  ┌───────────────────────────────▼─────────────────────────────────────────┐ │
│  │                       MongoDB (Durable Storage)                         │ │
│  │  ┌────────────────────────────────────────────────────────────────┐    │ │
│  │  │  work_buffer_messages (indexed by state, priority, visibleAt) │    │ │
│  │  └────────────────────────────────────────────────────────────────┘    │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  ┌───────────────────────────────────────────────────────────────────────┐   │
│  │                    Dead Letter Queue (DLQ)                            │   │
│  │  ┌────────────────┐  ┌────────────────┐  ┌───────────────────┐      │   │
│  │  │  Quarantine    │  │  Inspection    │  │  Replay           │      │   │
│  │  │  & Alerting    │  │  & Analysis    │  │  Capability       │      │   │
│  │  └────────────────┘  └────────────────┘  └───────────────────┘      │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

### 1. WorkBuffer (Core Queue Manager)

**Purpose**: Orchestrates message processing with configurable concurrency

**Responsibilities**:
- Poll BufferStore for pending messages
- Spawn workers for concurrent processing
- Manage worker pool lifecycle
- Handle graceful shutdown with draining
- Emit events for monitoring
- Enforce backpressure (max queue size)

**Key Methods**:
```javascript
start()                    // Start polling and processing
stop(options)              // Graceful shutdown
enqueue(message)           // Add message to queue
getStats()                 // Get real-time statistics
registerHandler(handler)   // Register message handler
```

**State Machine**:
```
STOPPED ──start()──> RUNNING ──stop()──> SHUTTING_DOWN ──drain──> STOPPED
                        │
                        └──> [Worker Pool: idle/processing]
```

### 2. BufferStore (Persistence Layer)

**Purpose**: Durable storage with atomic operations

**Responsibilities**:
- Persist messages to MongoDB
- Atomic message claiming (prevent double-processing)
- Track message state transitions
- Cleanup old messages
- Provide statistics

**Key Methods**:
```javascript
create(message)                          // Persist new message
claimNextBatch(limit, workerId, timeout) // Atomically claim messages
markCompleted(messageId, result)         // Mark success
markFailed(messageId, error, retryDelay) // Mark failure + retry
moveToDLQ(messageId, reason)             // Move to DLQ
releaseStuckMessages(timeout)            // Release timed-out messages
getStats()                               // Get queue statistics
```

**Atomic Claiming**:
```javascript
// Uses MongoDB findOneAndUpdate with version check
findOneAndUpdate(
  { messageId, state: 'pending', visibleAt: { $lte: now } },
  { $set: { state: 'processing', workerId, visibleAt: future }, $inc: { attemptCount: 1 } },
  { new: true }
)
```

### 3. MessageProcessor (Router & Orchestrator)

**Purpose**: Route messages to handlers with fault tolerance

**Responsibilities**:
- Maintain handler registry
- Route messages by type
- Enforce processing timeouts
- Implement circuit breaker pattern
- Call handler lifecycle hooks
- Handle errors gracefully

**Key Methods**:
```javascript
registerHandler(handler)         // Register handler
process(message, context)        // Process message
getCircuitState(type)            // Check circuit breaker
resetCircuitBreaker(type)        // Reset circuit
```

**Circuit Breaker States**:
```
CLOSED ──(failures >= threshold)──> OPEN ──(timeout elapsed)──> HALF_OPEN
   │                                  │                              │
   └──(success)──────────────────────┴──(failure)─────┴──(success)─┘
```

### 4. MessageHandler (Strategy Pattern)

**Purpose**: Abstract base class for message processors

**Responsibilities**:
- Define handler interface
- Implement message processing logic
- Validate payloads
- Handle errors with custom logic
- Provide lifecycle hooks

**Interface**:
```javascript
class MessageHandler {
  type: string
  timeout: number
  idempotent: boolean
  maxRetries: number
  
  async validate(payload)           // Validate before processing
  async process(message, context)   // Main processing logic
  async onError(error, message)     // Error handling (return true to retry)
  async onBeforeProcess(message)    // Pre-processing hook
  async onAfterProcess(message)     // Post-processing hook
}
```

### 5. DeadLetterQueue (Poison Message Handler)

**Purpose**: Quarantine and manage permanently failed messages

**Responsibilities**:
- Store failed messages
- Alert when threshold exceeded
- Provide inspection tools
- Support message replay
- Generate statistics

**Key Methods**:
```javascript
getMessages(limit)              // Fetch DLQ messages
getCount()                      // Count DLQ messages
replayMessage(messageId)        // Replay message
deleteMessage(messageId)        // Delete message
checkAndAlert()                 // Check threshold + alert
getStats()                      // DLQ statistics
```

## Data Model

### BufferMessage Schema

```javascript
{
  messageId: String (unique),          // UUID for message
  type: String,                        // Handler type
  priority: Number (0-3),              // 0=CRITICAL, 3=LOW
  state: String,                       // pending|processing|completed|failed|dlq
  payload: Mixed,                      // Message data
  
  metadata: {
    correlationId: String,
    source: String,
    userId: String,
    companyId: String,
    traceId: String,
    custom: Mixed,
  },
  
  attemptCount: Number,                // Current attempt
  maxRetries: Number,                  // Max allowed attempts
  
  processingStartedAt: Date,           // When processing started
  lastProcessedAt: Date,               // Last attempt time
  completedAt: Date,                   // Completion time
  visibleAt: Date,                     // When visible for processing
  
  workerId: String,                    // Worker that claimed message
  
  errors: [{
    message: String,
    code: String,
    stack: String,
    timestamp: Date,
    attemptNumber: Number,
  }],
  
  lastError: {
    message: String,
    code: String,
    timestamp: Date,
  },
  
  idempotencyKey: String (sparse),     // Optional idempotency key
  result: Mixed,                       // Processing result
  expiresAt: Date,                     // TTL for cleanup
  
  createdAt: Date,
  updatedAt: Date,
}
```

### Indexes

```javascript
// Compound indexes for efficient queries
{ state: 1, priority: 1, visibleAt: 1 }  // Primary query index
{ type: 1, state: 1 }                     // Filter by type
{ createdAt: 1, state: 1 }                // Time-based queries
{ 'metadata.companyId': 1, state: 1 }    // Company-specific queries
{ expiresAt: 1 }                          // TTL index (expireAfterSeconds: 0)
{ messageId: 1 }                          // Unique index
{ idempotencyKey: 1 }                     // Sparse unique index
```

## Message Lifecycle

### State Transitions

```
PENDING ──claim──> PROCESSING ──success──> COMPLETED ──TTL──> [deleted]
   │                   │
   │                   └──timeout/failure──> PENDING (if retries remaining)
   │                                     └──> FAILED ──> DLQ (if max retries)
   │
   └──validation error──> FAILED ──> DLQ
```

### Detailed Flow

```
1. ENQUEUE
   ├─ Validate input
   ├─ Check idempotency
   ├─ Check queue capacity
   ├─ Create message (state=PENDING)
   ├─ Save to MongoDB
   └─ Emit 'enqueued' event

2. CLAIM (Atomic)
   ├─ Find messages: state=PENDING, visibleAt <= now
   ├─ Sort by: priority ASC, createdAt ASC
   ├─ Limit to: available worker slots
   └─ For each message:
       ├─ Atomic update:
       │   ├─ state = PROCESSING
       │   ├─ workerId = <worker-id>
       │   ├─ processingStartedAt = now
       │   ├─ visibleAt = now + visibilityTimeout
       │   └─ attemptCount++
       └─ If successful, claim message

3. PROCESS
   ├─ Get handler for message.type
   ├─ Check circuit breaker
   ├─ Validate payload
   ├─ onBeforeProcess() hook
   ├─ Execute handler.process() with timeout
   ├─ onAfterProcess() hook
   └─ Mark completed

4a. SUCCESS PATH
    ├─ Update message:
    │   ├─ state = COMPLETED
    │   ├─ completedAt = now
    │   ├─ result = <handler-result>
    │   └─ expiresAt = now + 24h
    ├─ Emit 'completed' event
    └─ Record metrics

4b. FAILURE PATH
    ├─ Record error in errors array
    ├─ Update lastError
    ├─ Check attemptCount vs maxRetries
    ├─ If retries remaining:
    │   ├─ Calculate backoff: base * (multiplier ^ attempt)
    │   ├─ Update message:
    │   │   ├─ state = PENDING
    │   │   ├─ visibleAt = now + backoff
    │   │   └─ workerId = null
    │   ├─ Emit 'failed' event (willRetry=true)
    │   └─ Record retry metric
    └─ If max retries exceeded:
        ├─ Update message:
        │   ├─ state = FAILED
        │   └─ expiresAt = now + 7d
        ├─ Check if should move to DLQ
        ├─ If yes:
        │   └─ Update message: state = DLQ
        ├─ Emit 'failed' event (willRetry=false)
        ├─ Emit 'dlq' event
        └─ Record DLQ metric

5. STUCK MESSAGE RECOVERY
   ├─ Find messages: state=PROCESSING, processingStartedAt < (now - visibilityTimeout)
   ├─ For each stuck message:
   │   ├─ Create timeout error
   │   └─ Follow FAILURE PATH
   └─ Emit warning

6. CLEANUP
   ├─ Find messages: state IN [COMPLETED, FAILED], completedAt < (now - TTL)
   ├─ Delete matching messages
   └─ Return deleted count
```

## Retry Strategy

### Exponential Backoff

```
Attempt 1: delay = 1000ms
Attempt 2: delay = 2000ms
Attempt 3: delay = 4000ms
Attempt 4: delay = 8000ms
Attempt 5: delay = 16000ms
Attempt 6: delay = 32000ms
Attempt 7+: delay = 60000ms (capped)
```

**Formula**: `delay = min(base * (multiplier ^ attempt), max)`

**Configuration**:
- `retryBackoffBase`: 1000ms (1 second)
- `retryBackoffMultiplier`: 2 (exponential)
- `retryBackoffMax`: 60000ms (1 minute cap)

### Retry Decision Logic

```javascript
async onError(error, message) {
  // Validation errors: don't retry
  if (error.message.includes('Invalid') || error.code === 'VALIDATION_ERROR') {
    return false;
  }
  
  // Network errors: retry
  if (['ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND', 'ECONNRESET'].includes(error.code)) {
    return true;
  }
  
  // HTTP status codes
  if (error.statusCode) {
    if (error.statusCode >= 500) return true;      // Server errors: retry
    if (error.statusCode === 429) return true;     // Rate limit: retry
    if (error.statusCode === 408) return true;     // Timeout: retry
    if (error.statusCode >= 400) return false;     // Client errors: don't retry
  }
  
  // Default: retry
  return true;
}
```

## Concurrency Model

### Worker Pool

```
┌────────────────────────────────────────────────────────────┐
│ Worker Pool (concurrency = 5)                              │
│                                                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌───┤
│  │ Worker1 │  │ Worker2 │  │ Worker3 │  │ Worker4 │  │ W5│
│  │ [BUSY]  │  │ [BUSY]  │  │ [IDLE]  │  │ [BUSY]  │  │[ID│
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └─┬─┤
│       │            │            │            │          │  │
│  ┌────▼────┐  ┌───▼─────┐  ┌───▼─────┐  ┌──▼──────┐  ┌▼─┤
│  │ Msg A   │  │ Msg B   │  │ waiting │  │ Msg C   │  │ w│
│  │ type:X  │  │ type:Y  │  │         │  │ type:X  │  │  │
│  │ pri:0   │  │ pri:1   │  │         │  │ pri:2   │  │  │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └──┤
│                                                            │
└────────────────────────────────────────────────────────────┘

Poll Interval: 100ms
Batch Size: 10 messages per poll
Visibility Timeout: 60 seconds
```

### Backpressure

```
Queue Depth Thresholds:

  0-100:   ████████████░░░░░░░░   Normal (enqueue fast)
  100-500: ████████████████░░░░   Warning (monitor)
  500-900: ████████████████████   High (alert)
  900+:    ████████████████████   FULL (reject enqueue)

Backpressure Actions:
- Queue < 100: Normal operation
- Queue > 500: Log warning, consider scaling
- Queue > 900: Alert operations team
- Queue >= maxQueueSize: Reject enqueue with QUEUE_FULL error
```

## Error Handling

### Error Types

```javascript
ERROR_CODES = {
  QUEUE_FULL: 'QUEUE_FULL',                       // Queue at capacity
  MESSAGE_TIMEOUT: 'MESSAGE_TIMEOUT',             // Processing timeout
  INVALID_MESSAGE: 'INVALID_MESSAGE',             // Validation failed
  HANDLER_NOT_FOUND: 'HANDLER_NOT_FOUND',         // No handler for type
  PERSISTENCE_FAILURE: 'PERSISTENCE_FAILURE',     // MongoDB error
  MAX_RETRIES_EXCEEDED: 'MAX_RETRIES_EXCEEDED',   // No retries left
  CIRCUIT_OPEN: 'CIRCUIT_OPEN',                   // Circuit breaker open
  SHUTDOWN_IN_PROGRESS: 'SHUTDOWN_IN_PROGRESS',   // System shutting down
  DUPLICATE_MESSAGE: 'DUPLICATE_MESSAGE',         // Idempotency violation
}
```

### Error Propagation

```
Handler Error
    │
    ├─> Circuit Breaker (record failure)
    ├─> Handler.onError() (determine retry)
    ├─> BufferStore.markFailed() (persist error)
    └─> WorkBuffer event (emit 'failed')
```

## Performance Optimization

### Database Queries

```javascript
// Optimized claiming query
db.work_buffer_messages.find({
  state: 'pending',
  visibleAt: { $lte: new Date() }
})
.sort({ priority: 1, createdAt: 1 })
.limit(10)
.hint({ state: 1, priority: 1, visibleAt: 1 })  // Use compound index
```

### Batch Operations

- Poll in batches of 10-50 messages
- Process concurrently (up to concurrency limit)
- Minimize MongoDB round trips

### Memory Management

- Limit in-memory queue size
- Use lean() for MongoDB queries
- Clear completed messages with TTL
- Stream large result sets

## Testing Strategy

### Unit Tests

```
✓ WorkBuffer
  ✓ enqueue
    ✓ should enqueue successfully
    ✓ should reject when shutting down
    ✓ should reject when queue full
    ✓ should handle duplicates with idempotency
  ✓ start and stop
    ✓ should start and stop gracefully
    ✓ should not start twice
  ✓ message processing
    ✓ should process message successfully
    ✓ should retry failed messages
  ✓ getStats
    ✓ should return buffer statistics

✓ MessageHandler
  ✓ should create handler with correct properties
  ✓ should throw if process not implemented
  ✓ should validate payload
  ✓ should handle error with default behavior

✓ BufferStore
  ✓ should create message
  ✓ should claim messages atomically
  ✓ should mark completed
  ✓ should mark failed with retry
  ✓ should move to DLQ
  ✓ should release stuck messages
```

### Integration Tests

```
✓ End-to-end message flow
  ✓ enqueue → process → complete
  ✓ enqueue → process → fail → retry → complete
  ✓ enqueue → process → fail → max retries → DLQ
  ✓ priority ordering (CRITICAL before NORMAL)
  ✓ idempotency (duplicate rejected)
  ✓ concurrent processing (multiple workers)
  ✓ graceful shutdown (drain messages)
  ✓ circuit breaker (open → half-open → closed)
  ✓ stuck message recovery
```

### Load Tests

```
Throughput Test:
- Enqueue 10,000 messages
- Measure: enqueue rate, processing rate, completion time
- Expected: >1000 enqueues/sec, complete all in <30sec

Concurrency Test:
- Run with 1, 5, 10, 20, 50 workers
- Measure: throughput, latency, resource usage
- Expected: Linear scaling up to 20 workers

Failure Recovery Test:
- Inject random failures (20% failure rate)
- Measure: retry behavior, DLQ rate, completion time
- Expected: All messages eventually complete or DLQ

Stress Test:
- Queue 100,000 messages
- Measure: memory usage, CPU usage, MongoDB impact
- Expected: Memory <500MB, CPU <50%, no crashes
```

## Security

### Input Validation

```javascript
// Always validate payloads
async validate(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Payload must be an object');
  }
  
  // Check required fields
  const required = ['to', 'subject', 'body'];
  for (const field of required) {
    if (!payload[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  
  // Sanitize strings
  payload.subject = sanitize(payload.subject);
  
  return true;
}
```

### Access Control

```javascript
// Restrict enqueue endpoint
router.post('/api/buffer/enqueue', authenticate, authorize('staff'), async (req, res) => {
  await workBuffer.enqueue(req.body);
});
```

### Sensitive Data

```javascript
// Never store secrets in payloads
// ❌ BAD
await workBuffer.enqueue({
  type: 'email',
  payload: { apiKey: process.env.API_KEY } // Don't do this
});

// ✅ GOOD
await workBuffer.enqueue({
  type: 'email',
  payload: { userId: 'user-123' } // Handler retrieves key from env
});
```

## Scalability

### Horizontal Scaling

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Instance 1  │  │  Instance 2  │  │  Instance 3  │
│  WorkBuffer  │  │  WorkBuffer  │  │  WorkBuffer  │
│  (10 workers)│  │  (10 workers)│  │  (10 workers)│
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                  │                  │
       └──────────────────┴──────────────────┘
                          │
                ┌─────────▼──────────┐
                │   MongoDB (Shared) │
                │  (Atomic Claiming) │
                └────────────────────┘

Total Concurrency: 30 workers
```

**Benefits**:
- Increased throughput
- Redundancy (failover)
- Isolated failures

**Considerations**:
- Atomic claiming prevents conflicts
- Shared MongoDB instance
- Coordinated graceful shutdown

### Vertical Scaling

```
Single Instance:
- Increase concurrency (10 → 50 workers)
- More CPU cores
- More memory
- Optimize handlers

Limits:
- Node.js event loop saturation (~50-100 workers)
- Memory constraints
- MongoDB connection pool size
```

EOF