# PetBuddy Reschedule Functionality - Documentation Index

Created: November 3, 2025

This comprehensive documentation package explains how appointment rescheduling is implemented in the PetBuddy meta-bot system.

---

## Documents in This Package

### 1. RESCHEDULE_IMPLEMENTATION_SUMMARY.txt (19 KB)
**Best for:** Getting a quick, structured understanding of the entire system
**Contents:**
- Quick overview of the reschedule flow
- Architecture components (6 major parts)
- Tool specification with input/output examples
- Step-by-step execution flow (10 steps)
- Time parsing examples and supported formats
- Validation & business logic checklist
- Database impact and update examples
- Error codes and recovery strategies
- Key files and locations index
- Testing checklist
- Performance characteristics
- Security notes

**When to read:** Start here for a birds-eye view before diving deeper

---

### 2. RESCHEDULE_FUNCTIONALITY_ANALYSIS.md (33 KB)
**Best for:** Deep, comprehensive understanding with code examples
**Contents:**
- 17 detailed sections covering every aspect
- Architecture overview with flow diagrams
- Complete tool definition with schema
- Full implementation code walkthrough (9 steps)
- Natural language time parsing details
- Conversation graph integration
- Backend validation in detail
- Timezone handling with examples
- Complete customer workflow scenario (14 steps)
- Key files and functions table
- Validation & business logic summary
- Configuration & environment variables
- Key features & highlights
- Failure scenarios & recovery strategies
- Performance considerations
- Security & validation details
- Testing scenarios
- Integration points
- Troubleshooting guide

**When to read:** When you need to understand the complete implementation with code details

---

### 3. RESCHEDULE_QUICK_REFERENCE.md (12 KB)
**Best for:** Quick lookup while developing or troubleshooting
**Contents:**
- Quick navigation to key files
- Tool input/output reference
- Conversation flow diagram
- Time parsing examples table
- Validation checklist
- Error codes quick reference
- Timezone handling process
- Common scenarios (4 examples)
- Database impact examples
- Testing checklist
- Integration points table
- Performance notes
- Key takeaways
- Troubleshooting guide
- File locations quick index

**When to read:** When you need a quick lookup or reminder while working

---

## How to Use These Documents

### For New Team Members
1. Start with: **RESCHEDULE_IMPLEMENTATION_SUMMARY.txt** (20 min read)
2. Then read: **RESCHEDULE_QUICK_REFERENCE.md** (15 min read)
3. Deep dive: **RESCHEDULE_FUNCTIONALITY_ANALYSIS.md** (45 min read)

### For Implementation/Bug Fixing
1. Quick lookup: **RESCHEDULE_QUICK_REFERENCE.md**
2. Code reference: **RESCHEDULE_IMPLEMENTATION_SUMMARY.txt** (Section 9)
3. Detailed logic: **RESCHEDULE_FUNCTIONALITY_ANALYSIS.md** (Relevant sections)

### For Testing
1. Test scenarios: **RESCHEDULE_QUICK_REFERENCE.md** (Testing Checklist)
2. Error codes: **RESCHEDULE_QUICK_REFERENCE.md** (Error Codes & Messages)
3. Detailed flows: **RESCHEDULE_IMPLEMENTATION_SUMMARY.txt** (Section 4)

### For Troubleshooting
1. Error reference: **RESCHEDULE_QUICK_REFERENCE.md** (Troubleshooting)
2. Common scenarios: **RESCHEDULE_QUICK_REFERENCE.md** (Common Scenarios)
3. Detailed analysis: **RESCHEDULE_FUNCTIONALITY_ANALYSIS.md** (Section 14)

---

## Key Files Referenced

### Meta-Bot Server
- **reschedule_appointment tool**: `/packages/meta-bot/lib/toolHandlers.js` (lines 999-1176)
- **Tool schema**: `/packages/meta-bot/utils/openaiTools.js`
- **LangGraph**: `/packages/meta-bot/langgraph/graph.js`
- **Agent node**: `/packages/meta-bot/langgraph/nodes/agent.js`
- **Tool executor**: `/packages/meta-bot/langgraph/nodes/toolExecutor.js`

