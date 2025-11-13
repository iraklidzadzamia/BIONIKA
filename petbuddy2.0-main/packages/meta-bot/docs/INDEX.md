# Meta-Bot Documentation Index

Welcome to the meta-bot documentation. This index helps you find what you need quickly.

## 📚 Quick Start

- [README](../README.md) - Project overview and setup
- [GEMINI_QUICK_START](GEMINI_QUICK_START.md) - Get started with Gemini AI integration

## 🏗️ Architecture & Setup

### Core Architecture
- [HYBRID_AGENT_ARCHITECTURE](HYBRID_AGENT_ARCHITECTURE.md) - Complete system architecture
- [HYBRID_AI_STRATEGY](HYBRID_AI_STRATEGY.md) - AI strategy and approach
- [HYBRID_FLOW_DIAGRAM](HYBRID_FLOW_DIAGRAM.md) - Visual flow diagrams
- [HYBRID_IMPLEMENTATION_SUMMARY](HYBRID_IMPLEMENTATION_SUMMARY.md) - Implementation details

### Configuration
- [ENVIRONMENT_VARIABLES](ENVIRONMENT_VARIABLES.md) - All environment variables explained
- [DATABASE_INDEXES](DATABASE_INDEXES.md) - Database indexes and optimization

## 🔧 Features & Functionality

### Buffer System
- [Buffer Configuration](features/BUFFER_REFACTORING.md) - Buffer system refactoring
- [Dynamic Delay Feature](features/DYNAMIC_DELAY_FEATURE.md) - Configurable response delays
- [Buffer Flow](buffer-flow.md) - Buffer flow diagrams

### Booking & Conflicts
- [Booking Conflicts](features/CHANGELOG_BOOKING_CONFLICTS.md) - Booking conflict handling
- [Booking Conflict Flow](booking-conflict-flow.md) - Conflict resolution flow
- [Quick Reference](QUICK_REFERENCE_CONFLICTS.md) - Quick conflict resolution guide

### AI Integration
- [Gemini Integration](GEMINI_INTEGRATION.md) - Google Gemini AI setup
- [Gemini Troubleshooting](GEMINI_TROUBLESHOOTING.md) - Common Gemini issues
- [Tool Enforcement Fix](TOOL_ENFORCEMENT_FIX.md) - Tool call enforcement

## 📖 Guides

- [Setup Guide](HYBRID_SETUP_GUIDE.md) - Complete setup instructions
- [Logging Guide](guides/LOGGING_GUIDE.md) - How to use logging effectively
- [View Logs](guides/VIEW_LOGS.md) - How to access and read logs
- [Troubleshooting](guides/TROUBLESHOOTING.md) - Common issues and solutions

## 🔄 Refactoring Documentation

### Current Refactoring Work
- [Refactoring Plan](refactoring/REFACTORING_PLAN.md) - Complete 6-phase roadmap
- [Refactoring Complete](refactoring/REFACTORING_COMPLETE.md) - ⭐ **Comprehensive summary of all work**
- [Phase 1 Summary](refactoring/REFACTORING_SUMMARY.md) - Quick wins (duplicate code, bugs)
- [Phase 2 Summary](refactoring/PHASE_2_SUMMARY.md) - Tool modularization

### What Changed
- **Phases 1 & 2 Complete** (Nov 2025)
  - ✅ Eliminated 80 lines of duplicate code
  - ✅ Fixed admin notification bug
  - ✅ Started tool modularization (4/14 tools extracted)
  - ✅ 100% backward compatible

## 🔍 Audits & Reviews

- [Integration Audit Summary](INTEGRATION_AUDIT_SUMMARY.md) - Integration audit results
- [Integration Audit Review](INTEGRATION_AUDIT_REVIEW.md) - Detailed audit review
- [Refactoring 2024](REFACTORING_2024.md) - 2024 refactoring work
- [Refactor Summary](REFACTOR_SUMMARY.md) - Previous refactor summary

