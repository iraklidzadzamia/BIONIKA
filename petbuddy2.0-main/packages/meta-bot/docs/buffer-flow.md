# Message Buffer Flow Diagram

## Overview
The message buffer ensures that when users send multiple messages in quick succession, the bot waits for them to finish before responding with context from all messages.

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Types Messages                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Message arrives │
                    │  (via webhook)   │
                    └──────────────────┘
                              │
                              ▼
                   ┌────────────────────┐
                   │ Save to database   │
                   └────────────────────┘
                              │
                              ▼
                   ┌────────────────────┐
                   │ Check bot eligibility│
                   │ (suspended? hours?) │
                   └────────────────────┘
                              │
                              ▼
                    ╔═══════════════════╗
                    ║  Buffer Manager   ║
                    ╚═══════════════════╝
                              │
            ┌─────────────────┼─────────────────┐
            │                 │                 │
            ▼                 ▼                 ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │ First message│  │More messages │  │ Timer expires│
    └──────────────┘  └──────────────┘  └──────────────┘
            │                 │                 │
            ▼                 ▼                 ▼
    Create buffer      Cancel old timer   Process messages
    Start 4s timer     Start new timer    with LLM
            │                 │                 │
            └─────────────────┴─────────────────┘
                              │
                              ▼
                   ┌────────────────────┐
                   │  Get conversation  │
                   │     history        │
                   └────────────────────┘
                              │
                              ▼
                   ┌────────────────────┐
                   │ Process with LLM   │
                   │   (LangGraph)      │
                   └────────────────────┘
                              │
                              ▼
                   ┌────────────────────┐
                   │ Send response      │
                   │ Save to database   │
                   └────────────────────┘
                              │
                              ▼
                   ┌────────────────────┐
                   │  Clean up buffer   │
                   └────────────────────┘
```

## Example Timeline

```
Time  Event                          Buffer State
────────────────────────────────────────────────────────────────
0ms   User: "Hi, I need"            Buffer created, timer: 4000ms
1000  User: "to book"               Timer reset, new timer: 4000ms
2000  User: "an appointment"        Timer reset, new timer: 4000ms
3000  User: "for tomorrow"          Timer reset, new timer: 4000ms
7000  [Timer fires]                 Process all 4 messages together
7500  Bot responds                  Buffer deleted
```

## Code Flow

### When Message Arrives

```javascript
// 1. Message is saved to database
await saveMessage(customer._id, company._id, text, "inbound", messageId);

// 2. Check if bot should respond
if (!(await canBotRespond(customer, company))) {
  return; // Bot suspended or outside hours
}

// 3. Add to buffer (automatic timer management)
messageBuffer.addMessage(senderId, {
  customer,
  company,
  delayMs: 4000, // Wait 4 seconds
  onFlush: async (customer, company) => {
    // This runs when timer expires (user stopped typing)
    await processWithAI(customer, company);
  }
});
```

### Inside Buffer Manager

```javascript
addMessage(senderId, { customer, company, onFlush, delayMs }) {
  // Get or create buffer
  let buffer = this.buffers.get(senderId);

  if (!buffer) {
    // First message - create new buffer
    buffer = { timeoutId: null, lastActivity: Date.now() };
    this.buffers.set(senderId, buffer);
  } else {
    // Another message - cancel old timer
    clearTimeout(buffer.timeoutId);
  }

  // Update buffer data
  buffer.customer = customer;
  buffer.company = company;
  buffer.lastActivity = Date.now();

  // Set new timer
  buffer.timeoutId = setTimeout(() => {
    // User stopped typing - process messages
    onFlush(buffer.customer, buffer.company);

    // Clean up
    this.buffers.delete(senderId);
  }, delayMs);
}
```

## Benefits

### Before (Complex)
- ~100 lines of buffer logic per controller
- Race condition handling with flush IDs
- Manual timeout tracking
- Easy to introduce bugs

### After (Simple)
- ~15 lines of buffer logic per controller
- No race conditions (automatic)
- Automatic cleanup
- Clear, maintainable code

## Edge Cases Handled

1. **User sends messages faster than delay**: Timer keeps resetting
2. **User stops in middle of sentence**: Timer expires, bot responds
3. **Error during processing**: Buffer is cancelled via `messageBuffer.cancel(senderId)`
4. **Stale buffers**: Automatic cleanup every 10 minutes
5. **Memory leaks**: Maximum buffer size limits, automatic expiry
