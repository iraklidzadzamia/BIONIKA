# Work Buffer System Documentation

## Overview

The Work Buffer System is a production-ready message buffering and processing system built for the PetBuddy backend. It provides:

- **Durable message persistence** with MongoDB
- **At-least-once delivery** semantics
- **Configurable concurrency** and backpressure
- **Automatic retries** with exponential backoff
- **Circuit breaker** pattern for failing handlers
- **Dead letter queue** for poison messages
- **Graceful shutdown** with message draining
- **Comprehensive metrics** and monitoring

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Work Buffer System                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐    ┌──────────────┐    ┌─────────────────┐  │
│  │   WorkBuffer │───▶│   Processor  │───▶│  Handler        │  │
│  │   (Queue)    │    │   (Router)   │    │  (Strategy)     │  │
│  └──────┬───────┘    └──────────────┘    └─────────────────┘  │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────┐    ┌──────────────┐    ┌─────────────────┐  │
│  │ BufferStore  │───▶│   MongoDB    │    │  Dead Letter    │  │
│  │ (Persistence)│    │   (Durable)  │    │  Queue (DLQ)    │  │
│  └──────────────┘    └──────────────┘    └─────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Components

1. **WorkBuffer** - Core queue manager with worker pool
   - Polls for messages from BufferStore
   - Spawns workers for concurrent processing
   - Manages lifecycle (start/stop/drain)
   - Emits events for monitoring

2. **BufferStore** - MongoDB persistence layer
   - Atomic message claiming (prevents double processing)
   - CRUD operations for messages
   - Cleanup of old messages
   - Statistics and monitoring

3. **MessageProcessor** - Handler registry and router
   - Routes messages to appropriate handlers
   - Enforces timeouts
   - Circuit breaker for failing handlers
   - Structured error handling

4. **MessageHandler** - Abstract base class for handlers
   - Implement `process()` method
   - Optional validation and error handling hooks
   - Configurable timeout and retry behavior

5. **DeadLetterQueue** - Poison message quarantine
   - Stores permanently failed messages
   - Supports inspection and replay
   - Alerting when threshold exceeded

## Data Flow

```
1. Message Enqueued
   ├─> Validate and normalize
   ├─> Check idempotency
   ├─> Save to MongoDB (PENDING state)
   └─> Trigger immediate poll

2. Worker Claims Message
   ├─> Atomic update (PENDING → PROCESSING)
   ├─> Set visibility timeout
   └─> Increment attempt count

3. Processing
   ├─> Validate payload
   ├─> Check circuit breaker
   ├─> Execute handler with timeout
   └─> Handle result

4a. Success Path
    ├─> Mark COMPLETED
    ├─> Save result (optional)
    ├─> Set TTL for cleanup
    └─> Emit 'completed' event

4b. Failure Path
    ├─> Record error
    ├─> Check retry count
    ├─> If retries remaining:
    │   ├─> Calculate backoff delay
    │   ├─> Reset to PENDING
    │   └─> Set future visibleAt
    └─> If max retries exceeded:
        ├─> Mark FAILED
        ├─> Move to DLQ
        └─> Emit 'dlq' event
```

## Configuration

### Environment Variables

```bash
# Worker pool
BUFFER_CONCURRENCY=10                    # Number of concurrent workers
BUFFER_MAX_QUEUE_SIZE=10000              # Maximum pending messages

# Retry configuration
BUFFER_MAX_RETRIES=5                     # Maximum retry attempts
BUFFER_RETRY_BACKOFF_MS=1000            # Base backoff delay (1 second)
BUFFER_RETRY_BACKOFF_MAX_MS=60000       # Max backoff delay (1 minute)
BUFFER_RETRY_MULTIPLIER=2               # Exponential multiplier

# Timeouts
BUFFER_MESSAGE_TIMEOUT_MS=30000         # Processing timeout (30 seconds)
BUFFER_VISIBILITY_TIMEOUT_MS=60000      # Visibility timeout (1 minute)
BUFFER_SHUTDOWN_TIMEOUT_MS=30000        # Shutdown timeout (30 seconds)

# Circuit breaker
BUFFER_CIRCUIT_BREAKER_ENABLED=true     # Enable circuit breaker
BUFFER_CIRCUIT_BREAKER_THRESHOLD=5      # Failures before opening
BUFFER_CIRCUIT_BREAKER_TIMEOUT_MS=60000 # Circuit open duration (1 minute)

# Monitoring
BUFFER_METRICS_ENABLED=true             # Enable metrics emission
BUFFER_METRICS_INTERVAL_MS=30000        # Metrics interval (30 seconds)
BUFFER_LOG_LEVEL=info                   # Log level (error/warn/info/debug)

# Persistence
BUFFER_PERSISTENCE_ENABLED=true         # Enable MongoDB persistence
BUFFER_COLLECTION=work_buffer_messages  # MongoDB collection name
BUFFER_DLQ_COLLECTION=work_buffer_dlq   # DLQ collection name

# Idempotency
BUFFER_IDEMPOTENCY_ENABLED=true         # Enable idempotency checking
BUFFER_IDEMPOTENCY_TTL_MS=86400000      # Idempotency TTL (24 hours)
```