## 📦 Archive

Historical documentation that may be outdated but kept for reference:

- [Appointment Booking Fix](archive/APPOINTMENT_BOOKING_FIX.md)
- [Complete Refactoring Summary](archive/COMPLETE_REFACTORING_SUMMARY.md)
- [Comprehensive Logging Summary](archive/COMPREHENSIVE_LOGGING_SUMMARY.md)
- [Facebook Refactoring](archive/FACEBOOK_REFACTORING.md)
- [Refactoring (Old)](archive/REFACTORING.md)
- [Refactoring Complete (Old)](archive/REFACTORING_COMPLETE.md)
- [Index Fix Summary](archive/INDEX_FIX_SUMMARY.md)

## 🗂️ Documentation Structure

```
docs/
├── INDEX.md                          (this file)
├── GEMINI_QUICK_START.md            Quick start guide
│
├── features/                         Feature-specific docs
│   ├── BUFFER_REFACTORING.md
│   ├── DYNAMIC_DELAY_FEATURE.md
│   └── CHANGELOG_BOOKING_CONFLICTS.md
│
├── refactoring/                      Current refactoring work
│   ├── REFACTORING_COMPLETE.md      ⭐ Start here!
│   ├── REFACTORING_PLAN.md          Complete roadmap
│   ├── REFACTORING_SUMMARY.md       Phase 1 details
│   └── PHASE_2_SUMMARY.md           Phase 2 details
│
├── guides/                           How-to guides
│   ├── LOGGING_GUIDE.md
│   ├── VIEW_LOGS.md
│   └── TROUBLESHOOTING.md
│
└── archive/                          Historical docs
    └── (various archived files)
```

## 🎯 Where to Start

### I'm New to This Project
Start with:
1. [README](../README.md) - Project overview
2. [HYBRID_AGENT_ARCHITECTURE](HYBRID_AGENT_ARCHITECTURE.md) - Understand the system
3. [ENVIRONMENT_VARIABLES](ENVIRONMENT_VARIABLES.md) - Set up your environment
4. [HYBRID_SETUP_GUIDE](HYBRID_SETUP_GUIDE.md) - Complete setup

### I'm Working on the Codebase
Read:
1. [Refactoring Complete](refactoring/REFACTORING_COMPLETE.md) - Recent changes
2. [Refactoring Plan](refactoring/REFACTORING_PLAN.md) - Future work
3. [Logging Guide](guides/LOGGING_GUIDE.md) - How to log properly

### I'm Debugging an Issue
Check:
1. [Troubleshooting Guide](guides/TROUBLESHOOTING.md) - Common issues
2. [View Logs](guides/VIEW_LOGS.md) - How to access logs
3. [Gemini Troubleshooting](GEMINI_TROUBLESHOOTING.md) - AI-specific issues

### I'm Adding a Feature
Review:
1. [Hybrid Agent Architecture](HYBRID_AGENT_ARCHITECTURE.md) - System design
2. [Tool Enforcement Fix](TOOL_ENFORCEMENT_FIX.md) - How tools work
3. [Refactoring Plan](refactoring/REFACTORING_PLAN.md) - Coding standards

## 📝 Documentation Conventions

- **UPPERCASE_WITH_UNDERSCORES.md** - Major documentation files
- **kebab-case.md** - Diagram and flow files
- **archive/** - Historical documentation (may be outdated)
- **guides/** - Step-by-step how-to guides

## 🔄 Keeping Documentation Updated

When making changes:
1. Update relevant docs immediately
2. Add entry to appropriate changelog
3. Update this INDEX.md if adding new docs
4. Archive outdated docs to archive/

## 📞 Getting Help

If you can't find what you need:
1. Check [Troubleshooting Guide](guides/TROUBLESHOOTING.md)
2. Search this documentation index
3. Check Git commit history for context
4. Ask the team

---

**Last Updated**: November 5, 2025
**Documentation Version**: 2.0 (Post-Refactoring)