### Backend
- **Validation & update**: `/packages/backend/src/services/bookingService.js` → `updateAppointment()`
- **Availability check**: `/packages/backend/src/services/bookingService.js` → `checkAvailability()`

---

## Quick Navigation by Topic

### Understanding the Flow
- **RESCHEDULE_IMPLEMENTATION_SUMMARY.txt**: Section 4 (Execution Flow)
- **RESCHEDULE_FUNCTIONALITY_ANALYSIS.md**: Section 3 (Flow Diagram)

### Tool Specification
- **RESCHEDULE_QUICK_REFERENCE.md**: Tool Input/Output
- **RESCHEDULE_IMPLEMENTATION_SUMMARY.txt**: Section 3 (Tool Specification)
- **RESCHEDULE_FUNCTIONALITY_ANALYSIS.md**: Section 2 (Tool Definition)

### Time Parsing
- **RESCHEDULE_QUICK_REFERENCE.md**: Time Parsing Examples
- **RESCHEDULE_IMPLEMENTATION_SUMMARY.txt**: Section 5 (Time Parsing)
- **RESCHEDULE_FUNCTIONALITY_ANALYSIS.md**: Section 5 (Natural Language Time Parsing)

### Validation & Business Logic
- **RESCHEDULE_QUICK_REFERENCE.md**: Validation Checklist
- **RESCHEDULE_IMPLEMENTATION_SUMMARY.txt**: Section 6 (Validation & Business Logic)
- **RESCHEDULE_FUNCTIONALITY_ANALYSIS.md**: Section 11 (Validation & Business Logic Summary)

### Error Handling
- **RESCHEDULE_QUICK_REFERENCE.md**: Error Codes & Messages, Troubleshooting
- **RESCHEDULE_IMPLEMENTATION_SUMMARY.txt**: Section 8 (Error Codes)
- **RESCHEDULE_FUNCTIONALITY_ANALYSIS.md**: Section 14 (Failure Scenarios & Recovery)

### Timezone Handling
- **RESCHEDULE_QUICK_REFERENCE.md**: Timezone Handling
- **RESCHEDULE_IMPLEMENTATION_SUMMARY.txt**: Section 5 (Time Parsing, Timezone Handling)
- **RESCHEDULE_FUNCTIONALITY_ANALYSIS.md**: Section 8 (Timezone Handling)

### Testing
- **RESCHEDULE_QUICK_REFERENCE.md**: Testing Checklist
- **RESCHEDULE_IMPLEMENTATION_SUMMARY.txt**: Section 10 (Testing & Troubleshooting)
- **RESCHEDULE_FUNCTIONALITY_ANALYSIS.md**: Section 17 (Testing Scenarios)

### Integration Points
- **RESCHEDULE_QUICK_REFERENCE.md**: Integration Points
- **RESCHEDULE_FUNCTIONALITY_ANALYSIS.md**: Section 16 (Integration)

---

## Document Statistics

| Document | Size | Lines | Type | Read Time |
|----------|------|-------|------|-----------|
| RESCHEDULE_IMPLEMENTATION_SUMMARY.txt | 19 KB | 472 | Summary | 15-20 min |
| RESCHEDULE_FUNCTIONALITY_ANALYSIS.md | 33 KB | 1023 | Detailed | 45-60 min |
| RESCHEDULE_QUICK_REFERENCE.md | 12 KB | 450 | Quick Ref | 10-15 min |

**Total**: 64 KB of comprehensive documentation

---

## Key Concepts Summary

### The Reschedule Tool
- **Purpose**: Reschedule an existing appointment to a new date/time
- **Triggered by**: LLM decision based on customer request
- **Input**: appointment_id + new_appointment_text_time
- **Output**: Confirmation or error
- **Validation**: Extensive (staff, availability, resources, hours, buffer)

### The Flow
1. Customer sends reschedule request via Messenger
2. LLM analyzes and decides to call reschedule_appointment
3. Tool validates and updates database
4. Confirmation sent back to customer

### Key Features
- Natural language time input ("Friday at 3pm")
- Timezone awareness (converts to company timezone)
- Multi-language support (English + Georgian)
- Error recovery (suggests alternatives on conflict)
- Comprehensive validation (staff, resources, hours)
- Conversational UX (asks clarifying questions)

