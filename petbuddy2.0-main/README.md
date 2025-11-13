# PetBuddy 2.0

Complete pet grooming salon management system with Meta bot integration.

## Architecture

This is a **monorepo** using npm workspaces with the following structure:

```
petbuddy2.0/
├── packages/
│   ├── shared/              # Shared models, types, and utilities
│   ├── backend/             # Main REST API service
│   ├── meta-bot/            # Facebook/Instagram bot service
│   └── frontend/            # Next.js web application
├── docker/                  # Docker configuration
│   ├── docker-compose.yml
│   └── .env.example
└── scripts/                 # Development scripts
```

## Features

- **Backend API**: RESTful API for salon management

  - Appointment booking and scheduling
  - Customer and pet management
  - Staff scheduling
  - Service catalog management
  - Google Calendar integration
  - Real-time updates via Socket.IO

- **Meta Bot**: AI-powered customer service bot

  - Facebook Messenger integration
  - Instagram DM integration
  - OpenAI-powered conversational AI
  - Automatic appointment booking
  - Lead management

- **Frontend**: Modern Next.js application
  - Responsive design
  - Real-time updates
  - Staff and customer portals

## ⚡ Quick Start

**TL;DR - Three commands to start:**

```bash
npm run setup        # 1. Install everything
npm run docker:up    # 2. Start MongoDB
npm run dev          # 3. Start all services
```

🎉 **Done!** Visit http://localhost:3001

📖 **Need help?** See [docs/guides/TEST_PROJECT_NOW.md](docs/guides/TEST_PROJECT_NOW.md) for detailed setup instructions.

---

## Detailed Setup

### Prerequisites

- Node.js >= 18.0.0
- Docker Desktop (recommended) or MongoDB installed locally
- npm

### After Installation

1. **Start MongoDB with Docker:**

   ```bash
   npm run docker:up
   ```

2. **Start all services:**

   ```bash
   npm run dev
   ```

3. **Access the application:**
   - Frontend: http://localhost:3001
   - Backend API: http://localhost:3000
   - Health Check: http://localhost:3000/health

📖 **Detailed guide:** See [docs/guides/TEST_PROJECT_NOW.md](docs/guides/TEST_PROJECT_NOW.md)

### Manual Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Configure environment:**

   ```bash
   cd docker
   cp .env.example .env
   # Edit .env with your values
   ```

3. **Start with Docker (all services):**

   ```bash
   npm run docker:up
   ```

4. **Or start locally (without Docker):**
   ```bash
   # Start MongoDB first (see docs/guides/TEST_PROJECT_NOW.md)
   npm run dev:backend
   ```

### Access Points

- **Backend API**: http://localhost:3000
- **Backend Health**: http://localhost:3000/health
- **Meta Bot**: http://localhost:5001
- **Frontend**: http://localhost:5173
- **MongoDB**: mongodb://localhost:27017

## Project Structure

### Shared Package (`packages/shared`)

Contains models and utilities shared across services:

```javascript
import { Appointment, Contact, Pet } from "@petbuddy/shared";
```

**Models:**

- Appointment
- Company
- Contact (leads and customers)
- Location
- Message
- Pet
- ServiceCategory
- ServiceItem
- User

### Backend (`packages/backend`)

Main API service with:

- Authentication & authorization
- Booking management
- Real-time Socket.IO events
- Google Calendar sync
- Resource management

### Meta Bot (`packages/meta-bot`)

AI customer service bot with:

- Facebook/Instagram webhook handling
- OpenAI integration
- Conversation management
- Automatic appointment booking

### Frontend (`packages/frontend`)

Next.js application with:

- Staff portal
- Customer portal
- Real-time updates
- Responsive design

## Scripts

```bash
# Development
npm run dev                    # Start all services
npm run dev:backend            # Start backend only
npm run dev:meta-bot           # Start meta-bot only
npm run dev:frontend           # Start frontend only

# Docker
npm run docker:up              # Start all Docker services
npm run docker:down            # Stop all Docker services
npm run docker:logs            # View Docker logs
npm run docker:build           # Rebuild Docker images

#Logs
npm run docker:logs:backend
npm run docker:logs:meta-bot
# Production
npm run build                  # Build frontend
npm start                      # Start backend and meta-bot

# Testing
npm test                       # Run backend tests

# Database
npm run seed                   # Seed database with sample data
```

## Documentation

📚 **[Complete Documentation](docs/)** - All guides in one place

### Getting Started
- **[Documentation Index](docs/README.md)** - Complete documentation overview
- **[Quick Start Guide](docs/guides/TEST_PROJECT_NOW.md)** - Get started in 5 minutes
- **[Installation Guide](docs/guides/INSTALL.md)** - Detailed installation help
- **[Quick Reference](docs/guides/QUICK_REFERENCE.md)** - Command cheat sheet

