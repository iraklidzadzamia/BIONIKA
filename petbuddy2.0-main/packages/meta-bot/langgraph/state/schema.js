import { Annotation } from "@langchain/langgraph";

/**
 * State schema for the PetBuddy conversation graph
 *
 * This defines all the data that flows through the graph nodes:
 * - User information (chat_id, platform, contact info)
 * - Conversation context (messages, system instructions)
 * - Booking context (pet info, appointment details)
 * - AI response tracking
 */
export const ConversationState = Annotation.Root({
  // ========== User Identity ==========
  /** Platform-specific user ID (e.g., Facebook sender ID) */
  chatId: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),

  /** Platform: 'facebook', 'instagram', etc. */
  platform: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => "unknown",
  }),

  /** Company ID for multi-tenant support */
  companyId: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),

  // ========== Contact Information ==========
  /** Customer's full name (if known) */
  fullName: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),

  /** Customer's phone number (if known) */
  phoneNumber: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),

  /** Contact document ID from database */
  contactId: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),

  // ========== Conversation Context ==========
  /**
   * Message history in OpenAI format
   * [{ role: 'user'|'assistant'|'system', content: '...' }, ...]
   */
  messages: Annotation({
    reducer: (x, y) => {
      // If y is provided, append to existing messages
      if (Array.isArray(y)) {
        return [...(x || []), ...y];
      }
      return y ?? x;
    },
    default: () => [],
  }),

  /** System instructions for the AI (company-specific) */
  systemInstructions: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),

  /** Company timezone (e.g., 'America/New_York') */
  timezone: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => "UTC",
  }),

  /** Company working hours for availability checking */
  workingHours: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => [],
  }),

  // ========== Booking Context ==========
  /** Current booking details being assembled */
  bookingContext: Annotation({
    reducer: (x, y) => ({ ...(x || {}), ...(y || {}) }),
    default: () => ({}),
  }),

  /** Booking in progress state (for multi-turn booking flows with selections) */
  bookingInProgress: Annotation({
    reducer: (x, y) => ({ ...(x || {}), ...(y || {}) }),
    default: () => null,
  }),

  // ========== AI Response ==========
  /** The final assistant message to send to user */
  assistantMessage: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),

  /** Tool calls made by the AI (for current turn only - not accumulated) */
  toolCalls: Annotation({
    reducer: (x, y) => y ?? x, // Replace, don't append (each turn has its own tool calls)
    default: () => [],
  }),

  /** Last tool execution results (for validation) */
  lastToolResults: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),

  /** Error information (if any) */
  error: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),

  // ========== Flow Control ==========
  /** Current step in the conversation flow */
  currentStep: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => "analyze",
  }),

  /** Whether conversation needs human handoff */
  needsHumanHandoff: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => false,
  }),

  /** Reason for human handoff (if applicable) */
  handoffReason: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),

  /** Active AI provider for hybrid flow tracking */
  activeProvider: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => "gemini", // Always start with Gemini in hybrid mode
  }),

  // ========== Company-Specific Configuration ==========
  /** AI provider preference: "openai", "gemini", or null (use global default) */
  aiProvider: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),

  /** Company-specific OpenAI API key (overrides global) */
  openaiApiKey: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),

  /** Company-specific Gemini API key (overrides global) */
  geminiApiKey: Annotation({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),

  /** Company-specific admin/escalation chat IDs for human handoff */
  escalationConfig: Annotation({
    reducer: (x, y) => ({ ...(x || {}), ...(y || {}) }),
    default: () => null,
  }),
});
