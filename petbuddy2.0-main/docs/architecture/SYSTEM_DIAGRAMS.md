# PetBuddy Meta-Bot: System Architecture Diagrams

## 1. High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        EXTERNAL SYSTEMS                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐         ┌──────────────────┐              │
│  │   Facebook API   │         │  Instagram API   │              │
│  │  - Webhooks      │         │  - Webhooks      │              │
│  │  - Message Send  │         │  - Message Send  │              │
│  └────────┬─────────┘         └────────┬─────────┘              │
│           │                            │                         │
└───────────┼────────────────────────────┼──────────────────────────┘
            │                            │
            ▼                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    META-BOT SERVICE                              │
│                  (Express.js Server)                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │         Controllers (facebook.js, instagram.js)         │    │
│  │ - Webhook verification                                  │    │
│  │ - Message extraction                                    │    │
│  │ - Response delivery                                     │    │
│  └────────────────────┬────────────────────────────────────┘    │
│                       │                                          │
│                       ▼                                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │       LangGraph Controller (orchestration)              │    │
│  │ - Load contact from DB                                  │    │
│  │ - Build conversation state                              │    │
│  │ - Invoke LangGraph                                      │    │
│  └────────────────────┬────────────────────────────────────┘    │
│                       │                                          │
│           ┌───────────┴───────────┐                             │
│           ▼                       ▼                             │
│  ┌──────────────────┐   ┌──────────────────┐                  │
│  │ LangGraph Graph  │   │ OpenAI ChatGPT   │                  │
│  │ - Agent Node     │──▶│ - Reasoning      │                  │
│  │ - Tool Executor  │   │ - Tool Calling   │                  │
│  │ - State Mgmt     │   └──────────────────┘                  │
│  └──────┬───────────┘                                         │
│         │                                                     │
│         ├─ get_current_datetime ──────┐                      │
│         ├─ get_customer_info ───────┐ │                      │
│         ├─ book_appointment ───────┐ │ │                      │
│         ├─ get_available_times ──┐ │ │ │                      │
│         ├─ get_customer_fullname─┤ │ │ │                      │
│         └─ get_customer_phone ──┘ │ │ │ │                     │
│                                   │ │ │ │                     │
│           ┌───────────────────────┘ │ │ │                     │
│           ▼                         │ │ │                     │
│  ┌──────────────────┐              │ │ │                     │
│  │ Tool Handlers    │◀─────────────┘ │ │                     │
│  │ - Implementation │◀───────────────┘ │                     │
│  │ - Context Data   │◀─────────────────┘                     │
│  └────────┬─────────┘                                        │
│           │                                                  │
│           ├─────────────┬─────────────┐                      │
│           ▼             ▼             ▼                      │
│  ┌──────────────┐  ┌──────────┐  ┌──────────┐               │
│  │   MongoDB    │  │ Backend  │  │  Booking │               │
│  │  - Messages  │  │ Services │  │ Service  │               │
│  │  - Contacts  │  │          │  │          │               │
│  │  - Companies │  └──────────┘  └──────────┘               │
│  └──────────────┘                                            │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │              Logging System (Winston)                   │  │
│  │ - logs/error.log        (errors only)                   │  │
│  │ - logs/combined.log     (all logs)                       │  │
│  │ - logs/message-flow.log (message events)                 │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────��───────────────────────────────┘
```

## 2. LangGraph Execution Flow

```
                          GRAPH INVOCATION
                                │
                                ▼
                    ┌────────────────────────┐
                    │   Initial State        │
                    │ - chatId               │
                    │ - messages (+ new msg) │
                    │ - systemInstructions   │
                    │ - fullName/phone (DB)  │
                    │ - currentStep: 'agent' │
                    └────────────┬───────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │    AGENT NODE          │
                    ├────────────────────────┤
                    │ 1. Create ChatOpenAI   │
                    │ 2. Create Tools        │
                    │ 3. Bind tools to model │
                    │ 4. Send to OpenAI      │
                    │ 5. Parse response      │
                    └────────┬───────────────┘
                             │
                    ┌────────┴────────┐
                    ▼                 ▼
          [Tool calls?]        [No tools]
             │                    │
             │                    ▼
             │            ┌───────────────────┐
             │            │ Return            │
             │            │ assistantMessage  │
             │            │ currentStep='end' │
             │            └─────────┬─────────┘
             │                      │
             ▼                      │
    ┌────────────────────┐          │
    │ Tool Executor Node │          │
    ├────────────────────┤          │
    │ 1. For each tool   │          │
    │    - Find handler  │          │
    │    - Invoke it     │          │
    │    - Format result │          │
    │ 2. Return messages │          │
    │ 3. currentStep='ag'│          │
    └────────┬───────────┘          │
             │                      │
             └──────────┬───────────┘
                        │
                        ▼
                  ┌──────────────┐
                  │ Output State │
                  │ - messages   │
                  │ - assistant  │
                  │   Message    │
                  │ - error (if) │
                  └──────────────┘
                        │
                        ▼
                    GRAPH COMPLETE
