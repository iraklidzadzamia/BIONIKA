# Hybrid Agent Setup Guide

Quick guide to set up and verify the hybrid Gemini + OpenAI agent.

## Prerequisites

- Node.js 18+ installed
- MongoDB running
- Both API keys:
  - Google Gemini API key
  - OpenAI API key

---

## Step 1: Configure Environment

Update your `.env` file in `packages/meta-bot/`:

```bash
# Enable Hybrid Mode
USE_GEMINI=true
USE_LANGGRAPH=true

# API Keys (BOTH required for hybrid mode)
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=sk-your_openai_key_here

# Hybrid Configuration
ENFORCE_TOOL_USAGE=true  # Recommended: Force OpenAI when Gemini misses tools

# Optional: Model Selection
GEMINI_CHAT_MODEL=gemini-1.5-pro  # or gemini-1.5-flash for faster/cheaper
CHAT_MODEL=gpt-4o  # OpenAI model for tool execution
```

---

## Step 2: Install Dependencies

```bash
cd packages/meta-bot
npm install
```

---

## Step 3: Verify Configuration

Run the verification script:

```bash
node scripts/verifyHybridFlow.js
```

Expected output:

```
🔍 Hybrid Flow Verification
============================================================

📋 Configuration Check:
  - USE_GEMINI: ✅
  - OPENAI_API_KEY: ✅
  - GEMINI_API_KEY: ✅
  - ENFORCE_TOOL_USAGE: ✅

✅ Hybrid mode enabled!

1. Text-Only Response (Gemini Direct)
   Should route through Gemini only, no OpenAI involvement
   ──────────────────────────────────────────────────────────
   ✅ Execution successful
   ✅ gemini to open ai: false (expected: false)
   ✅ open ai tool execution: false (expected: false)
   ...

2. Tool-Required Query (Full Hybrid Flow)
   Should route: Gemini → OpenAI → Tools → Gemini
   ──────────────────────────────────────────────────────────
   ✅ Execution successful
   ✅ gemini to open ai: true (expected: true)
   ✅ open ai tool execution: true (expected: true)
   ...

============================================================
📊 Verification Summary
============================================================
✅ Test 1: Text-Only Response (Gemini Direct)
✅ Test 2: Tool-Required Query (Full Hybrid Flow)
✅ Test 3: Service Inquiry (Tool Enforcement Test)

────────────────────────────────────────────────────────────

🎉 All tests passed! (3/3)
   Hybrid flow is working correctly!
```

---

## Step 4: Start the Server

```bash
npm run dev
```

Look for these log messages:

```
[LangGraph] Using hybrid AI mode: Gemini + OpenAI
[LangGraph] Hybrid Flow Configuration:
  - Gemini: Primary reasoning & text responses
  - OpenAI: Tool execution only
  - Tool Usage Enforcement: Enabled
  - Transition Flow: human_detector → gemini_agent ↔ openai_agent → execute_tools → gemini_agent
```

---

## Step 5: Test with Real Messages

Send test messages through your platform (Facebook/Instagram):

### Test 1: Text-Only (Should use Gemini only)

Send: `Hello! How are you?`

Check logs for:
```
[gemini-agent-node] Processing with X messages
[gemini-agent-response] Gemini handled text response: ...
[gemini-direct-response] Gemini handled text-only response, no tools needed
```

### Test 2: Tool-Required (Should use hybrid flow)

Send: `I want to book an appointment for Monday at 2 PM`

Check logs for:
```
[gemini-tool-detection] Gemini detected X tool calls - routing to OpenAI
[hybrid-transition] gemini → openai-tools: Gemini detected X tool calls
[openai-tool-execution] OpenAI executing X tools from Gemini reasoning
[tool-executor] Executing X tools
[hybrid-transition] openai-tools → gemini: Tools executed, returning to Gemini
[gemini-final-response] Generating final response after tool execution
```

---

## Troubleshooting

### Issue: "Hybrid mode not enabled"

**Check:**
1. `.env` file has both API keys
2. `USE_GEMINI=true` is set
3. API keys are valid (no quotes, no spaces)

**Fix:**
```bash
# Verify .env file
cat .env | grep -E "(GEMINI_API_KEY|OPENAI_API_KEY|USE_GEMINI)"
```

### Issue: "Gemini never uses tools"

**Check:**
1. `ENFORCE_TOOL_USAGE=true` is set
2. System instructions include tool guidance
3. Tools are properly registered

