# Gemini Integration Troubleshooting Guide

This guide helps you diagnose and fix common issues with the Gemini AI integration.

## Common Errors

### 1. "Cannot read properties of undefined (reading 'replace')"

**Error in logs:**
```
Error in gemini-agent-node: Cannot read properties of undefined (reading 'replace')
```

**Cause:** Gemini API key is not set or is undefined.

**Solution:**
```bash
# Check your .env file
cat packages/meta-bot/.env | grep GEMINI_API_KEY

# If missing, add it:
echo "GEMINI_API_KEY=your-actual-api-key-here" >> packages/meta-bot/.env

# Get a key from: https://ai.google.dev/
```

**Verify:**
```bash
# Restart server and check logs
npm start

# Should see:
# - Gemini API Key: ✅ Set
```

---

### 2. "logger.messageFlow.warn is not a function"

**Error in logs:**
```
Error in graph-invoke: logger.messageFlow.warn is not a function
```

**Cause:** Used wrong logger method name (should be `warning` not `warn`).

**Solution:** Already fixed in the codebase. Update your code to latest version.

---

### 3. Bot Uses OpenAI Instead of Gemini

**Symptoms:**
- Set `USE_GEMINI=true` but logs show "AI Provider: 🤖 OpenAI"
- Or logs show "Using OPENAI as AI provider"

**Solution:**

**Check 1 - Environment Variable:**
```bash
# Verify .env file
cat packages/meta-bot/.env | grep USE_GEMINI

# Should be:
USE_GEMINI=true  # Not "false"
```

**Check 2 - Server Restart:**
```bash
# Environment variables only load on startup
# Kill the server (Ctrl+C) and restart:
npm start
```

**Check 3 - Per-Company Override:**
```javascript
// Company might be set to use OpenAI specifically
db.companyintegrations.findOne({ companyId: ObjectId("...") })

// If aiProvider is "openai", it overrides USE_GEMINI
// Remove it to use global setting:
db.companyintegrations.updateOne(
  { companyId: ObjectId("...") },
  { $unset: { aiProvider: "" } }
)
```

---

### 4. Gemini API Rate Limit Errors

**Error in logs:**
```
Error 429: Resource has been exhausted
```

**Cause:** Exceeded Google AI Studio free tier limits.

**Free Tier Limits:**
- 15 requests per minute
- 1,500 requests per day
- 1 million tokens per day

**Solutions:**

**Option A - Wait:**
```
Rate limits reset after:
- Per-minute: Wait 60 seconds
- Per-day: Wait until next day (UTC)
```

