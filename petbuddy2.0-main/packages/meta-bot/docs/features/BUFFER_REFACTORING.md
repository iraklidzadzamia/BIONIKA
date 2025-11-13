# Chat Buffer Refactoring

## Problem
The previous buffer logic was overly complex with:
- Race condition handling with flush IDs
- Scattered buffer management across controllers
- Difficult to understand and maintain code
- Complex timeout tracking

## Solution
Created a **simple, centralized buffer manager** that handles the core use case:

### Use Case
When a user sends one sentence in multiple SMS messages:
```
User: "Hi, I need to"
User: "book an appointment"
User: "for my dog tomorrow"
```

The bot should wait until the user finishes typing, then process all messages together as one complete thought.

## Implementation

### 1. Simplified Buffer Manager ([bufferManager.js](core/bufferManager.js))

**Key Features:**
- Single method: `addMessage()` - adds message and resets timer
- Automatic timer reset when user sends another message
- Simple callback pattern: `onFlush` called when user stops typing
- Automatic cleanup of stale buffers (memory leak prevention)

**How it works:**
```javascript
messageBuffer.addMessage(senderId, {
  customer,
  company,
  delayMs: 4000, // Wait 4 seconds after last message
  onFlush: async (customer, company) => {
    // Process all accumulated messages
    await processWithAI(customer, company);
  }
});
```

### 2. Updated Controllers

**Facebook ([facebook.controller.js](controllers/facebook.controller.js)):**
- Removed ~80 lines of complex buffer logic
- Removed race condition handling (flush IDs)
- Simple `addMessage()` call instead

**Instagram ([instagram.controller.js](controllers/instagram.controller.js)):**
- Same simplification
- Consistent pattern across both platforms

## Benefits

✅ **Simple** - Single method call, clear purpose
✅ **Maintainable** - Easy to understand and modify
✅ **No Race Conditions** - Built-in protection
✅ **Memory Safe** - Automatic cleanup of stale buffers
✅ **Testable** - Clear interface for testing
✅ **Centralized** - One source of truth for buffer logic

## How It Works

```
User sends message 1 → Start 4s timer
User sends message 2 → Cancel timer, start new 4s timer
User sends message 3 → Cancel timer, start new 4s timer
[4 seconds pass] → Timer fires → Process all messages → Clean up
```

## Configuration

### Per-Company Settings (Dynamic)

Each company can configure their own response delays in `company.bot.responseDelay`:

```javascript
{
  bot: {
    responseDelay: {
      standard: 4000,      // Standard delay for mid-sentence messages (default: 4000ms)
      sentenceEnd: 1000    // Shorter delay when message ends with punctuation (default: 1000ms)
    }
  }
}
```

**Defaults if not configured:**
- `standard`: 4000ms (4 seconds)
- `sentenceEnd`: Falls back to `standard / 4`

**Valid ranges:**
- `standard`: 500ms - 10000ms (0.5s - 10s)
- `sentenceEnd`: 250ms - 5000ms (0.25s - 5s)

### System Constants

Timing constants in [constants.js](core/constants.js):
- `RESPONSE_DELAY_MS`: 4000ms (fallback if company setting not configured)
- `BUFFER_CLEANUP_INTERVAL`: 10 minutes (cleanup frequency)
- `STALE_BUFFER_THRESHOLD`: 5 minutes (when to clean up idle buffers)

## Testing

The buffer manager can be tested by:
1. Sending rapid messages
2. Verifying only one AI processing occurs
3. Verifying it happens after the delay
4. Checking buffer is cleaned up after processing

## Migration Notes

**Removed:**
- `conversationBuffers` Map (replaced by `messageBuffer`)
- `cleanupBuffer()` function (built into manager)
- `cleanupStaleBuffers()` function (automatic)
- Flush ID tracking (no longer needed)
- Race condition workarounds

**Added:**
- `ConversationBufferManager` import
- Simple `addMessage()` calls
- Consistent pattern across platforms