### Programmatic Configuration

```javascript
import { WorkBuffer } from './workbuffer/index.js';

const workBuffer = new WorkBuffer({
  config: {
    concurrency: 10,
    maxRetries: 5,
    retryBackoffBase: 1000,
    retryBackoffMax: 60000,
    retryBackoffMultiplier: 2,
    messageTimeout: 30000,
    maxQueueSize: 10000,
    metricsEnabled: true,
    circuitBreakerEnabled: true,
  },
});
```

## Usage Examples

### Basic Setup

```javascript
import { WorkBuffer } from './workbuffer/index.js';
import { SocketEmissionHandler } from './workbuffer/handlers/SocketEmissionHandler.js';
import { MetaBotForwardingHandler } from './workbuffer/handlers/MetaBotForwardingHandler.js';

// Create work buffer
const workBuffer = new WorkBuffer({
  config: { concurrency: 5, maxRetries: 3 },
});

// Register handlers
workBuffer.registerHandler(new SocketEmissionHandler());
workBuffer.registerHandler(new MetaBotForwardingHandler());

// Start processing
await workBuffer.start();
```

### Creating Custom Handlers

```javascript
import { MessageHandler } from './workbuffer/handlers/MessageHandler.js';

class EmailHandler extends MessageHandler {
  constructor() {
    super('email', {
      timeout: 10000,
      idempotent: true,
      maxRetries: 3,
    });
  }

  async validate(payload) {
    if (!payload.to || !payload.subject) {
      throw new Error('Invalid email payload');
    }
    return true;
  }

  async process(message, context) {
    const { to, subject, body } = message.payload;
    
    // Check for cancellation
    if (context.signal.aborted) {
      throw new Error('Processing cancelled');
    }

    await sendEmail(to, subject, body);
    return { sent: true, timestamp: new Date() };
  }

  async onError(error, message) {
    // Don't retry validation errors
    if (error.message.includes('Invalid')) {
      return false;
    }
    // Retry network errors
    return ['ETIMEDOUT', 'ECONNREFUSED'].includes(error.code);
  }
}

workBuffer.registerHandler(new EmailHandler());
```

### Enqueueing Messages

```javascript
// Simple message
await workBuffer.enqueue({
  type: 'email',
  payload: {
    to: 'user@example.com',
    subject: 'Welcome',
    body: 'Welcome to our service',
  },
});

// With priority
await workBuffer.enqueue({
  type: 'socket-emission',
  payload: { eventType: 'appointment:created', data: {...} },
  priority: 'CRITICAL', // or 'HIGH', 'NORMAL', 'LOW'
});

// With idempotency
await workBuffer.enqueue({
  type: 'email',
  payload: {...},
  idempotencyKey: 'daily-report-2024-01-15',
});

// With metadata
await workBuffer.enqueue({
  type: 'metabot-forwarding',
  payload: {...},
  metadata: {
    userId: 'user-123',
    companyId: 'company-456',
    correlationId: 'req-789',
  },
});

// Delayed message
await workBuffer.enqueue({
  type: 'email',
  payload: {...},
  visibilityDelayMs: 300000, // 5 minutes
});
```

### Event Handling