```

## 3. Tool Execution Detail

```
                    Agent Decides Tool Needed
                              │
                              ▼
                    ┌─────────────────────┐
                    │  OpenAI Response    │
                    │ {                   │
                    │   tool_calls: [     │
                    │     {               │
                    │       id: "abc123"  │
                    │       name: "book"  │
                    │       args: {...}   │
                    │     }               │
                    │   ]                 │
                    │ }                   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────────────────┐
                    │  Agent Node Formats for Executor│
                    │ {                               │
                    │   messages: [{                  │
                    │     role: 'assistant',          │
                    │     tool_calls: [...]           │
                    │   }],                           │
                    │   toolCalls: [...],             │
                    │   currentStep: 'execute_tools'  │
                    │ }                               │
                    └──────────┬──────────────────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
             ┌──────┴───────┐  ┌─────────┴──────┐
             │              │  │                │
             ▼              ▼  ▼                │
        Tool 1        Tool 2        Tool N     │
   [get_available]  [get_name]   [...]         │
      │                │           │           │
      ├─ invoke ───────┼───────────┼──┐        │
      │                │           │  │        │
      ▼                ▼           ▼  ▼        │
   Handler 1    Handler 2      Handler N      │
   ├─ Query DB ─┼─ Lookup ───┬─ Complex ──┤   │
   ├─ Calc      │   contact  │   logic    │   │
   └─ Return    │            └────────────┘   │
                │                              │
      ┌─────────┴────────┬────────────────────┘
      │                  │
      ▼                  ▼
   JSON Result    Tool Message Format
   "9-12, 3-5"   {
                   role: 'tool',
                   tool_call_id: 'abc123',
                   name: 'get_available_times',
                   content: '9-12, 3-5'
                 }
```

## 4. Message State Throughout Execution

```
┌─────────────────────────────────────────────────────────────┐
│ INITIAL STATE (Controller builds)                           │
├─────────────────────────────────────────────────────────────┤
│ messages = [                                                │
│   { role: 'user', content: 'Book tomorrow' }                │
│ ]                                                           │
│ currentStep = 'agent'                                       │
│ fullName = 'John' (from DB)                                │
│ assistantMessage = null                                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ AFTER AGENT NODE (First iteration)                          │
├─────────────────────────────────────���───────────────────────┤
│ messages = [                                                │
│   { role: 'user', content: 'Book tomorrow' },              │
│   {                                                         │
│     role: 'assistant',                                     │
│     content: '',                                           │
│     tool_calls: [{                                         │
│       id: 'call_xyz',                                      │
│       name: 'get_available_times',                         │
│       args: { ... }                                        │
│     }]                                                      │
│   }                                                         │
│ ]                                                           │
│ currentStep = 'execute_tools'                              │
│ assistantMessage = null (not ready yet)                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ AFTER TOOL EXECUTOR NODE                                    │
├─────────────────────────────────────────────────────────────┤
│ messages = [                                                │
│   { role: 'user', content: 'Book tomorrow' },              │
│   { role: 'assistant', tool_calls: [...] },                │
│   {                                                         │
│     role: 'tool',                                          │
│     tool_call_id: 'call_xyz',                              │
│     name: 'get_available_times',                           │
│     content: '9:00-12:00, 15:00-17:00'                     │
│   }                                                         │
│ ]                                                           │
│ currentStep = 'agent' (loop back)                          │
│ assistantMessage = null (still building)                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ AFTER AGENT NODE (Second iteration - final)                │
├─────────────────────────────────────────────────────────────┤
│ messages = [                                                │
│   { role: 'user', content: 'Book tomorrow' },              │
│   { role: 'assistant', tool_calls: [...] },                │
│   { role: 'tool', content: '9:00-12:00, ...' },            │
│   {                                                         │
│     role: 'assistant',                                     │
│     content: 'Great! We have slots at 9am and 3pm...'      │
│   }                                                         │
│ ]                                                           │
│ currentStep = 'end' (exit graph)                           │
│ assistantMessage = 'Great! We have slots...'               │
└──────────────────────────────────────────────────────────────┘
```

## 5. Controller Decision Tree

```
                   Webhook Received
                          │
                          ▼
                  ┌────────────────────┐
                  │ Verify Signature   │
                  │ Extract Message    │
                  └────────┬───────────┘
                           │
                           ▼
                  ┌────────────────────┐
                  │ Check Feature Flag │
                  │ USE_LANGGRAPH?     │
                  └────┬───────────┬───┘
                       │           │
                    YES│           │NO
                       │           │
                       ▼           ▼
            ┌──────────────────┐ ┌──────────────────┐
            │  Use LangGraph   │ │  Use Legacy LLM  │
            │  (NEW)           │ │  (Fallback)      │
            ├──────────────────┤ ├──────────────────┤
            │ • processMessage │ │ • createChatWith │
            │   WithLangGraph()│ │   Tools()        │
            │ • Auto tool loop │ │ • Manual tool    │
            │ • Advanced state │ │   handling       │
            └────────┬─────────┘ └────────┬─────────┘
                     │                    │
                     │    ┌───────────────┘
                     │    │
                     ▼    ▼
            ┌──────────────────────┐
            │  Get Response        │
            │ assistantMessage     │
            └──────────┬───────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │ Save to Database     │
            └──────────┬───────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │ Send via Facebook/   │
            │ Instagram API        │
            └──────────────────────┘