**Option B - Upgrade:**
- Visit [Google AI Studio](https://ai.google.dev/)
- Enable billing for higher limits
- Or apply for increased quota

**Option C - Fallback:**
```bash
# Gemini automatically falls back to OpenAI
# Ensure OpenAI API key is set:
OPENAI_API_KEY=sk-your-openai-key
```

**Option D - Rate Limiting:**
```javascript
// Implement request queuing (future enhancement)
// Or use per-company API keys to distribute load
```

---

### 5. Invalid Gemini API Key

**Error in logs:**
```
Error 400: API key not valid
```

**Solution:**

**Step 1 - Get New Key:**
1. Visit https://ai.google.dev/
2. Sign in with Google account
3. Click "Get API Key" → "Create API key"
4. Copy the key (starts with `AIza...`)

**Step 2 - Update .env:**
```bash
# Replace with your actual key
GEMINI_API_KEY=AIzaSyD...your-actual-key...
```

**Step 3 - Verify:**
```bash
# Test the key manually
curl -H 'Content-Type: application/json' \
     -d '{"contents":[{"parts":[{"text":"Hello"}]}]}' \
     -X POST 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=YOUR_KEY'

# Should return JSON response, not 400 error
```

---

### 6. Gemini Returns Low-Quality Responses

**Symptoms:**
- Responses are too short/long
- Wrong tone or style
- Doesn't follow system instructions

**Solutions:**

**Adjust Temperature:**
```javascript
// In langgraph/nodes/geminiAgent.js
const model = new ChatGoogleGenerativeAI({
  modelName: config.gemini.chatModel,
  apiKey: config.gemini.apiKey,
  temperature: 0.5,  // Lower = more focused (was 0.7)
  maxRetries: 2,
});
```

**Try Different Model:**
```bash
# In .env, switch models:

# Option 1: Use Pro for better quality (slower, more expensive)
GEMINI_CHAT_MODEL=gemini-1.5-pro

# Option 2: Use Flash for speed (default)
GEMINI_CHAT_MODEL=gemini-1.5-flash
```

**Update System Instructions:**
```javascript
// Add Gemini-specific instructions in company bot settings
// Gemini responds better to:
// - Clear, structured prompts
// - Explicit examples
// - Step-by-step instructions
```

---

### 7. LangGraph Not Using Gemini

**Symptoms:**
- `USE_GEMINI=true` but still using OpenAI
- Logs show: "LangGraph: ❌ Disabled (Legacy)"

**Cause:** LangGraph is disabled, using legacy LLM.

**Solution:**
```bash
# Enable LangGraph in .env
USE_LANGGRAPH=true
USE_GEMINI=true

# Both must be true to use Gemini with LangGraph
```

**Restart server:**
```bash
npm start

# Should see:
# - LangGraph: ✅ Enabled
# - AI Provider: 🤖 Gemini
```

---

### 8. Tools Not Working with Gemini

**Symptoms:**
- Tool calls fail
- Bot says "I don't have access to that information"
- Error: "Invalid tool call format"

**Diagnosis:**
```bash
# Check LangChain version
npm list @langchain/google-genai

# Should be latest version
```

**Solution:**
```bash
# Update LangChain packages
cd packages/meta-bot
npm update @langchain/google-genai
npm update @langchain/core
npm update @langchain/langgraph

# Restart server
npm start
```

**If still failing:**
```javascript
// Check tool definitions in langgraph/tools/index.js
// Gemini requires tools to have:
// 1. Clear name (no special characters)
// 2. Detailed description
// 3. Proper schema with types
```

---

### 9. Fallback Not Working

**Symptoms:**
- Gemini fails but doesn't fall back to OpenAI
- Bot returns error instead of response

**Cause:** OpenAI API key not set.

**Solution:**
```bash
# Ensure OpenAI key is configured for fallback
OPENAI_API_KEY=sk-your-openai-key-here

# Restart server
npm start
```

**Test Fallback:**
```bash
# Temporarily break Gemini key
GEMINI_API_KEY=invalid-key
USE_GEMINI=true

# Send message - should automatically use OpenAI
# Check logs for: "Gemini failed, attempting fallback to OpenAI"
```

---

### 10. Slow Response Times

**Symptoms:**
- Gemini takes 10+ seconds to respond
- Customers complaining about delays

**Solutions:**

**Option A - Use Gemini Flash:**
```bash
# Much faster than Pro
GEMINI_CHAT_MODEL=gemini-1.5-flash
```

**Option B - Reduce Message History:**
```javascript
// In langgraph/nodes/geminiAgent.js
const MAX_MESSAGES = 10;  // Reduce from 15
```

**Option C - Optimize System Instructions:**
```javascript
// Shorter instructions = faster processing
// Remove unnecessary examples or verbose rules
```

**Option D - Switch to OpenAI for Time-Sensitive:**
```javascript
// Use OpenAI for urgent requests
// Use Gemini for batch/non-urgent processing
```

---

## Debugging Steps

### Step 1: Check Configuration

```bash
# View current config
cd packages/meta-bot
cat .env | grep -E "(GEMINI|USE_GEMINI|USE_LANGGRAPH)"

# Should show:
# GEMINI_API_KEY=AIza...
# GEMINI_CHAT_MODEL=gemini-1.5-flash
# USE_GEMINI=true
# USE_LANGGRAPH=true
```

### Step 2: Check Logs

```bash
# Start server and watch logs
npm start

# Look for:
# ✅ "Gemini API Key: ✅ Set"
# ✅ "AI Provider: 🤖 Gemini"
# ✅ "LangGraph: ✅ Enabled"
# ✅ "Using GEMINI as AI provider"
```

### Step 3: Test Message

Send a test message and check logs for:

```
✅ Good flow:
[LangGraph] Using GEMINI as AI provider
[gemini-agent-node] Processing with X messages
[gemini-agent-response] Received text response: ...

❌ Bad flow (with fallback):
[gemini-agent-node] Processing with X messages
Error in gemini-agent-node: ...
[gemini-fallback] Gemini failed, attempting fallback to OpenAI
[agent-node] Processing with X messages  <- Now using OpenAI

❌ Bad flow (no fallback):
[gemini-agent-node] Processing with X messages
Error in gemini-agent-node: ...
Error in graph-invoke: ...
```

### Step 4: Verify API Key

```bash
# Test Gemini API directly
curl -H 'Content-Type: application/json' \
     -d '{"contents":[{"parts":[{"text":"Say hello"}]}]}' \
     "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=$(grep GEMINI_API_KEY packages/meta-bot/.env | cut -d'=' -f2)"

# Should return JSON with "candidates" array
```

### Step 5: Check Database

```javascript
// MongoDB - Check company settings
use petbuddy;
db.companyintegrations.findOne(
  { companyId: ObjectId("your-company-id") },
  { aiProvider: 1, geminiApiKey: 1 }
);

// If aiProvider is set, it overrides global USE_GEMINI
```

---

## Getting Help

If you're still having issues:

1. **Check full error logs:**
   ```bash
   tail -f packages/meta-bot/logs/error.log
   ```

2. **Enable debug logging:**
   ```bash
   NODE_ENV=development npm start
   ```

3. **Test with minimal config:**
   ```bash
   # Create .env.test
   MONGODB_URI=your-mongo-uri
   GEMINI_API_KEY=your-gemini-key
   USE_GEMINI=true
   USE_LANGGRAPH=true

   # Use this to isolate issues
   ```

4. **Compare with OpenAI:**
   ```bash
   # Switch to OpenAI temporarily
   USE_GEMINI=false

   # If OpenAI works but Gemini doesn't,
   # it's a Gemini-specific issue
   ```

5. **Check documentation:**
   - [Gemini Integration Guide](GEMINI_INTEGRATION.md)
   - [Quick Start](../GEMINI_QUICK_START.md)
   - [Google AI Docs](https://ai.google.dev/docs)

---

## Quick Fixes Checklist

- [ ] Gemini API key is set in `.env`
- [ ] API key is valid (test with curl)
- [ ] `USE_GEMINI=true` in `.env`
- [ ] `USE_LANGGRAPH=true` in `.env`
- [ ] Server was restarted after .env changes
- [ ] Logs show "Gemini API Key: ✅ Set"
- [ ] Logs show "AI Provider: 🤖 Gemini"
- [ ] No per-company override to OpenAI
- [ ] OpenAI key set for fallback
- [ ] LangChain packages are up to date

---

**Last Updated:** 2025-01-04
**Based on:** Real production issues and solutions
