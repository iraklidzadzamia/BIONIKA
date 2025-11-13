# Frontend Features Architecture

## 📁 Standard Feature Structure

All features in `frontend/features/` **MUST** follow this exact structure for consistency and maintainability.

---

## Directory Structure

```
frontend/features/[feature-name]/
├── api/
│   ├── [feature]Api.js         # RTK Query endpoints
│   └── index.js                # Barrel exports
├── components/
│   ├── [Feature]Page.jsx       # Main page component
│   ├── [subdirectory]/         # Organized by responsibility
│   │   ├── Component1.jsx
│   │   ├── Component2.jsx
│   │   └── index.js
│   └── index.js                # Barrel exports
├── constants/
│   ├── [feature]Config.js      # Configuration constants
│   ├── [feature]Styles.js      # Design system (colors, animations)
│   └── index.js                # Barrel exports
├── hooks/
│   ├── use[Feature]Hook.js     # Custom React hooks
│   └── index.js                # Barrel exports
├── utils/
│   ├── [feature]Helpers.js     # Utility functions
│   └── index.js                # Barrel exports
└── index.js                    # Public API (feature exports)
```

---

## 📂 Folder Responsibilities

### 1. `api/` - Data Layer

**Purpose:** RTK Query endpoints for backend communication

**Rules:**

- ✅ Use `baseApi.injectEndpoints()` pattern
- ✅ Export hooks for components to use
- ✅ Define cache tags for invalidation
- ❌ No business logic here

**Example:**

```javascript
// api/scheduleApi.js
import { baseApi } from "@/core/api/baseApi";

export const scheduleApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getAppointments: build.query({
      query: (params) => ({ url: "/appointments", params }),
      providesTags: ["Appointments"],
    }),
  }),
});

export const { useGetAppointmentsQuery } = scheduleApi;
```

---

### 2. `components/` - UI Layer

**Purpose:** React components organized by responsibility

**Structure:**

```
components/
├── [Feature]Page.jsx       # Main page (orchestrator)
├── views/                  # Different view modes
│   ├── DayView.jsx
│   └── WeekView.jsx
├── [domain]/               # Domain-specific components
│   ├── ItemCard.jsx
│   └── ItemList.jsx
├── modals/                 # Modal dialogs
│   └── CreateModal.jsx
└── index.js
```

**Rules:**

- ✅ Group by responsibility (views, modals, forms, etc.)
- ✅ Extract large components into separate files
- ✅ Use barrel exports (index.js)
- ❌ Avoid deeply nested folders (max 2 levels)

---

### 3. `constants/` - Configuration Layer

**Purpose:** Centralized configuration and design system

**Files:**

- `[feature]Config.js` - Business constants, enums, options
- `[feature]Styles.js` - Colors, gradients, animations, layout

**Example:**

```javascript
// constants/messageConfig.js
export const PLATFORMS = {
  INSTAGRAM: "instagram",
  FACEBOOK: "facebook",
};

export const FILTER_OPTIONS = [
  { value: "all", label: "All Conversations" },
  { value: "customer", label: "Customers Only" },
];
```

```javascript
// constants/messageStyles.js
export const PLATFORM_COLORS = {
  instagram: {
    gradient: "from-pink-500 to-purple-600",
    icon: "text-pink-600",
  },
};

export const ANIMATIONS = {
  slideIn: "animate-slideIn",
  fadeIn: "animate-fadeIn",
};
```

---

### 4. `hooks/` - Business Logic Layer

**Purpose:** Custom React hooks for stateful logic

**Rules:**

- ✅ Extract complex state management
- ✅ Reusable logic across components
- ✅ Name with `use` prefix
- ❌ No UI/JSX in hooks

**Example:**

```javascript
// hooks/useMessages.js
export function useMessages({ selectedContact, platform }) {
  const [messages, setMessages] = useState([]);
  const [fetchMessages, { isLoading }] = useGetMessagesMutation();

  const loadMessages = async () => {
    const result = await fetchMessages(...).unwrap();
    setMessages(result.messages);
  };

  return { messages, loadMessages, isLoading };
}
```