```

## 6. State Reducer Behavior

```
┌─────────────────────────────────────────────────────────┐
│            DIFFERENT REDUCER STRATEGIES                 │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  APPEND (messages, toolCalls)                           │
│  ─────────────────────────────────────────────         │
│  Previous: [A, B]                                      │
│  New: [C, D]                                           │
│  Result: [A, B, C, D]  ← Keeps history                │
│                                                         │
│  MERGE (bookingContext)                                │
│  ──────────────────────                                │
│  Previous: { date: '2024-10', time: '2pm' }          │
│  New: { pet: 'Fluffy' }                               │
│  Result: { date: '...', time: '2pm', pet: '...' }     │
│                                                         │
│  REPLACE (assistantMessage, currentStep)               │
│  ───────────────────────────────────────              │
│  Previous: 'Old message'                              │
│  New: 'New message'                                   │
│  Result: 'New message'  ← Discards previous            │
│                                                         │
│  NULL COALESCE (error)                                 │
│  ──────────────────────                                │
│  Previous: null                                        │
│  New: { type: 'error' }                               │
│  Result: { type: 'error' }                            │
│                                                         │
│  Previous: { type: 'error' }                           │
│  New: null                                             │
│  Result: { type: 'error' } ← Keeps previous on null   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 7. Tool Parameter Flow

```
┌────────────────────────────────────┐
│ User Message from AI               │
│ "Book grooming tomorrow at 2pm"    │
└────────────────┬───────────────────┘
                 │
                 ▼
      ┌──────────────────────────────┐
      │ OpenAI Decision              │
      │ "I need to book_appointment" │
      └────────┬─────────────────────┘
               │
               ▼
      ┌──────────────────────────────┐
      │ OpenAI Generates Parameters  │
      │ {                            │
      │   appointment_time:          │
      │     "tomorrow at 14:00",      │
      │   service_name: "Full Groom",│
      │   pet_size: null,            │
      │   notes: null                │
      │ }                            │
      └────────┬─────────────────────┘
               │
               ▼
      ┌──────────────────────────────┐
      │ Zod Schema Validation        │
      │ - appointment_time: required │
      │ - service_name: required     │
      │ - pet_size: optional         │
      │ - notes: optional            │
      └────────┬─────────────────────┘
               │
               ▼
      ┌──────────────────────────────┐
      │ Tool Handler Receives        │
      │ params = {                   │
      │   appointment_time,          │
      │   service_name,              │
      │   pet_size,                  │
      │   notes                      │
      │ }                            │
      │ context = {                  │
      │   chat_id,                   │
      │   company_id,                │
      │   timezone                   │
      │ }                            │
      └────────┬─────────────────────┘
               │
      ┌────────┴────────┐
      ▼                 ▼
   Book          Update Contact
   Appointment   (if needed)
   in DB
```

## 8. Error Handling Flow