**Fix:**
Enable enforcement:
```bash
ENFORCE_TOOL_USAGE=true
```

This will force OpenAI when Gemini misses tool opportunities.

### Issue: "OpenAI called without tool calls"

**This indicates a bug in the routing logic.**

Check logs for:
```
[openai-hybrid-violation] OpenAI called without tool calls in hybrid mode
```

**Report this as a bug** - OpenAI should only be called with tool calls in hybrid mode.

### Issue: "High OpenAI usage"

**Gemini might be missing too many tool opportunities.**

Check metrics for:
```
provider: "gemini-missed-tool"  // High count indicates Gemini missing tools
```

**Solutions:**
1. Improve system instructions
2. Adjust tool enforcement patterns
3. Use more explicit tool descriptions

### Issue: "Verification script fails"

**Common causes:**
1. Rate limiting (wait between tests)
2. Invalid API keys
3. MongoDB not running
4. Missing environment variables

**Fix:**
```bash
# Check API keys are valid
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Check MongoDB is running
mongosh --eval "db.version()"

# Check all env vars
node -e "import('./config/env.js').then(c => console.log(c.config))"
```

---

## Monitoring

### Key Metrics to Watch

1. **Cost Distribution**
   - Monitor `provider` field in metrics
   - Target: 70% Gemini, 30% OpenAI

2. **Tool Enforcement Rate**
   - Count `gemini-missed-tool` events
   - Target: < 10% of tool-requiring queries

3. **Response Times**
   - Text-only: ~1-2 seconds (Gemini)
   - Tool-based: ~3-5 seconds (hybrid)

4. **Error Rates**
   - Watch for `openai-hybrid-violation` (should be 0)
   - Watch for fallback errors

### Log Analysis

Search logs for hybrid transitions:

```bash
# View all hybrid transitions
grep "hybrid-transition" logs/meta-bot.log

# Count Gemini tool detections
grep "gemini-tool-detection" logs/meta-bot.log | wc -l

# Count enforcement triggers
grep "gemini-missed-tool" logs/meta-bot.log | wc -l

# View complete flow paths
grep "hybrid-flow-path" logs/meta-bot.log
```

---

## Performance Tuning

### Cost Optimization

To reduce costs further:

```bash
# Use Gemini Flash (faster, cheaper)
GEMINI_CHAT_MODEL=gemini-1.5-flash

# Reduce OpenAI model (if acceptable)
CHAT_MODEL=gpt-4o-mini
```

**Expected cost reduction**: 70-80% vs. OpenAI-only

### Latency Optimization

To improve response times:

```bash
# Use Gemini Flash
GEMINI_CHAT_MODEL=gemini-1.5-flash

# Reduce message history
MAX_MESSAGES=10  # Add to config if needed
```

### Reliability Tuning

To maximize reliability:

```bash
# Keep enforcement enabled
ENFORCE_TOOL_USAGE=true

# Use stable models
GEMINI_CHAT_MODEL=gemini-1.5-pro
CHAT_MODEL=gpt-4o
```

---

## Production Checklist

Before deploying to production:

- [ ] Both API keys configured
- [ ] `USE_GEMINI=true` and `USE_LANGGRAPH=true`
- [ ] `ENFORCE_TOOL_USAGE=true` (recommended)
- [ ] Verification script passes all tests
- [ ] Monitoring/logging configured
- [ ] Error alerting set up
- [ ] Cost tracking enabled
- [ ] Tested with real messages
- [ ] Documented for team

---

## Next Steps

1. **Read the architecture docs**: `docs/HYBRID_AGENT_ARCHITECTURE.md`
2. **Review metrics**: Check Grafana/monitoring dashboard
3. **Test edge cases**: Try various query types
4. **Monitor costs**: Track API usage by provider
5. **Optimize prompts**: Improve system instructions for better tool detection

---

## Getting Help

If you encounter issues:

1. Check logs: `logs/meta-bot.log`
2. Run verification: `node scripts/verifyHybridFlow.js`
3. Review docs: `docs/HYBRID_AGENT_ARCHITECTURE.md`
4. Check configuration: Ensure all env vars are set
5. Test API keys: Verify both APIs work independently

---

## Summary

The hybrid setup should provide:

✅ 60-70% cost savings vs. OpenAI-only  
✅ Fast text responses via Gemini  
✅ Reliable tool execution via OpenAI  
✅ Automatic fallbacks and enforcement  
✅ Comprehensive logging and monitoring  

You're all set! 🎉

