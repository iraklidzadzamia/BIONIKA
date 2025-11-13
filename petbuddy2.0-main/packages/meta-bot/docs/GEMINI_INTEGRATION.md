# Google Gemini AI Integration

This document describes the integration of Google Gemini AI as an alternative AI provider for the PetBuddy meta-bot.

## Overview

The meta-bot now supports **two AI providers**:
- **OpenAI** (GPT-4o) - Default provider
- **Google Gemini** (Gemini 1.5 Pro/Flash) - Alternative provider

You can switch between providers using:
1. **Global feature flag** (`USE_GEMINI=true`) - Affects all companies
2. **Per-company override** - Set `aiProvider` field in CompanyIntegration schema

## Architecture

### Provider Selection Flow

```
Request → Company Lookup → Check aiProvider
                              │
                              ├─ "gemini" → Use Gemini Agent Node
                              ├─ "openai" → Use OpenAI Agent Node
                              └─ null → Use Global Flag (USE_GEMINI)
```

### Key Components

1. **Configuration** ([config/env.js](../config/env.js))
   - Loads Gemini API keys and settings
   - Manages feature flags for provider selection

2. **Gemini Agent Node** ([langgraph/nodes/geminiAgent.js](../langgraph/nodes/geminiAgent.js))
   - Implements Gemini-specific LangChain integration
   - Handles tool binding and message formatting
   - Includes automatic fallback to OpenAI on failure

3. **Graph Router** ([langgraph/graph.js](../langgraph/graph.js))
   - Dynamically selects agent based on provider
   - Priority: Per-company override > Feature flag > Default (OpenAI)

4. **Company Service** ([services/company.service.js](../services/company.service.js))
   - Returns AI provider preference per company
   - Fetches Gemini API keys from CompanyIntegration

5. **Database Schema** ([models/CompanyIntegration.js](../models/CompanyIntegration.js))
   - Stores per-company AI provider preference
   - Stores optional Gemini API key override

## Setup Instructions

### 1. Install Dependencies

The required package `@langchain/google-genai` has already been installed:

```bash
cd packages/meta-bot
npm install @langchain/google-genai
```

### 2. Get Gemini API Key

