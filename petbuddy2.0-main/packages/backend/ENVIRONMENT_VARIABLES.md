# Environment Variables Documentation

## Overview

This document describes all environment variables used in the PetBuddy backend application. All configuration is centralized in [`src/config/env.js`](src/config/env.js) with validation using Joi schema.

## Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your configuration values in `.env`

3. Never commit `.env` to version control (it's in `.gitignore`)

## Configuration Structure

All configuration is imported from a single source:

```javascript
import { config } from './config/env.js';

// Usage examples:
config.port                    // 3000
config.mongodb.uri             // MongoDB connection string
config.jwt.accessSecret        // JWT access token secret
config.google.clientId         // Google OAuth client ID
config.cookie.secure           // true in production, false in dev
```

## Environment Variables

### Server Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `NODE_ENV` | string | `development` | Environment mode (`development`, `production`, `test`) |
| `PORT` | number | `3000` | Server port number |

**Derived values:**
- `config.isProduction` - Boolean, true if `NODE_ENV === 'production'`
- `config.isDevelopment` - Boolean, true if `NODE_ENV === 'development'`
- `config.isTest` - Boolean, true if `NODE_ENV === 'test'`

---

### Database

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `MONGODB_URI` | string | ✅ Yes | MongoDB connection string |

**Example:**
```bash
# Local MongoDB
MONGODB_URI=mongodb://localhost:27017/petbuddy

# MongoDB Atlas
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/database?retryWrites=true&w=majority
```

---

### JWT Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `JWT_ACCESS_SECRET` | string (min 32) | - | **Required** Secret for access tokens |
| `JWT_REFRESH_SECRET` | string (min 32) | - | **Required** Secret for refresh tokens |
| `ACCESS_TOKEN_TTL` | string | `15m` | Access token lifetime |
| `REFRESH_TOKEN_TTL` | string | `7d` | Refresh token lifetime |

**Generate secure secrets:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

### Frontend/CORS Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `FRONTEND_URL` | string (URI) | `http://localhost:3000` | Frontend URL for CORS and OAuth redirects |
| `CORS_ORIGINS` | string | `http://localhost:3000` | Comma-separated allowed origins |

**Example:**
```bash
# Single source of truth for frontend URL
FRONTEND_URL=https://petbuddy.com

# Add multiple allowed origins for CORS
CORS_ORIGINS=http://localhost:5173,https://petbuddy.com,https://www.petbuddy.com
```

---

### Security

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `BCRYPT_SALT_ROUNDS` | number (10-15) | `12` | Bcrypt hashing rounds |
| `INTERNAL_SERVICE_API_KEY` | string (min 32) | - | **Required** API key for internal services |

**Derived values:**
- `config.cookie.secure` - `true` in production, `false` in development
- `config.cookie.sameSite` - `'none'` in production, `'lax'` in development

---

### Logging

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `LOG_LEVEL` | string | `info` | Log level (`error`, `warn`, `info`, `debug`) |

---

### Facebook Integration (Optional)

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `FACEBOOK_APP_ID` | string | - | Facebook App ID |
| `FACEBOOK_APP_SECRET` | string | - | Facebook App Secret |
| `FACEBOOK_GRAPH_VERSION` | string | `v18.0` | Facebook Graph API version |
| `FACEBOOK_SCOPES` | string | - | Comma-separated permissions |

**Get credentials:** https://developers.facebook.com/apps/

---

### Google Calendar Integration (Optional)

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `GOOGLE_CLIENT_ID` | string | - | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | string | - | Google OAuth Client Secret |
| `GOOGLE_REDIRECT_URI` | string (URI) | - | OAuth callback URL |

**Get credentials:** https://console.cloud.google.com/

**Predefined scopes:**
- `https://www.googleapis.com/auth/calendar.events`
- `https://www.googleapis.com/auth/calendar.readonly`

---

### Meta Bot Service

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `META_BOT_BASE_URL` | string (URI) | `http://localhost:5001` | Meta Bot service base URL |

---

## Usage in Code

### ✅ Correct Way

```javascript
import { config } from './config/env.js';

// Server configuration
app.listen(config.port);

// Database
mongoose.connect(config.mongodb.uri);

// JWT
jwt.sign(payload, config.jwt.accessSecret, {
  expiresIn: config.jwt.accessTokenTtl
});

// Cookies
res.cookie('token', token, {
  secure: config.cookie.secure,
  sameSite: config.cookie.sameSite
});

// Environment checks
if (config.isProduction) {
  // Production-only code
}

// Google OAuth
const oauth2Client = new google.auth.OAuth2(
  config.google.clientId,
  config.google.clientSecret,
  config.google.redirectUri
);

// Meta Bot
axios.post(`${config.metaBot.baseUrl}/api/message`, data);
```

### ❌ Wrong Way (Don't do this)

```javascript
// DON'T directly access process.env
const port = process.env.PORT;
const mongoUri = process.env.MONGODB_URI;

// DON'T load dotenv in multiple places
import dotenv from 'dotenv';
dotenv.config();

// DON'T check NODE_ENV directly
if (process.env.NODE_ENV === 'production') { }
```

## Validation

All environment variables are validated on startup using Joi schema. The application will fail to start if:
- Required variables are missing
- Variables have wrong types
- Values don't meet constraints (e.g., secrets too short)

## Production Deployment

### Required Environment Variables

**Minimum required for production:**
```bash
NODE_ENV=production
MONGODB_URI=<your-production-mongodb-uri>
JWT_ACCESS_SECRET=<secure-random-string>
JWT_REFRESH_SECRET=<secure-random-string>
INTERNAL_SERVICE_API_KEY=<secure-random-string>
FRONTEND_URL=<your-frontend-url>
CORS_ORIGINS=<your-frontend-url>
```

### Platform-Specific Examples

**Render.com:**
Set environment variables in the Render dashboard under "Environment" tab.

**Vercel:**
```bash
vercel env add MONGODB_URI production
vercel env add JWT_ACCESS_SECRET production
# ... etc
```

**Docker:**
```dockerfile
# Use .env file
docker run --env-file .env your-image

# Or pass individually
docker run -e NODE_ENV=production -e PORT=3000 your-image
```

## Troubleshooting

### Config validation error
**Error:** `Config validation error: "MONGODB_URI" is required`

**Solution:** Make sure the variable is set in your `.env` file and the file is in the correct location (`packages/backend/.env`).

### JWT secret too short
**Error:** `Config validation error: "JWT_ACCESS_SECRET" length must be at least 32 characters`

**Solution:** Generate a longer secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### CORS issues
**Error:** CORS blocking requests from frontend

**Solution:** Add your frontend URL to `CORS_ORIGINS`:
```bash
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,https://yourdomain.com
```

---

## Files Modified

This centralized configuration system was implemented across:

- **Config:** `src/config/env.js` (main configuration file)
- **Services:** `googleService.js`, `messageForwarding.service.js`
- **Controllers:** `authController.js`, `googleController.js`
- **Scripts:** All 8 migration/utility scripts
- **Middleware:** `csrf.js`

All files now import from the centralized config instead of accessing `process.env` directly.