---

### 5. `utils/` - Utility Layer

**Purpose:** Pure helper functions

**Rules:**

- ✅ Pure functions (no side effects)
- ✅ Single responsibility
- ✅ Well-tested
- ❌ No React dependencies
- ❌ No state management

**Example:**

```javascript
// utils/messageHelpers.js
export const formatTimeAgo = (date) => {
  const diffMins = Math.floor((Date.now() - date) / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m`;
  return `${Math.floor(diffMins / 60)}h`;
};

export const filterByQuery = (items, query) => {
  return items.filter((item) =>
    item.name.toLowerCase().includes(query.toLowerCase())
  );
};
```

---

## 📄 Main Page Component Pattern

The main page component should be a **thin orchestrator** that:

- Manages top-level state
- Coordinates sub-components
- Handles event delegation
- Delegates rendering to view components

**Example Structure:**

```javascript
// components/SchedulePage.jsx
export function SchedulePage() {
  // 1. Get data from Redux/context
  const companyId = useSelector((state) => state.auth.company?._id);

  // 2. Local UI state
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState("day");

  // 3. Custom hooks for business logic
  const { appointments, isLoading } = useAppointments({
    companyId,
    date: selectedDate,
  });

  // 4. Event handlers
  const handleDateChange = (date) => setSelectedDate(date);

  // 5. Render view components
  return (
    <div>
      <Toolbar
        date={selectedDate}
        view={view}
        onDateChange={handleDateChange}
        onViewChange={setView}
      />

      {view === "day" ? (
        <DayView appointments={appointments} />
      ) : (
        <WeekView appointments={appointments} />
      )}
    </div>
  );
}
```

---

## 🔄 Feature Public API (index.js)

The root `index.js` defines what's exported from the feature.

**Template:**

```javascript
// features/[feature]/index.js

// Main page component (required)
export { FeaturePage } from "./components";

// Optional: Export components if needed elsewhere
export { SpecificComponent1, SpecificComponent2 } from "./components";

// Optional: Export hooks if needed elsewhere
export { useFeatureHook } from "./hooks";

// Optional: Export constants if needed elsewhere
export * from "./constants";

// Optional: Export utilities if needed elsewhere
export * from "./utils";

// API is typically NOT exported (internal only)
// But can be if needed for advanced use cases
```

---

## 🎯 Real-World Examples

### ✅ Good Example: Schedule Feature

```
features/schedule/
├── api/
│   ├── appointmentsApi.js      # All appointment endpoints
│   └── index.js
├── components/
│   ├── SchedulePage.jsx        # Main orchestrator (thin)
│   ├── calendar/               # Calendar-specific components
│   │   ├── CalendarGrid.jsx
│   │   ├── Toolbar.jsx
│   │   └── index.js
│   ├── views/                  # Different view modes
│   │   ├── DayView.jsx
│   │   └── WeekView.jsx
│   └── index.js
├── constants/
│   ├── gridConfig.js           # Grid calculations, time slots
│   ├── scheduleStyles.js       # Colors, gradients, animations
│   └── index.js
├── hooks/
│   ├── useScheduleView.js      # View state management
│   └── index.js
├── utils/
│   ├── dateHelpers.js          # Date formatting, calculations
│   ├── appointmentHelpers.js   # Appointment utilities
│   └── index.js
└── index.js
```

### ✅ Good Example: Messages Feature

```
features/messages/
├── api/
│   ├── messagesApi.js          # Message endpoints
│   └── index.js
├── components/
│   ├── MessagesPage.jsx        # Main orchestrator
│   ├── conversations/          # Conversation list components
│   │   ├── Sidebar.jsx
│   │   ├── ConversationItem.jsx
│   │   └── index.js
│   ├── chat/                   # Chat area components
│   │   ├── ChatView.jsx
│   │   ├── MessageBubble.jsx
│   │   └── index.js
│   ├── modals/
│   │   ├── [moved] AIAgentControlModal handled via shared ModalRoot (id: AI_AGENT_CONTROL)
│   │   └── index.js
│   └── index.js
├── constants/
│   ├── messageConfig.js        # Platforms, types, filters
│   ├── messageStyles.js        # Colors, badges, animations
│   └── index.js
├── hooks/
│   ├── useConversations.js     # Conversation state
│   ├── useMessages.js          # Message state
│   └── index.js
├── utils/
│   ├── messageHelpers.js       # Formatting, filtering
│   └── index.js
└── index.js
```

---

## 🚫 Anti-Patterns to Avoid

### ❌ Don't: Flat Component Structure

```
components/
├── Component1.jsx
├── Component2.jsx
├── Component3.jsx
├── Component4.jsx
├── Component5.jsx
└── ... (30 more files)
```

### ✅ Do: Organized by Responsibility

```
components/
├── FeaturePage.jsx
├── views/
├── forms/
├── modals/
└── shared/
```

---

### ❌ Don't: Mix Concerns

```javascript
// components/FeaturePage.jsx
export function FeaturePage() {
  // ❌ API call directly in component
  const response = await fetch("/api/data");

  // ❌ Complex formatting logic
  const formatted = data.map(item => ({
    ...item,
    displayDate: new Date(item.date).toLocaleDateString(),
    // ... 20 more lines
  }));

  // ❌ Style constants inline
  const colors = { primary: "#4F46E5", ... };
}
```

### ✅ Do: Separate Concerns

```javascript
// components/FeaturePage.jsx
import { useFeatureData } from "../hooks";
import { formatForDisplay } from "../utils";
import { COLORS } from "../constants";