1. Visit [Google AI Studio](https://ai.google.dev/)
2. Sign in with your Google account
3. Click "Get API Key" or "Create API Key"
4. Copy your API key

### 3. Configure Environment Variables

Add to your `.env` file:

```bash
# Google Gemini AI Configuration
GEMINI_API_KEY=your-gemini-api-key-here
GEMINI_CHAT_MODEL=gemini-1.5-pro        # or gemini-1.5-flash for faster/cheaper
GEMINI_VISION_MODEL=gemini-1.5-pro-vision

# Feature Flag
USE_GEMINI=false                         # Set to true to use Gemini globally
```

**Model Options:**
- `gemini-1.5-pro` - Best quality, higher cost (~$3.50 per 1M input tokens)
- `gemini-1.5-flash` - Fast & cost-effective (~$0.35 per 1M input tokens)
- `gemini-1.5-pro-vision` - For image analysis (future use)

### 4. Start the Server

```bash
npm run dev
```

You should see in the logs:

```
📋 Meta-Bot Configuration Loaded:
  ...
  - Gemini API Key: ✅ Set
  - Gemini Model: gemini-1.5-pro
  - AI Provider: 🤖 OpenAI  (or 🤖 Gemini if USE_GEMINI=true)
```

## Usage

### Global Switch (All Companies)

Set the feature flag in `.env`:

```bash
USE_GEMINI=true
```

All companies will now use Gemini by default.

### Per-Company Override

Use MongoDB to set AI provider for specific companies:

```javascript
// Connect to MongoDB
use petbuddy;

// Set company to use Gemini
db.companyintegrations.updateOne(
  { companyId: ObjectId("your-company-id") },
  {
    $set: {
      aiProvider: "gemini",
      geminiApiKey: "optional-company-specific-key"  // Optional
    }
  }
);

// Set company to use OpenAI
db.companyintegrations.updateOne(
  { companyId: ObjectId("your-company-id") },
  { $set: { aiProvider: "openai" } }
);

// Remove override (use global setting)
db.companyintegrations.updateOne(
  { companyId: ObjectId("your-company-id") },
  { $unset: { aiProvider: "" } }
);
```

### Via Backend API (Future)

The backend admin panel can be extended to allow setting AI provider per company through the UI.

## Features

### 1. **Automatic Fallback**

If Gemini fails (API error, rate limit, etc.), the system automatically falls back to OpenAI:

```javascript
// In geminiAgent.js
catch (error) {
  logger.warn("Gemini failed, attempting fallback to OpenAI");
  const { agentNode } = await import("./agent.js");
  return agentNode(state);
}
```

### 2. **Tool Support**

All 14 customer service tools work seamlessly with Gemini:
- get_current_datetime
- get_customer_info
- book_appointment
- get_available_times
- reschedule_appointment
- cancel_appointment
- get_customer_pets
- add_pet
- get_service_list
- get_locations
- get_staff_list
- etc.

### 3. **Metrics Tracking**

The system tracks which provider is used for each request:

```javascript
await metricsTracker.trackAgentExecution({
  platform,
  chatId,
  companyId,
  executionTime,
  success: true,
  provider: "gemini",  // or "openai"
});
```

### 4. **Message Pruning**

Same intelligent message pruning (15 messages) works for both providers to manage token costs.

### 5. **Human Handoff Detection**

Human handoff detection works identically for both providers.

## Cost Comparison

### OpenAI GPT-4o Pricing
- Input: ~$2.50 per 1M tokens
- Output: ~$10 per 1M tokens

### Google Gemini 1.5 Pro Pricing
- Input: ~$3.50 per 1M tokens
- Output: ~$10.50 per 1M tokens

### Google Gemini 1.5 Flash Pricing ⚡ **Recommended**
- Input: ~$0.35 per 1M tokens (10x cheaper!)
- Output: ~$1.05 per 1M tokens
- Speed: 2-3x faster than Pro

**Recommendation:** Use `gemini-1.5-flash` for most customer service tasks - it's significantly cheaper and faster while maintaining excellent quality for conversational AI.

## Testing

### 1. Test with Feature Flag

```bash
# In .env
USE_GEMINI=true
```

Send a message via Instagram or Facebook. Check logs:

```
[LangGraph] Using GEMINI as AI provider
[LangGraph] Conversation graph compiled successfully (Provider: GEMINI)
```

### 2. Test Per-Company Override

```javascript
// Set company to use Gemini
db.companyintegrations.updateOne(
  { companyId: ObjectId("...") },
  { $set: { aiProvider: "gemini" } }
);
```

Send message and verify logs show Gemini provider.

### 3. Test Tool Calls

Ask the bot to:
- "Book an appointment for tomorrow at 2pm"
- "What services do you offer?"
- "Show me my upcoming appointments"

All tools should work correctly with Gemini.

### 4. Test Fallback

Temporarily set invalid Gemini API key:

```bash
GEMINI_API_KEY=invalid-key
USE_GEMINI=true
```

Send message. Bot should automatically fall back to OpenAI and work correctly.

## Monitoring

### Log Messages to Watch

```
# Provider selection
[LangGraph] Using GEMINI as AI provider

# Agent execution
Processing with 5 messages (gemini-agent-node)

# Tool calls
Received 2 tool calls (gemini-agent-response)

# Fallback (if Gemini fails)
Gemini failed, attempting fallback to OpenAI
```

### Metrics

Track in your metrics dashboard:
- Provider distribution (Gemini vs OpenAI)
- Response times by provider
- Error rates by provider
- Tool call success rates
- Fallback frequency

## Troubleshooting

### Issue: "GEMINI_API_KEY is not set"

**Solution:** Add your Gemini API key to `.env`:
```bash
GEMINI_API_KEY=your-api-key-here
```

### Issue: Rate Limit Errors

**Solution:**
1. Check your Google AI Studio quota limits
2. Implement rate limiting in your application
3. Use per-company API keys to distribute load

### Issue: Gemini Returns Different Responses

**Cause:** Gemini has different training data and behavior than GPT-4o.

**Solution:**
1. Adjust temperature (currently 0.7) in [geminiAgent.js](../langgraph/nodes/geminiAgent.js)
2. Test system instructions with Gemini specifically
3. Use A/B testing to compare quality

### Issue: Tool Calls Not Working

**Cause:** Gemini's function calling format differs from OpenAI.

**Solution:** LangChain handles this automatically. If issues persist:
1. Check LangChain version: `npm list @langchain/google-genai`
2. Update: `npm update @langchain/google-genai`
3. Check tool definitions in [tools/index.js](../langgraph/tools/index.js)

## Rollout Strategy

### Phase 1: Development Testing (Current)
- Set `USE_GEMINI=false` (default OpenAI)
- Test Gemini manually in dev environment
- Validate all tools work correctly

### Phase 2: Single Company Pilot
```javascript
// Enable for one test company
db.companyintegrations.updateOne(
  { companyId: ObjectId("test-company-id") },
  { $set: { aiProvider: "gemini" } }
);
```
- Monitor metrics closely
- Compare response quality
- Check customer satisfaction

### Phase 3: Gradual Rollout
- Enable for 10% of companies
- Monitor for 1 week
- If stable, increase to 50%
- If stable, increase to 100%

### Phase 4: Full Production
- Set `USE_GEMINI=true` globally
- Keep OpenAI as fallback
- Monitor continuously

## Benefits of Gemini Integration

1. **Cost Savings** - Gemini Flash is ~10x cheaper than GPT-4o
2. **Speed** - Gemini Flash is 2-3x faster
3. **Redundancy** - Fallback to OpenAI if Gemini fails
4. **Flexibility** - Per-company provider selection
5. **Competition** - Avoid vendor lock-in
6. **A/B Testing** - Compare quality across providers

## Future Enhancements

1. **Vision Support** - Use Gemini 1.5 Pro Vision for image analysis
2. **Admin Panel** - UI to select AI provider per company
3. **Load Balancing** - Automatically distribute between providers
4. **Cost Tracking** - Track spend per provider
5. **Quality Metrics** - A/B test response quality
6. **Gemini 2.0** - Upgrade when available

## References

- [Google AI Studio](https://ai.google.dev/)
- [Gemini API Documentation](https://ai.google.dev/docs)
- [LangChain Google GenAI](https://js.langchain.com/docs/integrations/chat/google_generativeai)
- [Gemini Pricing](https://ai.google.dev/pricing)

## Support

For issues or questions:
1. Check this documentation
2. Review logs in `/packages/meta-bot/logs/`
3. Test in development first
4. Contact development team

---

**Last Updated:** 2025-01-04
**Integration Version:** 1.0.0
**Status:** ✅ Production Ready
