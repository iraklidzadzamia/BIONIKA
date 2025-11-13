# Dynamic Buffer Delay Configuration

## Summary

The buffer delay is now **configurable per company** instead of being hardcoded. Each company can customize how long the bot waits before responding based on their business needs.

## Changes Made

### 1. Company Model Schema ([Company.js](../shared/src/models/Company.js:71-75))

Added new fields to `botConfigSchema`:

```javascript
responseDelay: {
  standard: { type: Number, default: 4000, min: 500, max: 10000 },
  sentenceEnd: { type: Number, default: 1000, min: 250, max: 5000 }
}
```

### 2. Facebook Controller ([facebook.controller.js](controllers/facebook.controller.js:822-826))

Updated to read from company settings:

```javascript
const standardDelay = company.bot?.responseDelay?.standard || RESPONSE_DELAY_MS;
const sentenceEndDelay = company.bot?.responseDelay?.sentenceEnd || Math.floor(standardDelay / 4);
const delayMs = isSentenceEnd ? sentenceEndDelay : standardDelay;
```

### 3. Instagram Controller ([instagram.controller.js](controllers/instagram.controller.js:1152-1156))

Same pattern as Facebook:

```javascript
const standardDelay = company.bot?.responseDelay?.standard || RESPONSE_DELAY_MS;
const sentenceEndDelay = company.bot?.responseDelay?.sentenceEnd || Math.floor(standardDelay / 4);
const delayMs = isSentenceEnd ? sentenceEndDelay : standardDelay;
```

## How It Works

### Two Types of Delays

1. **Standard Delay** (`company.bot.responseDelay.standard`)
   - Used when message does NOT end with punctuation
   - Default: 4000ms (4 seconds)
   - Example: "I need to" → wait 4 seconds for more messages

2. **Sentence End Delay** (`company.bot.responseDelay.sentenceEnd`)
   - Used when message ENDS with `.`, `!`, `?`, or `…`
   - Default: 1000ms (1 second)
   - Example: "I need an appointment." → wait only 1 second

### Smart Detection

```javascript
const isSentenceEnd = /[.!?…]\s*$/.test(messageText);
```

The system automatically detects if a message ends with punctuation and uses the appropriate delay.

## Configuration Examples

### Default (No Configuration)

If `company.bot.responseDelay` is not set:
- Standard: 4000ms
- Sentence End: 1000ms

### Fast Response (Emergency Services)

```javascript
{
  bot: {
    responseDelay: {
      standard: 2000,      // 2 seconds
      sentenceEnd: 500     // 0.5 seconds
    }
  }
}
```

### Standard Response (Most Businesses)

```javascript
{
  bot: {
    responseDelay: {
      standard: 4000,      // 4 seconds
      sentenceEnd: 1000    // 1 second
    }
  }
}
```

### Relaxed Response (High-Touch Services)

```javascript
{
  bot: {
    responseDelay: {
      standard: 6000,      // 6 seconds
      sentenceEnd: 2000    // 2 seconds
    }
  }
}
```

## Benefits

✅ **Per-Company Customization**: Each business sets their own timing
✅ **Smart Detection**: Automatically adapts to message type
✅ **Backward Compatible**: Works without configuration (uses defaults)
✅ **Validated**: Schema enforces reasonable limits
✅ **Logged**: Delays are tracked in logs for debugging

## Logging

Logs now include delay type information:

```javascript
logger.messageFlow.processing(
  "facebook",
  messageId,
  senderId,
  "buffering",
  "Buffering message (4000ms delay)",
  {
    is_sentence_end: false,
    delay_type: 'standard'  // or 'sentence_end'
  }
);
```

## Usage in Admin Panel (Future)

When implementing the admin UI, add these fields to the bot configuration form:

```html
<form>
  <label>Standard Delay (milliseconds)</label>
  <input
    type="number"
    name="bot.responseDelay.standard"
    min="500"
    max="10000"
    value="4000"
    placeholder="4000"
  />
  <small>How long to wait for mid-sentence messages (500-10000ms)</small>

  <label>Sentence End Delay (milliseconds)</label>
  <input
    type="number"
    name="bot.responseDelay.sentenceEnd"
    min="250"
    max="5000"
    value="1000"
    placeholder="1000"
  />
  <small>How long to wait for complete sentences (250-5000ms)</small>
</form>
```

## Migration

**No migration needed!** The system gracefully handles missing values:

1. If `company.bot.responseDelay` doesn't exist → uses defaults
2. If `company.bot.responseDelay.standard` is missing → uses 4000ms
3. If `company.bot.responseDelay.sentenceEnd` is missing → uses `standard / 4`

### Optional: Set Values for All Companies

```javascript
// Optional migration to explicitly set defaults
await Company.updateMany(
  { 'bot.responseDelay': { $exists: false } },
  {
    $set: {
      'bot.responseDelay': {
        standard: 4000,
        sentenceEnd: 1000
      }
    }
  }
);
```

## Testing

### Test Standard Delay

```bash
# Send rapid messages without punctuation
User: "Hi"
User: "I need"
User: "an appointment"

# Bot should wait [standard] ms after last message
# Then process all 3 together
```

### Test Sentence End Delay

```bash
# Send complete sentence
User: "I need an appointment for tomorrow."

# Bot should wait only [sentenceEnd] ms
# Then respond quickly
```

### Verify in Logs

Look for these log entries:

```
buffer-set: Buffering response for 4000ms
  {
    is_sentence_end: false,
    delay_type: 'standard'
  }
```

## Documentation

- [Buffer Configuration Guide](docs/buffer-configuration.md) - Complete setup guide
- [Buffer Refactoring](BUFFER_REFACTORING.md) - Technical overview
- [Buffer Flow](docs/buffer-flow.md) - Visual diagrams

## Related Files

- [Company.js](../shared/src/models/Company.js) - Schema definition
- [facebook.controller.js](controllers/facebook.controller.js) - Facebook implementation
- [instagram.controller.js](controllers/instagram.controller.js) - Instagram implementation
- [bufferManager.js](core/bufferManager.js) - Buffer manager (no changes needed)