### Architecture & Development
- **[Backend Architecture](docs/architecture/BACKEND_ARCHITECTURE.md)** - Complete backend deep dive
- **[Architecture Diagrams](docs/architecture/ARCHITECTURE_DIAGRAMS.md)** - Visual system architecture
- **[Tech Stack Reference](docs/architecture/TECH_STACK_QUICK_REFERENCE.md)** - Technology quick reference
- **[Backend Docs Index](docs/architecture/BACKEND_DOCS_INDEX.md)** - Backend documentation navigation

### Features
- **[Reschedule Functionality](docs/features/RESCHEDULE_DOCUMENTATION_INDEX.md)** - Appointment rescheduling docs
- **[Real-Time Sockets](docs/features/QUICK_START_REALTIME_SOCKETS.md)** - Real-time appointment updates
- **[Real-Time Implementation](docs/features/REALTIME_APPOINTMENTS_IMPLEMENTATION.md)** - Detailed implementation guide

### Configuration & Deployment
- **[Environment Variables](docs/environment-variables.md)** - Complete configuration guide (47 variables)
- **[Docker Setup](docs/deployment/DOCKER_SETUP_GUIDE.md)** - Docker configuration guide
- **[Deployment Guides](docs/deployment/)** - Deploy to Vercel + Render
- **[Troubleshooting](docs/deployment/troubleshooting.md)** - Fix common issues

### Code Quality & Audits
- **[Tool Audit Index](docs/audits/TOOL_AUDIT_INDEX.md)** - Code audit navigation
- **[Tool Audit Summary](docs/audits/TOOL_AUDIT_SUMMARY.md)** - Executive audit summary
- **[Implemented Fixes](docs/audits/IMPLEMENTED_FIXES_SUMMARY.md)** - Summary of critical fixes

### AI & LangGraph
- **[LangGraph Integration](docs/langgraph/)** - AI agent architecture docs
- **[AI Tools Architecture](docs/architecture/AI_TOOLS_ARCHITECTURE_ANALYSIS.md)** - AI tools deep dive

## Environment Configuration

Each package has its own environment configuration:

- **Backend**: `packages/backend/.env` - [Configuration Guide](packages/backend/ENVIRONMENT_VARIABLES.md)
- **Frontend**: `packages/frontend/.env.local` - [See .env.example](packages/frontend/.env.example)
- **Meta-Bot**: `packages/meta-bot/.env` - [See .env.example](packages/meta-bot/.env.example)

**🚀 Quick Setup:**

1. Copy environment templates:

   ```bash
   cp packages/backend/.env.example packages/backend/.env
   cp packages/frontend/.env.example packages/frontend/.env.local
   cp packages/meta-bot/.env.example packages/meta-bot/.env
   ```

2. Generate secure secrets:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. Update the `.env` files with your values

**📚 Full Guide:** See [docs/environment-variables.md](docs/environment-variables.md) for complete configuration details

## Docker Deployment

The application is fully containerized with Docker Compose:

```yaml
services:
  - mongodb: Database
  - backend: API service
  - meta-bot: Bot service
```

Build and run:

```bash
cd docker
docker-compose up --build
```

## Development Workflow

1. **Make changes** to any package
2. **Changes are immediately reflected** (via volume mounts in dev mode)
3. **Shared models** are automatically available to all services
4. **No need to rebuild** unless dependencies change

## Production Deployment

### Building for Production

```bash
# Install production dependencies only
npm ci --omit=dev

# Build frontend
npm run build:frontend
```

### Environment Setup

1. Create production `.env` file
2. Generate strong secrets
3. Configure external services (MongoDB, Redis if needed)
4. Set up reverse proxy (nginx)

### Docker Production

```bash
cd docker
docker-compose -f docker-compose.yml up -d --build
```

## Monorepo Benefits

✅ **Shared code**: Models defined once, used everywhere
✅ **Type safety**: Consistent types across services
✅ **Easier refactoring**: Change once, update everywhere
✅ **Simplified dependencies**: One `node_modules` for common packages
✅ **Better Docker**: No cross-service code copying needed
✅ **Clear separation**: Each service is independent but shares common code

## Tech Stack

- **Backend**: Node.js, Express, Mongoose, Socket.IO
- **Meta Bot**: Node.js, Express, OpenAI API
- **Frontend**: Next.js, React, Redux, TailwindCSS
- **Database**: MongoDB
- **Containerization**: Docker, Docker Compose

## Contributing

1. Create feature branch
2. Make changes
3. Test locally
4. Create pull request

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.
