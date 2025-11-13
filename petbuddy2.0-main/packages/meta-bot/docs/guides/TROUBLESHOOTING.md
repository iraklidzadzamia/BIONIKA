# Troubleshooting Guide

## Common Issues and Solutions

### ❌ Error: "Company not found for recipient"

**Full Error:**
```
error [facebook/instagram] [company-not-found] Company not found for recipient: <PAGE_ID>
```

**What it means:**
The meta-bot received a webhook from Facebook/Instagram, but couldn't find a company in the database with that Page ID.

**Root Cause:**
The `CompanyIntegration` collection doesn't have a record with:
- `facebookChatId: <PAGE_ID>` (for Facebook)
- `instagramChatId: <PAGE_ID>` (for Instagram)

**How to Fix:**

#### Option 1: Check Database
```javascript
// Connect to MongoDB and check:
db.companyintegrations.findOne({ facebookChatId: "602445226293374" })
db.companyintegrations.findOne({ instagramChatId: "YOUR_PAGE_ID" })
```

If not found, you need to create the integration record.

#### Option 2: Verify Page ID
The Page ID in the error message is the ID of your Facebook/Instagram business page. Verify:

1. **Facebook Page ID:**
   - Go to your Facebook Page
   - Go to "About" section
   - Page ID is listed at the bottom
   - OR use: `https://graph.facebook.com/v18.0/me?access_token=YOUR_PAGE_TOKEN`

2. **Instagram Account ID:**
   - Use: `https://graph.facebook.com/v18.0/me?access_token=YOUR_INSTAGRAM_TOKEN`
   - The `id` field is your Instagram Account ID

#### Option 3: Create/Update Integration
Update your company integration in the database:

```javascript
await CompanyIntegration.findOneAndUpdate(
  { companyId: YOUR_COMPANY_ID },
  {
    $set: {
      facebookChatId: "YOUR_FB_PAGE_ID",
      instagramChatId: "YOUR_INSTA_PAGE_ID",
      facebookAccessToken: "YOUR_FB_TOKEN",
      openaiApiKey: "YOUR_OPENAI_KEY"
    }
  },
  { upsert: true }
);
```

#### Option 4: Use Admin Panel
If your backend has an admin panel:
1. Go to Settings → Integrations
2. Connect Facebook/Instagram
3. Save the integration

**Expected Result:**
After fixing, the webhook should work and you'll see:
```
info [facebook] [company-found] Company found successfully
```

---

### ❌ Error: "tool_call_id not found"

**Full Error:**
```
400 Invalid parameter: 'tool_call_id' of 'call_XXX' not found in 'tool_calls' of previous message
```

**Status:** ✅ FIXED in v1.0.1

**What it was:**
Tool calls were accumulating across conversation turns instead of being replaced.

**Fix:**
Updated `langgraph/state/schema.js` - `toolCalls` reducer now replaces instead of appending.

See [BUGFIX_TOOL_CALLS.md](../BUGFIX_TOOL_CALLS.md) for details.

---

### ❌ Error: "Access token has expired"

**Full Error:**
```
error [facebook/instagram] [token-expired] Access token has expired - requires re-authentication
```

**What it means:**
Your Facebook/Instagram Page Access Token has expired.

**How to Fix:**

