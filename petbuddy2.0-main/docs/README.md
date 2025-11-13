# PetBuddy Documentation

Complete documentation for PetBuddy 2.0.

---

## 🚀 Quick Start

| I want to...              | Go to...                                                       |
| ------------------------- | -------------------------------------------------------------- |
| **Set up locally**        | [guides/TEST_PROJECT_NOW.md](guides/TEST_PROJECT_NOW.md)       |
| **Configure environment** | [environment-variables.md](environment-variables.md)           |
| **Deploy to production**  | [deployment/](deployment/)                                     |
| **Use Docker**            | [deployment/docker-setup.md](deployment/docker-setup.md)       |
| **Fix an issue**          | [deployment/troubleshooting.md](deployment/troubleshooting.md) |

---

## 📚 Documentation Index

### 🎯 Getting Started

- **[Test Project Now](guides/TEST_PROJECT_NOW.md)** - Get running locally in 5 minutes
- **[Quick Start Guide](guides/QUICK_START.md)** - Development workflow and setup
- **[Installation Guide](guides/INSTALL.md)** - Detailed installation help
- **[Quick Reference](guides/QUICK_REFERENCE.md)** - Command cheat sheet

### ⚙️ Configuration

- **[Environment Variables](environment-variables.md)** - Complete configuration guide (47 variables)
- **[View Logs](guides/LOGS_GUIDE.md)** - How to view and debug logs
- **[Restart Services](guides/RESTART_GUIDE.md)** - How to restart after changes

### 🐳 Docker & Deployment

- **[Docker Setup](deployment/docker-setup.md)** - Complete Docker guide
- **[Vercel Deployment](deployment/VERCEL_DEPLOYMENT.md)** - Deploy frontend to Vercel
- **[Render Deployment](deployment/RENDER_DEPLOYMENT_GUIDE.md)** - Deploy backend to Render
- **[Render Environment Variables](deployment/RENDER_ENV_VARIABLES.md)** - Render-specific config
- **[Render Quick Start](deployment/RENDER_QUICK_START.md)** - Quick deployment
- **[Troubleshooting](deployment/troubleshooting.md)** - Fix common issues

### 🤖 LangGraph Integration

- **[LangGraph Overview](langgraph/README.md)** - Introduction and navigation
- **[Integration Analysis](langgraph/integration-analysis.md)** - Detailed implementation analysis
- **[Architecture Diagrams](langgraph/diagrams.md)** - Visual guides and diagrams
- **[Quick Reference](langgraph/quick-reference.md)** - Implementation reference

### 🛠️ Development Guides

- **[MongoDB Connection Fix](guides/FIX_MONGODB_CONNECTION.md)** - Database connection issues
- **[Test Commands](guides/TEST_COMMANDS.txt)** - Testing commands reference

### 🏗️ Architecture & Backend

- **[Backend Architecture](architecture/BACKEND_ARCHITECTURE.md)** - Complete backend deep dive
- **[Architecture Diagrams](architecture/ARCHITECTURE_DIAGRAMS.md)** - Visual system architecture
- **[Tech Stack Reference](architecture/TECH_STACK_QUICK_REFERENCE.md)** - Technology quick reference
- **[Backend Docs Index](architecture/BACKEND_DOCS_INDEX.md)** - Backend documentation navigation
- **[AI Tools Architecture](architecture/AI_TOOLS_ARCHITECTURE_ANALYSIS.md)** - AI tools deep dive

### ✨ Features

- **[Reschedule Functionality](features/RESCHEDULE_DOCUMENTATION_INDEX.md)** - Appointment rescheduling docs
- **[Real-Time Sockets Quick Start](features/QUICK_START_REALTIME_SOCKETS.md)** - Real-time appointment updates
- **[Real-Time Implementation](features/REALTIME_APPOINTMENTS_IMPLEMENTATION.md)** - Detailed implementation guide

### 🔍 Code Quality & Audits

- **[Tool Audit Index](audits/TOOL_AUDIT_INDEX.md)** - Code audit navigation
- **[Tool Audit Summary](audits/TOOL_AUDIT_SUMMARY.md)** - Executive audit summary
- **[Tool Audit Report](audits/TOOL_INVOCATION_AUDIT_REPORT.md)** - Complete technical audit
- **[Critical Fixes Guide](audits/TOOL_AUDIT_CRITICAL_FIXES.md)** - Implementation guide for fixes
- **[Implemented Fixes Summary](audits/IMPLEMENTED_FIXES_SUMMARY.md)** - Summary of critical fixes