```javascript
workBuffer.on('enqueued', ({ messageId, type, priority }) => {
  console.log(`Message enqueued: ${messageId}`);
});

workBuffer.on('processing', ({ messageId, type, attemptCount }) => {
  console.log(`Processing message: ${messageId} (attempt ${attemptCount})`);
});

workBuffer.on('completed', ({ messageId, type, result, processingTime }) => {
  console.log(`Message completed: ${messageId} in ${processingTime}ms`);
});

workBuffer.on('failed', ({ messageId, type, error, willRetry, retryDelay }) => {
  if (willRetry) {
    console.warn(`Message failed: ${messageId}, retrying in ${retryDelay}ms`);
  } else {
    console.error(`Message failed permanently: ${messageId}`);
  }
});

workBuffer.on('dlq', ({ messageId, type, reason }) => {
  console.error(`Message moved to DLQ: ${messageId} - ${reason}`);
  // Alert ops team
});

workBuffer.on('metrics', (metrics) => {
  console.log('Buffer metrics:', metrics);
  // Send to monitoring system
});

workBuffer.on('error', (error) => {
  console.error('Buffer error:', error);
  // Alert ops team
});
```

### Monitoring and Statistics

```javascript
// Get real-time statistics
const stats = await workBuffer.getStats();
console.log({
  pending: stats.pending,
  processing: stats.processing,
  completed: stats.completed,
  failed: stats.failed,
  dlq: stats.dlq,
  activeWorkers: stats.activeWorkers,
  isRunning: stats.isRunning,
});

// Check circuit breaker status
const handlerTypes = workBuffer.getHandlerTypes();
for (const type of handlerTypes) {
  const state = workBuffer.processor.getCircuitState(type);
  console.log(`${type}: ${state}`);
}

// Reset circuit breaker
workBuffer.processor.resetCircuitBreaker('email');
```

### Graceful Shutdown

```javascript
// Shutdown with drain (wait for current messages)
await workBuffer.stop({
  drain: true,
  timeout: 30000, // 30 seconds
});

// Force shutdown (cancel current messages)
await workBuffer.stop({
  drain: false,
});

// Handle SIGTERM
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down...');
  await workBuffer.stop({ drain: true, timeout: 30000 });
  process.exit(0);
});
```

### Dead Letter Queue Management

```javascript
import { DeadLetterQueue } from './workbuffer/index.js';

const dlq = new DeadLetterQueue();

// Get DLQ messages
const messages = await dlq.getMessages(100);

// Get DLQ count
const count = await dlq.getCount();

// Get DLQ statistics
const stats = await dlq.getStats();

// Replay a message
await dlq.replayMessage('message-123');

// Delete a message
await dlq.deleteMessage('message-123');

// Check and alert
const { alert, count } = await dlq.checkAndAlert();
if (alert) {
  console.error(`DLQ threshold exceeded: ${count} messages`);
}
```

## Performance Characteristics

### Throughput

- **Enqueue**: ~1000-5000 messages/second (limited by MongoDB writes)
- **Processing**: Depends on handler implementation
- **Concurrency**: 1-100 workers (configurable)
- **Batch size**: 10 messages per poll (configurable)

### Latency

- **Enqueue latency**: ~1-5ms (MongoDB write)
- **Processing start latency**: ~100ms (poll interval)
- **End-to-end latency**: Depends on handler + retries
- **Priority messages**: Processed first (FIFO within priority)

### Resource Usage

- **Memory**: ~10-50MB baseline + (concurrency × message size)
- **CPU**: Low (~5%) when idle, scales with concurrency
- **Database**: One collection per system + indexes
- **Network**: Depends on handler external calls

## Monitoring and Alerting

### Key Metrics

1. **Queue Depth** (`stats.pending`)
   - Alert if > 1000 for > 5 minutes
   - Indicates backpressure or slow handlers

2. **Processing Time** (`metrics.avgProcessingTimeMs`)
   - Alert if > 10 seconds consistently
   - Indicates slow handlers or timeouts

3. **Failed Rate** (`metrics.failed / metrics.completed`)
   - Alert if > 5% for > 10 minutes
   - Indicates handler issues or external service problems

4. **DLQ Count** (`stats.dlq`)
   - Alert if > 10 messages
   - Requires manual investigation

5. **Circuit Breaker Status**
   - Alert when circuit opens
   - Indicates repeated handler failures

### Recommended Alerts

