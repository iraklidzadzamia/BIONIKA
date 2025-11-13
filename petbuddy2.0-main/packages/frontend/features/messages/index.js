// Messages Feature - Public API
// Only export what should be used outside this feature

// Main page component
export { MessagesPage } from "./components";

// Optional: Export specific components if needed elsewhere
export {
  ConversationItem,
  MessageBubble,
  CustomerInfoPanel,
} from "./components";

// Optional: Export hooks if needed elsewhere
export { useConversations, useMessages } from "./hooks";

// Optional: Export constants if needed elsewhere
export * from "./constants";

// Optional: Export utilities if needed elsewhere
export * from "./utils";

// API is typically not exported (used internally via RTK Query)
// But can be exported if needed elsewhere
export { messagesApi } from "./api";
