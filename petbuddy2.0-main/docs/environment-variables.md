# Complete Environment Variables Reference

This document lists **ALL** environment variables used across the PetBuddy 2.0 monorepo.

## Quick Setup for Local Testing

✅ **All .env files have been created with working defaults!**

```bash
# Files created:
# ✅ packages/backend/.env
# ✅ packages/meta-bot/.env
# ✅ packages/frontend/.env.local

# Start all services:
npm run dev
```

---

## 📦 Backend Environment Variables

**Location:** `packages/backend/.env`

### Required Variables

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `MONGODB_URI` | string | MongoDB connection string | `mongodb://localhost:27017/petbuddy` |
| `JWT_ACCESS_SECRET` | string (min 32) | JWT access token secret | Auto-generated in .env |
| `JWT_REFRESH_SECRET` | string (min 32) | JWT refresh token secret | Auto-generated in .env |
| `INTERNAL_SERVICE_API_KEY` | string (min 32) | Internal API key for meta-bot | Auto-generated in .env |

### Server Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment mode: development, production, test |
| `PORT` | `3000` | Backend server port |

### JWT Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `ACCESS_TOKEN_TTL` | `15m` | Access token lifetime (e.g., 15m, 1h) |
| `REFRESH_TOKEN_TTL` | `7d` | Refresh token lifetime (e.g., 7d, 30d) |

### Frontend/CORS Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `FRONTEND_URL` | `http://localhost:5173` | Frontend URL for CORS and OAuth |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:3000` | Comma-separated allowed origins |

### Security

| Variable | Default | Description |
|----------|---------|-------------|
| `BCRYPT_SALT_ROUNDS` | `12` | Bcrypt salt rounds (10-15) |

### Logging

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `info` | Logging level: error, warn, info, debug |

### Facebook Integration (Optional)

| Variable | Default | Description |
|----------|---------|-------------|
| `FACEBOOK_APP_ID` | - | Facebook app ID from developers.facebook.com |
| `FACEBOOK_APP_SECRET` | - | Facebook app secret |
| `FACEBOOK_GRAPH_VERSION` | `v18.0` | Facebook Graph API version |
| `FACEBOOK_SCOPES` | - | Comma-separated scopes (e.g., pages_messaging) |

### Google Calendar Integration (Optional)

| Variable | Default | Description |
|----------|---------|-------------|
| `GOOGLE_CLIENT_ID` | - | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | - | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | - | OAuth callback URL |

### Services

| Variable | Default | Description |
|----------|---------|-------------|
| `META_BOT_BASE_URL` | `http://localhost:5001` | Meta-bot service URL |

---

## 🤖 Meta-Bot Environment Variables

**Location:** `packages/meta-bot/.env`

### Required Variables

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `MONGODB_URI` | string | MongoDB URI (must match backend) | `mongodb://localhost:27017/petbuddy` |
| `INTERNAL_SERVICE_API_KEY` | string (min 32) | Must match backend's key | Auto-generated in .env |
| `VERIFY_TOKEN` | string | Facebook webhook verification token | `my_secure_verify_token_local_2024` |

### Server Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment mode |
| `META_BOT_PORT` | `5001` | Meta-bot server port |

### Backend Integration

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKEND_API_URL` | `http://localhost:3000` | Backend API URL |
| `OUTBOUND_SERVER_URL` | - | Optional outbound message forwarding URL |

### Security (Must Match Backend)

| Variable | Description |
|----------|-------------|
| `JWT_ACCESS_SECRET` | Must match backend for token verification |
| `JWT_REFRESH_SECRET` | Must match backend for token verification |

### Facebook Integration (Optional)

| Variable | Description | Required For |
|----------|-------------|--------------|
| `FB_PAGE_ACCESS_TOKEN` | Facebook page access token | Facebook messaging |
| `APP_SECRET` | Facebook app secret | Facebook messaging |
| `ADMIN_PAGE_ACCESS_TOKEN` | Admin page token | System notifications |
| `ADMIN_CHAT_ID` | Admin chat ID | System notifications |

### Instagram Integration (Optional)

| Variable | Description | Required For |
|----------|-------------|--------------|
| `INSTA_PAGE_ACCESS_TOKEN` | Instagram page access token | Instagram messaging |
| `ADMIN_INSTAGRAM_ACCESS_TOKEN` | Admin Instagram token | System notifications |
| `ADMIN_INSTAGRAM_CHAT_ID` | Admin Instagram chat ID | System notifications |

### OpenAI Configuration (Optional)

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | - | OpenAI API key for AI features |
| `CHAT_MODEL` | `gpt-4o` | Chat completion model |
| `IMAGE_MODEL` | `gpt-4o` | Image analysis model |

### Bot Behavior