```
                    LangGraph Execution
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
         Agent Error            Tool Error
              │                       │
              ├─ OpenAI timeout      ├─ Database unavailable
              ├─ Invalid API key     ├─ Handler crash
              ├─ Rate limit (429)    ├─ Invalid parameters
              └─ Server error (500)  └─ Logic failure
              │                       │
              ▼                       ▼
        ┌──────────────────┐  ┌──────────────────┐
        │ Agent Node Error │  │ Tool Node Error  │
        │ Handling         │  │ Handling         │
        ├──────────────────┤  ├──────────────────┤
        │ 1. Log error     │  │ 1. Try/catch     │
        │ 2. Set          │  │ 2. Format error  │
        │    fallback msg  │  │    in message    │
        │ 3. Set step end  │  │ 3. Return to     │
        │ 4. Exit graph    │  │    agent w/ err  │
        └────────┬─────────┘  └────────┬─────────┘
                 │                     │
                 └──────────┬──────────┘
                            │
                            ▼
                  ┌──────────────────────┐
                  │ User Receives        │
                  │ Fallback Message     │
                  │ "Sorry, please try"  │
                  │ "again later"        │
                  └──────────────────────┘
                            │
                            ▼
                  ┌──────────────────────┐
                  │ Error Logged         │
                  │ For Debugging        │
                  └──────────────────────┘
```

## 9. Conversation State Lifecycle

```
┌─────────────────────────────────────────────────────────┐
│ CONVERSATION LIFECYCLE (Single User Across Messages)    │
├─────────────────────────────────────────────────────────┤

Message 1: "Hello"
      │
      ├─ Load state from DB (new user)
      ├─ No fullName, no phoneNumber
      ├─ Get agent response
      └─ Save message to DB
      
      
Message 2: "My name is John"
      │
      ├─ Load state from DB
      │  - fullName: null (updated by Message 1 tool)
      │  - previousMessages: [...]
      ├─ Agent recognizes name
      ├─ Calls get_customer_full_name tool
      ├─ Tool updates contact in DB
      └─ Save message to DB
      
      
Message 3: "Book me an appointment"
      │
      ├─ Load state from DB
      │  - fullName: 'John' (saved from Message 2)
      │  - phoneNumber: null
      │  - previousMessages: [...]
      ├─ Agent injects in system prompt:
      │  "Customer Name: John (ALREADY SAVED)"
      ├─ Agent asks for phone without asking name again
      ├─ Tool updates phone
      └─ Save message to DB
      
      
Message 4: "My phone is 555-1234"
      │
      ├─ Load state from DB
      │  - fullName: 'John'
      │  - phoneNumber: '555-1234' (saved from Message 3)
      │  - previousMessages: [...]
      ├─ Agent has all info needed
      ├─ Agent calls book_appointment
      ├─ Booking created successfully
      └─ Save message to DB

└─────────────────────────────────────────────────────────┘
```

## 10. Feature Flag Toggle Impact

```
┌──────────────────────────────────────────────────┐
│        Config: USE_LANGGRAPH=true                │
├──────────────────────────────────────────────────┤
│                                                  │
│ Webhook arrives                                  │
│       │                                          │
│       ├─ Verify signature                       │
│       ├─ Check feature flag: USE_LANGGRAPH      │
│       │  ├─ TRUE ──────────────────┐            │
│       │  │                          │            │
│       │  ▼                          ▼            │
│  ┌─────────────────────┐  ┌──────────────────┐ │
│  │ LangGraph Path      │  │ Legacy Path      │ │
│  ├─────────────────────┤  ├──────────────────┤ │
│  │ New                 │  │ createChatWith   │ │
│  │ • Auto tool loop    │  │ Tools()          │ │
│  │ • State mgmt        │  │ • Manual loop    │ │
│  │ • Better errors     │  │ • No state       │ │
│  │                     │  │ • Legacy OpenAI  │ │
│  └──────────┬──────────┘  └────────┬─────────┘ │
│             │                      │            │
│  ┌──────────┴──────────────────────┘            │
│  │                                              │
│  ▼                                              │
│ Response sent to user                          │
│                                                  │
│ NOTE:                                           │
│ - USE_LANGGRAPH=true  ──> LangGraph (ACTIVE)  │
│ - USE_LANGGRAPH=false ──> Legacy (FALLBACK)   │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

These diagrams provide visual representation of:
1. Overall system architecture
2. LangGraph execution loop
3. Tool invocation details
4. Message state evolution
5. Controller logic paths
6. Reducer behavior
7. Parameter flow
8. Error handling
9. User session lifecycle
10. Feature flag impacts

Use these alongside the code for better understanding of the system flow.
