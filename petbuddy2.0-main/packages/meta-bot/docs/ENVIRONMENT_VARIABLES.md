# Environment Variables Reference

Complete reference for configuring the Meta-Bot, including hybrid AI mode.

---

## Quick Start

Copy these variables to your `.env` file in `packages/meta-bot/`:

```bash
# Required for Hybrid Mode
USE_GEMINI=true
USE_LANGGRAPH=true
ENFORCE_TOOL_USAGE=true

GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=sk-your_openai_key

MONGODB_URI=mongodb://localhost:27017/petbuddy
INTERNAL_SERVICE_API_KEY=your_32_char_api_key
VERIFY_TOKEN=your_webhook_token
```

---

## Configuration Modes

### Hybrid Mode (Recommended)
```bash
USE_GEMINI=true
GEMINI_API_KEY=<your-key>
OPENAI_API_KEY=<your-key>
```
**Result**: Gemini for text, OpenAI for tools (60-70% cost savings)

### OpenAI Only
```bash
USE_GEMINI=false
OPENAI_API_KEY=<your-key>
```
**Result**: OpenAI for everything (higher cost, proven reliability)

### Gemini Only
```bash
USE_GEMINI=true
GEMINI_API_KEY=<your-key>
```
**Result**: Gemini for everything (cheapest, may miss some tools)

---

## Complete Variable Reference

### Server Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Environment mode |
| `META_BOT_PORT` | No | `5001` | Server port |

### Database

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGODB_URI` | **Yes** | - | MongoDB connection string |
| `MONGODB_URI_DOCKER` | No | - | Docker-specific MongoDB URI |

### Backend Integration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `BACKEND_API_URL` | No | `http://localhost:3000` | Main backend API |
| `OUTBOUND_SERVER_URL` | No | - | Outbound message server |

### Security

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `INTERNAL_SERVICE_API_KEY` | **Yes** | - | Internal API key (min 32 chars) |
| `VERIFY_TOKEN` | **Yes** | - | Facebook/Instagram webhook token |
| `JWT_ACCESS_SECRET` | No | - | JWT access token secret |
| `JWT_REFRESH_SECRET` | No | - | JWT refresh token secret |

### Facebook/Instagram

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FB_PAGE_ACCESS_TOKEN` | Yes* | - | Facebook page token |
| `INSTA_PAGE_ACCESS_TOKEN` | Yes* | - | Instagram page token |
| `APP_SECRET` | No | - | Facebook app secret |
| `ADMIN_PAGE_ACCESS_TOKEN` | No | - | Admin Facebook token |
| `ADMIN_CHAT_ID` | No | - | Admin Facebook chat ID |

*At least one platform token required

### AI Configuration - Gemini

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | Yes** | - | Google Gemini API key |
| `GEMINI_CHAT_MODEL` | No | `gemini-1.5-pro` | Model for text generation |
| `GEMINI_VISION_MODEL` | No | `gemini-1.5-pro-vision` | Model for image analysis |
| `GEMINI_API_VERSION` | No | `v1` | API version |

**Required when `USE_GEMINI=true`

**Model Options:**
- `gemini-1.5-pro`: Best quality, slower, more expensive
- `gemini-1.5-flash`: Fast, cheaper, good quality (recommended)
- `gemini-1.5-pro-vision`: For image understanding

### AI Configuration - OpenAI

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | Yes*** | - | OpenAI API key |
| `CHAT_MODEL` | No | `gpt-4o` | Model for tool execution |
| `IMAGE_MODEL` | No | `gpt-4o` | Model for image analysis |

***Required for hybrid mode or when `USE_GEMINI=false`

**Model Options:**
- `gpt-4o`: Best quality, recommended for tools
- `gpt-4o-mini`: Cheaper, faster, good quality
- `gpt-4-turbo`: Previous generation
- `gpt-3.5-turbo`: Cheapest, fastest, lower quality

### Feature Flags

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `USE_LANGGRAPH` | No | `false` | Enable LangGraph (required for hybrid) |
| `USE_GEMINI` | No | `false` | Enable Gemini as primary AI |
| `ENFORCE_TOOL_USAGE` | No | `true` | Force OpenAI when Gemini misses tools |

**ENFORCE_TOOL_USAGE Details:**
- `true` (default): System catches when Gemini should use tools but doesn't, routes to OpenAI
- `false`: Rely solely on Gemini's tool detection (may miss some opportunities)

### Bot Behavior

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `RESPONSE_DELAY_MS` | No | `4000` | Delay before sending response (ms) |
| `SYSTEM_INSTRUCTIONS` | No | - | Override default instructions |

---

## Hybrid Mode Configuration

### Enabling Hybrid Mode

Set these three variables:

```bash
USE_GEMINI=true
GEMINI_API_KEY=your_key_here
OPENAI_API_KEY=sk-your_key_here
```

### Hybrid Mode Behavior

When hybrid mode is enabled:

1. **Gemini** handles:
   - Greetings and general questions
   - Text-only responses
   - Tool reasoning and detection
   - Final response generation after tools

2. **OpenAI** handles:
   - Tool execution only
   - Fallback when Gemini fails
   - Enforcement fallback when Gemini misses tools

3. **Flow**:
   ```
   User Query → Gemini (reasoning)
              ↓
              [Tools needed?]
              ↓
              Yes → OpenAI (execute tools)
                  ↓
                  Tools Execute
                  ↓
                  Gemini (final response)
              ↓
              No → Gemini (direct response)
   ```

### Cost Impact

**Typical Distribution:**
- 70% of requests: Gemini only (~$0.15 per 1M tokens)
- 30% of requests: Gemini + OpenAI (~$5 per 1M tokens)

**Overall Savings**: 60-70% vs. OpenAI-only

### Performance Impact

**Latency:**
- Text-only: 1-2 seconds (Gemini direct)
- Tool-based: 3-5 seconds (Gemini → OpenAI → Tools → Gemini)

---

## Configuration Examples

### Development (Hybrid Mode)

```bash
NODE_ENV=development
META_BOT_PORT=5001