| Variable | Default | Description |
|----------|---------|-------------|
| `RESPONSE_DELAY_MS` | `4000` | Delay before bot responds (milliseconds) |
| `SYSTEM_INSTRUCTIONS` | - | Optional override for AI system instructions |

---

## 🎨 Frontend Environment Variables

**Location:** `packages/frontend/.env.local`

### Required Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_BACKEND_ORIGIN` | `http://localhost:3000` | Backend server URL (REQUIRED) |

### Optional - App Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_APP_NAME` | `PetBuddy` | Application name |
| `NEXT_PUBLIC_APP_VERSION` | `2.0.0` | Application version |

### Optional - Facebook Integration

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_FACEBOOK_APP_ID` | Facebook app ID for client-side integration |

### Optional - Feature Flags

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_ENABLE_NEW_UI` | `false` | Enable new UI features |
| `NEXT_PUBLIC_ENABLE_AI_ASSIST` | `false` | Enable AI assistant features |

### Optional - Advanced Overrides

| Variable | Auto-Derived From | Description |
|----------|-------------------|-------------|
| `NEXT_PUBLIC_API_URL` | `NEXT_PUBLIC_BACKEND_ORIGIN` | Override API URL |
| `NEXT_PUBLIC_SOCKET_URL` | `NEXT_PUBLIC_BACKEND_ORIGIN` | Override Socket.io URL |
| `NEXT_PUBLIC_API_BASE_URL` | `/api/v1` | Override API base path |

---

## 🔐 Security Keys that Must Match

These keys must be **IDENTICAL** across backend and meta-bot:

1. **`INTERNAL_SERVICE_API_KEY`** - For backend ↔ meta-bot communication
2. **`JWT_ACCESS_SECRET`** - For token verification
3. **`JWT_REFRESH_SECRET`** - For token verification
4. **`MONGODB_URI`** - Must use the same database

---

## 🔑 Generating Secure Keys

Use this command to generate secure random keys:

```bash
# On macOS/Linux:
openssl rand -hex 32

# On Windows (PowerShell):
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))

# Using Node.js:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🗄️ Database Connection Examples

### Local MongoDB (Default)
```bash
MONGODB_URI=mongodb://localhost:27017/petbuddy
```

### Docker MongoDB
```bash
MONGODB_URI=mongodb://admin:password123@localhost:27017/petbuddy?authSource=admin
```

### MongoDB Atlas (Production)
```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/petbuddy?retryWrites=true&w=majority
```

---

## 📋 Configuration Files Summary

| Package | File | Status | Notes |
|---------|------|--------|-------|
| Backend | `packages/backend/.env` | ✅ Created | Ready for local testing |
| Backend | `packages/backend/.env.example` | ✅ Exists | Template file |
| Meta-Bot | `packages/meta-bot/.env` | ✅ Created | Ready for local testing |
| Meta-Bot | `packages/meta-bot/.env.example` | ✅ Exists | Template file |
| Frontend | `packages/frontend/.env.local` | ✅ Created | Ready for local testing |
| Frontend | `packages/frontend/.env.example` | ✅ Exists | Template file |
| Docker | `docker/.env.example` | ✅ Exists | For Docker Compose only |

---

## 🚀 Quick Start Commands

```bash
# 1. All .env files are already created with working defaults!

# 2. Start MongoDB (choose one):
make docker-up                    # Start MongoDB in Docker
# OR use local MongoDB on port 27017

# 3. Start all services:
make dev                          # Start all services
# OR
npm run dev

# 4. Individual services:
npm run dev:backend               # Backend only (port 3000)
npm run dev:frontend              # Frontend only (port 5173)
npm run dev:meta-bot              # Meta-bot only (port 5001)
```

---

## ⚠️ Important Notes

1. **Backend Port Changed**: Backend now runs on **port 3000** (not 4000)
2. **Frontend Port**: Frontend runs on **port 5173** (Vite default)
3. **Meta-Bot Port**: Meta-bot runs on **port 5001**

4. **Required for Basic Testing**:
   - MongoDB running (local or Docker)
   - Backend `.env` file
   - Frontend `.env.local` file

5. **Optional Features**:
   - Facebook/Instagram integration requires valid tokens
   - OpenAI features require API key
   - Google Calendar requires OAuth credentials

---

## 🔍 Environment Variable Validation

Each package validates its required environment variables on startup:

- **Backend**: Uses Joi schema validation (see `packages/backend/src/config/env.js`)
- **Meta-Bot**: Uses custom validation (see `packages/meta-bot/config/env.js`)
- **Frontend**: Uses runtime defaults (see `packages/frontend/config/env.js`)

Missing required variables will cause startup errors with clear messages.

---

## 📚 Related Documentation

- [Installation Guide](docs/guides/INSTALL.md)
- [Quick Start](docs/guides/QUICK_START.md)
- [Deployment Guide](docs/deployment/)
- [Main README](README.md)
