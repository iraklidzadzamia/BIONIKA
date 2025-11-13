# Buffer Configuration Guide

## Overview

The chat buffer system now supports **per-company configuration** of response delays. This allows each business to customize how quickly the bot responds based on their preferences and customer interaction patterns.

## Company Schema

The configuration is stored in the `Company` model under `bot.responseDelay`:

```javascript
{
  bot: {
    responseDelay: {
      standard: 4000,      // Delay for mid-sentence messages (ms)
      sentenceEnd: 1000    // Delay for messages ending with punctuation (ms)
    }
  }
}
```

## Configuration Options

### `standard` (default: 4000ms)

Time to wait after receiving a message before processing, if the message does NOT end with sentence-ending punctuation.

- **Use case**: User is typing multiple messages to complete a thought
- **Example**: "I need to", "book an appointment", "for my dog"
- **Range**: 500-10000ms (0.5s - 10s)
- **Recommended**: 3000-5000ms for most businesses

### `sentenceEnd` (default: 1000ms)

Time to wait after receiving a message that ENDS with punctuation (`.`, `!`, `?`, `…`).

- **Use case**: User has likely completed their thought
- **Example**: "I need to book an appointment for my dog."
- **Range**: 250-5000ms (0.25s - 5s)
- **Recommended**: 800-1500ms for most businesses

## How It Works

### Detection Logic

```javascript
const isSentenceEnd = /[.!?…]\s*$/.test(messageText);
```

Messages ending with these characters are considered complete sentences:
- `.` (period)
- `!` (exclamation)
- `?` (question mark)
- `…` (ellipsis)

### Delay Selection

```javascript
const standardDelay = company.bot?.responseDelay?.standard || 4000;
const sentenceEndDelay = company.bot?.responseDelay?.sentenceEnd || Math.floor(standardDelay / 4);
const delayMs = isSentenceEnd ? sentenceEndDelay : standardDelay;
```

**Fallback behavior:**
1. If `company.bot.responseDelay.standard` is not set → use 4000ms
2. If `company.bot.responseDelay.sentenceEnd` is not set → use `standard / 4`

## Setting Up for a Company

### Option 1: Via MongoDB (Direct)

```javascript
await Company.findByIdAndUpdate(companyId, {
  'bot.responseDelay': {
    standard: 3500,      // 3.5 seconds for mid-sentence
    sentenceEnd: 1200    // 1.2 seconds for complete sentences
  }
});
```

### Option 2: Via API (Future)

When the admin panel is implemented:

```javascript
POST /api/companies/:id/bot-settings
{
  "responseDelay": {
    "standard": 3500,
    "sentenceEnd": 1200
  }
}
```

## Use Cases & Recommendations

### Fast-Paced Business (e.g., Emergency Vet)

```javascript
{
  standard: 2000,        // 2 seconds - respond quickly
  sentenceEnd: 500       // 0.5 seconds - very fast for emergencies
}
```

### Standard Business (e.g., Grooming Salon)

```javascript
{
  standard: 4000,        // 4 seconds - default
  sentenceEnd: 1000      // 1 second - quick but not rushed
}
```

### High-Touch Service (e.g., Luxury Boarding)

```javascript
{
  standard: 6000,        // 6 seconds - give customers time
  sentenceEnd: 2000      // 2 seconds - thoughtful responses
}
```

## Migration for Existing Companies

Existing companies without this configuration will use the defaults:
- `standard`: 4000ms
- `sentenceEnd`: 1000ms

**No migration required** - the system handles missing values gracefully.

### Optional: Bulk Update All Companies

If you want to set specific values for all existing companies:

```javascript
// migration-script.js
import Company from '@petbuddy/shared/models/Company.js';

async function migrateResponseDelays() {
  const result = await Company.updateMany(
    { 'bot.responseDelay': { $exists: false } }, // Only companies without config
    {
      $set: {
        'bot.responseDelay': {
          standard: 4000,
          sentenceEnd: 1000
        }
      }
    }
  );

  console.log(`Updated ${result.modifiedCount} companies`);
}

migrateResponseDelays();
```

## Testing

### Test Rapid Messages

1. Send multiple messages quickly:
   ```
   "Hi"
   "I need"
   "an appointment"
   ```
2. Bot should wait `standard` ms after the last message
3. Then process all 3 messages together

### Test Complete Sentence

1. Send a complete sentence:
   ```
   "I need an appointment for tomorrow."
   ```
2. Bot should wait only `sentenceEnd` ms
3. Then respond quickly

### Verify Timing

Check logs for delay information:
```
buffer-set: Buffering response for 4000ms
  { is_sentence_end: false, delay_type: 'standard' }
```

or

```
buffer-set: Buffering response for 1000ms
  { is_sentence_end: true, delay_type: 'sentence_end' }
```

## Benefits

✅ **Flexible**: Each company can customize timing
✅ **Smart**: Automatic detection of sentence completion
✅ **Safe**: Defaults ensure it works without configuration
✅ **Validated**: Schema enforces reasonable ranges
✅ **Backward Compatible**: Existing companies continue working

## Schema Validation

The Company model enforces these constraints:

```javascript
responseDelay: {
  standard: {
    type: Number,
    default: 4000,
    min: 500,    // Minimum 0.5 seconds
    max: 10000   // Maximum 10 seconds
  },
  sentenceEnd: {
    type: Number,
    default: 1000,
    min: 250,    // Minimum 0.25 seconds
    max: 5000    // Maximum 5 seconds
  }
}
```

Invalid values will be rejected by Mongoose.

## Troubleshooting

### Bot responding too quickly
- Increase `sentenceEnd` value
- Check if messages are being detected as sentence-end incorrectly

### Bot responding too slowly
- Decrease `standard` value
- Consider if your users typically send complete sentences vs fragments

### Inconsistent timing
- Check company configuration is saved correctly
- Verify logs show correct `delay_type`
- Ensure punctuation detection is working as expected