---

## 🎯 Environment Configuration - Quick Setup

**Frontend:** Only **1 variable** needed!

```bash
NEXT_PUBLIC_BACKEND_ORIGIN=https://your-backend.com
```

**Backend:** Only **1 main variable** needed!

```bash
FRONTEND_URL=https://your-frontend.com
```

All other URLs automatically derive from these.

See: **[environment-variables.md](environment-variables.md)** for complete guide.

---

## 📁 Documentation Structure

```
docs/
├── README.md                          # This file
├── environment-variables.md           # Complete env vars (47 total)
│
├── architecture/                     # Architecture documentation
│   ├── BACKEND_ARCHITECTURE.md       # Complete backend deep dive
│   ├── ARCHITECTURE_DIAGRAMS.md      # Visual system architecture
│   ├── TECH_STACK_QUICK_REFERENCE.md  # Technology quick reference
│   ├── BACKEND_DOCS_INDEX.md         # Backend documentation navigation
│   └── AI_TOOLS_ARCHITECTURE_ANALYSIS.md  # AI tools deep dive
│
├── features/                          # Feature-specific documentation
│   ├── RESCHEDULE_DOCUMENTATION_INDEX.md      # Reschedule docs index
│   ├── RESCHEDULE_FUNCTIONALITY_ANALYSIS.md   # Reschedule analysis
│   ├── RESCHEDULE_QUICK_REFERENCE.md          # Reschedule quick ref
│   ├── QUICK_START_REALTIME_SOCKETS.md        # Real-time sockets guide
│   └── REALTIME_APPOINTMENTS_IMPLEMENTATION.md # Real-time implementation
│
├── audits/                            # Code quality & audit reports
│   ├── TOOL_AUDIT_INDEX.md           # Audit navigation
│   ├── TOOL_AUDIT_SUMMARY.md         # Executive summary
│   ├── TOOL_INVOCATION_AUDIT_REPORT.md # Complete technical audit
│   ├── TOOL_AUDIT_CRITICAL_FIXES.md  # Implementation guide
│   └── IMPLEMENTED_FIXES_SUMMARY.md  # Fixes summary
│
├── deployment/                        # Deployment guides
│   ├── DOCKER_SETUP_GUIDE.md        # Docker guide
│   ├── VERCEL_DEPLOYMENT.md          # Frontend deployment
│   ├── RENDER_DEPLOYMENT_GUIDE.md   # Backend deployment
│   ├── RENDER_ENV_VARIABLES.md      # Render config
│   ├── RENDER_QUICK_START.md        # Quick deploy
│   └── troubleshooting.md            # Common issues
│
├── guides/                           # Development guides
│   ├── TEST_PROJECT_NOW.md          # Quick start
│   ├── QUICK_START.md               # Development workflow
│   ├── INSTALL.md                   # Installation
│   ├── QUICK_REFERENCE.md           # Commands reference
│   ├── LOGS_GUIDE.md                # View logs
│   ├── RESTART_GUIDE.md             # Restart services
│   ├── FIX_MONGODB_CONNECTION.md    # Database fixes
│   └── TEST_COMMANDS.txt            # Test commands
│
└── langgraph/                       # LangGraph integration docs
    ├── README.md                    # Overview
    ├── integration-analysis.md      # Detailed analysis
    ├── diagrams.md                  # Architecture diagrams
    └── quick-reference.md           # Implementation reference
```

---

## 🚀 Most Common Tasks

### 1. Start Development

```bash
npm run docker:up    # Start MongoDB
npm run dev          # Start all services
```

### 2. View Logs

```bash
npm run docker:logs:backend
npm run docker:logs:meta-bot
```

### 3. Restart After Changes

```bash
npm run docker:reload   # Full reload
npm run docker:restart  # Quick restart
```

### 4. Deploy to Production

- Frontend: [Vercel Deployment](deployment/VERCEL_DEPLOYMENT.md)
- Backend: [Render Deployment](deployment/RENDER_DEPLOYMENT_GUIDE.md)

---

**Last Updated**: November 2025