```javascript
// Queue depth alert
if (stats.pending > 1000) {
  alert('Work buffer queue depth exceeded 1000');
}

// DLQ alert
if (stats.dlq > 10) {
  alert('Dead letter queue has more than 10 messages');
}

// Circuit breaker alert
const circuits = workBuffer.processor.getAllCircuitStates();
for (const [type, state] of Object.entries(circuits)) {
  if (state === 'open') {
    alert(`Circuit breaker OPEN for handler: ${type}`);
  }
}

// High failure rate
const failureRate = metrics.failed / (metrics.completed + metrics.failed);
if (failureRate > 0.05) {
  alert(`High failure rate: ${(failureRate * 100).toFixed(2)}%`);
}
```

### Logging

All operations are logged with structured data:

```
[WorkBuffer] Message enqueued { messageId, type, priority }
[MessageProcessor] Message processed { messageId, type, processingTime }
[CircuitBreaker] Circuit opened { failureCount, nextRetryTime }
[DeadLetterQueue] Message moved to DLQ { messageId, type, reason }
```

## Operational Checklist

### Deployment

- [ ] Set environment variables for production
- [ ] Configure concurrency based on load
- [ ] Enable metrics and monitoring
- [ ] Set up alerting for DLQ and circuit breakers
- [ ] Test graceful shutdown
- [ ] Verify MongoDB indexes are created
- [ ] Configure log aggregation

### Monitoring

- [ ] Dashboard for queue depth
- [ ] Dashboard for processing times
- [ ] Dashboard for failure rates
- [ ] Alerts for DLQ threshold
- [ ] Alerts for circuit breaker status
- [ ] Regular DLQ inspection

### Maintenance

- [ ] Review DLQ messages weekly
- [ ] Monitor MongoDB disk usage
- [ ] Review and adjust retry configuration
- [ ] Review handler timeouts
- [ ] Test handler idempotency
- [ ] Load test before scaling

### Troubleshooting

**Queue depth growing:**
- Increase concurrency
- Optimize slow handlers
- Scale horizontally (multiple workers)
- Check for circuit breaker open

**High failure rate:**
- Check handler logs
- Review error codes
- Check external service health
- Adjust retry configuration

**Messages stuck in processing:**
- Check visibility timeout
- Review handler timeout configuration
- Look for deadlocks in handlers

**DLQ messages:**
- Inspect message payload
- Review error stack traces
- Fix handler bugs
- Replay after fix

## Best Practices

1. **Idempotency**: Always design handlers to be idempotent
2. **Timeouts**: Set appropriate timeouts for each handler
3. **Validation**: Validate payloads early to avoid retries
4. **Error Handling**: Distinguish between retryable and permanent errors
5. **Monitoring**: Monitor all key metrics continuously
6. **Testing**: Test handlers with various failure scenarios
7. **Documentation**: Document handler payload schemas
8. **Graceful Degradation**: Use circuit breakers effectively
9. **Cleanup**: Configure TTLs for automatic cleanup
10. **Backpressure**: Monitor queue depth and scale accordingly

## Security Considerations

1. **Input Validation**: Always validate message payloads
2. **Access Control**: Restrict enqueue endpoints
3. **Sensitive Data**: Avoid storing secrets in payloads
4. **Audit Logging**: Log all DLQ operations
5. **Rate Limiting**: Protect enqueue endpoints
6. **MongoDB Security**: Use authentication and encryption

## Migration Guide

### From Direct Socket Emissions

**Before:**
```javascript
emitAppointmentCreated(appointment);
```

**After:**
```javascript
await workBuffer.enqueue({
  type: 'socket-emission',
  payload: {
    eventType: 'appointment:created',
    data: appointment,
  },
  priority: 'HIGH',
});
```

### From Synchronous Meta Bot Forwarding

**Before:**
```javascript
await axios.post(metaBotUrl, message);
```

**After:**
```javascript
await workBuffer.enqueue({
  type: 'metabot-forwarding',
  payload: {
    messageId: message._id,
    companyId: message.companyId,
    contactId: message.contactId,
    text: message.text,
    platform: message.platform,
  },
  priority: 'NORMAL',
  metadata: { correlationId: req.id },
});
```

## Support

For issues or questions:
- Check logs in `/logs/` directory
- Review MongoDB `work_buffer_messages` collection
- Inspect DLQ messages
- Check circuit breaker status
- Review metrics dashboard

## License

MIT