MONGODB_URI=mongodb://localhost:27017/petbuddy

USE_GEMINI=true
USE_LANGGRAPH=true
ENFORCE_TOOL_USAGE=true

GEMINI_API_KEY=your_gemini_key
GEMINI_CHAT_MODEL=gemini-1.5-flash  # Fast for dev

OPENAI_API_KEY=sk-your_openai_key
CHAT_MODEL=gpt-4o

FB_PAGE_ACCESS_TOKEN=your_fb_token
INTERNAL_SERVICE_API_KEY=your_api_key
VERIFY_TOKEN=your_verify_token

RESPONSE_DELAY_MS=1000  # Fast responses for testing
```

### Production (Hybrid Mode, Quality)

```bash
NODE_ENV=production
META_BOT_PORT=5001

MONGODB_URI=mongodb://mongo:27017/petbuddy

USE_GEMINI=true
USE_LANGGRAPH=true
ENFORCE_TOOL_USAGE=true

GEMINI_API_KEY=your_gemini_key
GEMINI_CHAT_MODEL=gemini-1.5-pro  # Best quality

OPENAI_API_KEY=sk-your_openai_key
CHAT_MODEL=gpt-4o  # Best tool execution

FB_PAGE_ACCESS_TOKEN=your_fb_token
INSTA_PAGE_ACCESS_TOKEN=your_insta_token
INTERNAL_SERVICE_API_KEY=your_api_key
VERIFY_TOKEN=your_verify_token

RESPONSE_DELAY_MS=4000
```

### Production (Cost Optimized)

```bash
NODE_ENV=production

USE_GEMINI=true
USE_LANGGRAPH=true
ENFORCE_TOOL_USAGE=true

GEMINI_API_KEY=your_gemini_key
GEMINI_CHAT_MODEL=gemini-1.5-flash  # Cheapest

OPENAI_API_KEY=sk-your_openai_key
CHAT_MODEL=gpt-4o-mini  # Cheaper for tools

# ... other config ...
```

### Production (OpenAI Only - Legacy)

```bash
NODE_ENV=production

USE_GEMINI=false
USE_LANGGRAPH=true
ENFORCE_TOOL_USAGE=false  # Not used in OpenAI-only mode

OPENAI_API_KEY=sk-your_openai_key
CHAT_MODEL=gpt-4o

# ... other config ...
```

---

## Troubleshooting

### Configuration Not Loading

**Problem**: Settings not taking effect

**Solution**:
1. Check `.env` file is in `packages/meta-bot/` directory
2. Restart the server after changes
3. Verify no syntax errors (no quotes needed for values)
4. Check logs on startup for configuration output

### Hybrid Mode Not Enabling

**Problem**: Still using single provider

**Check**:
```bash
# Verify both keys are set
node -e "console.log(process.env.GEMINI_API_KEY ? 'Gemini ✓' : 'Gemini ✗'); console.log(process.env.OPENAI_API_KEY ? 'OpenAI ✓' : 'OpenAI ✗')"

# Verify USE_GEMINI
node -e "console.log('USE_GEMINI:', process.env.USE_GEMINI)"
```

**Solution**:
```bash
USE_GEMINI=true  # Must be exactly "true" (lowercase)
GEMINI_API_KEY=...  # Must be set
OPENAI_API_KEY=...  # Must be set
```

### Tool Enforcement Not Working

**Problem**: Gemini missing tools frequently

**Check**:
```bash
# Verify enforcement is enabled
grep ENFORCE_TOOL_USAGE .env
```

**Solution**:
```bash
ENFORCE_TOOL_USAGE=true  # Explicitly set to true
```

Or set to `false` to disable.

---

## Security Best Practices

1. **Never commit `.env` file** to version control
2. **Use strong API keys** (32+ characters for internal keys)
3. **Rotate keys periodically** (every 90 days)
4. **Use environment-specific keys** (different for dev/staging/prod)
5. **Restrict API key permissions** when possible
6. **Monitor API usage** to detect unauthorized access
7. **Use secrets management** in production (AWS Secrets Manager, etc.)

---

## Getting API Keys

### Google Gemini API Key

1. Visit: https://makersuite.google.com/app/apikey
2. Sign in with Google account
3. Click "Create API Key"
4. Copy the key to `GEMINI_API_KEY`

### OpenAI API Key

1. Visit: https://platform.openai.com/api-keys
2. Sign in to OpenAI account
3. Click "Create new secret key"
4. Copy the key to `OPENAI_API_KEY`
5. Note: Starts with `sk-`

### Facebook/Instagram Tokens

1. Visit: https://developers.facebook.com/
2. Select your app
3. Go to Messenger → Settings
4. Generate Page Access Token
5. Copy to `FB_PAGE_ACCESS_TOKEN` / `INSTA_PAGE_ACCESS_TOKEN`

---

## See Also

- [Hybrid Setup Guide](HYBRID_SETUP_GUIDE.md)
- [Hybrid Architecture](HYBRID_AGENT_ARCHITECTURE.md)
- [Verification Script](../scripts/verifyHybridFlow.js)

