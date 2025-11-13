// Schedule Feature - Public API
// Only export what should be used outside this feature

// Main page component
export { SchedulePage } from "./components";

// Optional: Export specific components if needed elsewhere
export { DayView, MiniCalendar, Toolbar } from "./components";

// Optional: Export hooks if needed elsewhere
export { useScheduleView } from "./hooks";

// Optional: Export constants if needed elsewhere
export * from "./constants";

// API is typically not exported (used internally via RTK Query)