export function FeaturePage() {
  const { data, isLoading } = useFeatureData(); // Hook handles API
  const formatted = formatForDisplay(data); // Util handles formatting
  const colors = COLORS; // Constant from config
}
```

---

## 📝 Checklist for New Features

When creating a new feature, ensure:

- [ ] Created `api/` folder with RTK Query endpoints
- [ ] Created `components/` with organized subdirectories
- [ ] Created `constants/` with config and styles
- [ ] Created `hooks/` for stateful logic
- [ ] Created `utils/` for pure functions
- [ ] Each folder has `index.js` barrel exports
- [ ] Main page component is thin (< 300 lines)
- [ ] Complex logic extracted to hooks
- [ ] Utility functions are pure and tested
- [ ] Constants used instead of magic values
- [ ] Root `index.js` exports public API

---

## 🔄 Migration Guide

### Converting Old Feature to New Structure

1. **Create new folder structure**

   ```bash
   mkdir -p api components constants hooks utils
   touch api/index.js components/index.js constants/index.js hooks/index.js utils/index.js
   ```

2. **Move API endpoints**

   - Extract RTK Query endpoints to `api/[feature]Api.js`
   - Update imports in components

3. **Organize components**

   - Keep main page as `[Feature]Page.jsx`
   - Group related components into subdirectories
   - Create barrel exports

4. **Extract constants**

   - Move magic values to `constants/[feature]Config.js`
   - Move styles to `constants/[feature]Styles.js`

5. **Extract hooks**

   - Move complex state logic to `hooks/use[Feature].js`
   - Keep hooks focused on single responsibility

6. **Extract utilities**

   - Move pure functions to `utils/[feature]Helpers.js`
   - Remove React dependencies

7. **Update imports**

   - Use relative imports within feature (`../api`, `../hooks`)
   - Update external imports

8. **Test thoroughly**
   - Run linter
   - Test all features
   - Verify no broken imports

---

## 🎓 Additional Resources

- See `features/schedule/` for reference implementation
- See `features/messages/` for reference implementation
- Follow React best practices: https://react.dev/
- RTK Query docs: https://redux-toolkit.js.org/rtk-query/overview

---

## 🤝 Contributing

When adding new features or modifying existing ones:

1. Follow this structure exactly
2. Create/update documentation
3. Review with team before merging
4. Keep features self-contained and independent

---

**Last Updated:** 2025-10-10
**Version:** 1.0