1. **Generate New Token:**
   - Go to [Facebook Developers](https://developers.facebook.com/)
   - Select your app
   - Go to Tools → Access Token Tool
   - Generate a new Page Access Token
   - Make sure to select "Never Expire" or set a long expiration

2. **Update Environment:**
   ```bash
   # Update .env
   FB_PAGE_ACCESS_TOKEN=new_token_here
   INSTA_PAGE_ACCESS_TOKEN=new_token_here
   ```

3. **Restart Server:**
   ```bash
   npm run dev  # or docker-compose restart meta-bot
   ```

**Expected Result:**
Bot will auto-disable on token expiration to prevent further errors.

---

### ❌ No Response from Bot

**Symptoms:**
- Message received (logs show "webhook received")
- No error logs
- Bot doesn't respond

**Possible Causes:**

#### 1. Bot is Disabled
Check:
```javascript
db.companies.findOne({ _id: YOUR_COMPANY_ID }, { "bot.active": 1 })
```

Should show: `{ bot: { active: true } }`

**Fix:** Enable bot in admin panel or database:
```javascript
db.companies.updateOne(
  { _id: YOUR_COMPANY_ID },
  { $set: { "bot.active": true } }
)
```

#### 2. Outside Working Hours
Check logs for:
```
info [platform] [outside-working-hours] Current time is outside bot working hours
```

**Fix:** Adjust working hours or disable interval restriction:
```javascript
db.companies.updateOne(
  { _id: YOUR_COMPANY_ID },
  { $set: { "bot.activeHours.intervalActive": false } }
)
```

#### 3. Bot Suspended for Contact
Check logs for:
```
info [platform] [bot-suspended] Bot is manually suspended for this contact
info [platform] [bot-auto-suspended] Bot is auto-suspended until <DATE>
```

**Why:** Bot auto-suspends for 14 days when a human operator replies.

**Fix:** Clear suspension:
```javascript
db.contacts.updateOne(
  { _id: CONTACT_ID },
  {
    $set: {
      botSuspended: false,
      botSuspendUntil: null
    }
  }
)
```

#### 4. OpenAI API Key Missing/Invalid
Check logs for:
```
error [platform] [ai-processing-failed] ...
```

**Fix:** Verify OpenAI API key:
```bash
# Test API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

---

### ❌ Rate Limit Errors

**Full Error:**
```
warning [platform] [rate-limited] Rate limit hit - suspending bot for 1 hour
```

**What it means:**
Hit Facebook/Instagram API rate limits.

**How Bot Handles It:**
- Auto-suspends bot for contact for 1 hour
- Prevents further API calls
- Logs warning

**How to Fix:**
- Wait for suspension to expire (automatic)
- OR manually clear suspension (see "Bot Suspended" above)

**Prevention:**
- Reduce message volume
- Increase `RESPONSE_DELAY_MS` in .env
- Contact Facebook to request rate limit increase

---

### ❌ Webhook Verification Failed

**Symptoms:**
- Facebook/Instagram webhook setup fails
- Error: "Verification failed"

**How to Fix:**

1. **Check Verify Token:**
   ```bash
   # In .env
   VERIFY_TOKEN=my_secure_verify_token_2024
   ```

2. **Test Verification:**
   ```bash
   curl "http://localhost:5001/chat/facebook?hub.mode=subscribe&hub.verify_token=my_secure_verify_token_2024&hub.challenge=test123"
   ```

   Should return: `test123`

3. **Check Webhook URL:**
   - Must be HTTPS in production
   - Must be publicly accessible
   - Format: `https://yourdomain.com/chat/facebook`

---

### 🔍 Debugging Tips

#### Enable Verbose Logging
Logs are already comprehensive. Check:
```bash
# Docker
docker-compose logs -f meta-bot

# Local
tail -f logs/message-flow.log
```

#### Check Webhook Payload
Temporarily add to controller:
```javascript
console.log("WEBHOOK:", JSON.stringify(req.body, null, 2));
```

#### Verify Database Connection
Check logs for:
```
✅ Connected to MongoDB
```

#### Test Health Endpoint
```bash
curl http://localhost:5001/health
```

Should return:
```json
{
  "status": "healthy",
  "service": "Meta Bot Server"
}
```

---

### 📚 Additional Resources

- [Logging Guide](./LOGGING_GUIDE.md) - How to read logs
- [View Logs](./VIEW_LOGS.md) - Log viewing commands
- [Setup Guide](../../README.md) - Initial setup instructions

---

### 🆘 Still Having Issues?

1. Check logs in `logs/message-flow.log`
2. Look for ERROR or WARNING level logs
3. Search for the error message in this guide
4. Check [GitHub Issues](https://github.com/yourrepo/issues)
5. Create a new issue with:
   - Error message
   - Relevant logs
   - Steps to reproduce