---

## Common Questions

### Q: Where is the reschedule_appointment tool implemented?
A: `/packages/meta-bot/lib/toolHandlers.js`, lines 999-1176
See: RESCHEDULE_IMPLEMENTATION_SUMMARY.txt, Section 9

### Q: How does the tool know which appointment to reschedule?
A: The LLM calls `get_customer_appointments` first to list appointments, then uses the selected one's ID
See: RESCHEDULE_FUNCTIONALITY_ANALYSIS.md, Section 3

### Q: What formats are supported for time input?
A: English and Georgian phrases, ISO dates, weekday names, "today", "tomorrow", etc.
See: RESCHEDULE_QUICK_REFERENCE.md, Time Parsing Examples

### Q: What happens if the requested time is unavailable?
A: Tool returns BOOKING_CONFLICT error, LLM calls get_available_times and suggests alternatives
See: RESCHEDULE_QUICK_REFERENCE.md, Scenario 2

### Q: How are timezones handled?
A: Input parsed in company timezone, stored as UTC, output formatted in company timezone
See: RESCHEDULE_IMPLEMENTATION_SUMMARY.txt, Section 5

### Q: Can a customer reschedule someone else's appointment?
A: No, customer ownership is verified (chat_id must match appointment's customer)
See: RESCHEDULE_IMPLEMENTATION_SUMMARY.txt, Section 12

### Q: What validations are performed?
A: Staff qualification, time availability, working hours, break windows, buffer time, resources
See: RESCHEDULE_IMPLEMENTATION_SUMMARY.txt, Section 6

### Q: How do I test the reschedule functionality?
A: Use the 10-scenario testing checklist
See: RESCHEDULE_QUICK_REFERENCE.md, Testing Checklist

---

## Architecture Diagram

```
Facebook/Instagram
        ↓
   Webhook Handler
   (facebook.controller.js)
        ↓
  LangGraph Graph
        ↓
   Human Detector Node
   (Check for escalation)
        ↓
    Agent Node (LLM)
   (Decides: get_appointments 
    or reschedule_appointment)
        ↓
   Tool Executor Node
   (Executes tools in parallel)
        ↓
  reschedule_appointment
   Tool Handler
   (Validates, calls backend)
        ↓
BookingService.updateAppointment()
   (Validation, persistence)
        ↓
   Response to Customer
   (via Messenger API)
```

---

## Related Files in the Codebase

### Meta-Bot Package
```
packages/meta-bot/
├── langgraph/
│   ├── graph.js
│   ├── controller.js
│   ├── state/schema.js
│   └── nodes/
│       ├── agent.js
│       ├── toolExecutor.js
│       └── humanDetector.js
├── lib/
│   ├── toolHandlers.js         ← reschedule_appointment
│   └── bookingContext.js
├── utils/
│   └── openaiTools.js          ← Tool schema
├── controllers/
│   ├── facebook.controller.js
│   └── instagram.controller.js
└── services/
    └── contact.service.js
```

### Backend Package
```
packages/backend/src/
├── services/
│   └── bookingService.js       ← updateAppointment()
├── models/
│   ├── Appointment.js
│   ├── User.js
│   └── ResourceReservation.js
└── utils/
    └── dates.js
```

---

## Change Log

### November 3, 2025
- Created comprehensive reschedule documentation package
- 3 documents covering different use cases and depth levels
- 64 KB of detailed implementation guide
- Covers architecture, flow, validation, testing, and troubleshooting

---

## Contact & Support

For questions about the reschedule functionality:
1. Check the relevant documentation section first
2. Review the example scenarios and error codes
3. Reference the key files in the codebase
4. Check the troubleshooting section for common issues

---

## Summary

This documentation package provides everything needed to understand, implement, test, and troubleshoot the appointment rescheduling feature in PetBuddy. The three documents offer different levels of detail for different audiences and use cases.

Start with the **Implementation Summary** for an overview, dive into **Quick Reference** for quick lookups, and use **Functionality Analysis** for deep understanding.

All code locations, error codes, test scenarios, and integration points are documented with examples and explanations.
