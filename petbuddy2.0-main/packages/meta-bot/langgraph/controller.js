import { invokeConversation } from "./graph.js";
import { getContactByChatId } from "../services/contact.service.js";
import logger from "../utils/logger.js";

/**
 * LangGraph Controller
 *
 * This is the main entry point for using LangGraph in the meta-bot.
 * It handles:
 * 1. Loading contact info from database
 * 2. Building conversation state
 * 3. Invoking the graph
 * 4. Returning the response
 */

/**
 * Process a message using LangGraph
 *
 * @param {Object} params
 * @param {string} params.chatId - User's chat ID
 * @param {string} params.platform - Platform (facebook, instagram)
 * @param {string} params.message - User's message
 * @param {string} params.companyId - Company ID
 * @param {string} params.systemInstructions - AI system prompt
 * @param {string} params.timezone - Company timezone
 * @param {string} params.aiProvider - AI provider (optional: "openai" or "gemini")
 * @param {string} params.openaiApiKey - Company-specific OpenAI API key (optional)
 * @param {string} params.geminiApiKey - Company-specific Gemini API key (optional)
 * @param {Object} params.escalationConfig - Company-specific escalation configuration (optional)
 * @param {Array} params.workingHours - Company working hours (optional)
 * @param {Array} params.conversationHistory - Previous messages (optional)
 *
 * @returns {Object} { assistantMessage, state }
 */
export async function processMessageWithLangGraph({
  chatId,
  platform,
  message,
  companyId,
  systemInstructions,
  timezone = "UTC",
  aiProvider = null,
  openaiApiKey = null,
  geminiApiKey = null,
  escalationConfig = null,
  workingHours = [],
  conversationHistory = [],
}) {
  try {
    logger.messageFlow.info(
      platform,
      chatId,
      "langgraph-process",
      "Processing message with LangGraph"
    );

    // Load contact info from database
    let fullName = null;
    let phoneNumber = null;
    let contactId = null;

    if (companyId) {
      try {
        const contact = await getContactByChatId(chatId, companyId, platform);
        if (contact) {
          fullName = contact.fullName;
          phoneNumber = contact.phone;
          contactId = contact._id;

          logger.messageFlow.info(
            platform,
            chatId,
            "contact-loaded",
            "Contact info loaded from database",
            {
              hasName: !!fullName,
              hasPhone: !!phoneNumber,
            }
          );
        }
      } catch (error) {
        logger.messageFlow.warn(
          platform,
          chatId,
          "contact-load-error",
          "Failed to load contact info",
          { error: error.message }
        );
      }
    }

    // Build conversation state
    const input = {
      chatId,
      platform,
      companyId,
      fullName,
      phoneNumber,
      contactId,
      systemInstructions,
      timezone,
      workingHours,
      aiProvider,
      openaiApiKey,
      geminiApiKey,
      escalationConfig,
      messages: [
        ...conversationHistory,
        {
          role: "user",
          content: message,
        },
      ],
      currentStep: "agent",
    };

    // Invoke the graph
    const result = await invokeConversation(input);

    logger.messageFlow.info(
      platform,
      chatId,
      "langgraph-complete",
      "LangGraph processing complete",
      {
        hasResponse: !!result.assistantMessage,
        hasError: !!result.error,
      }
    );

    return {
      assistantMessage: result.assistantMessage,
      state: result,
    };
  } catch (error) {
    logger.messageFlow.error(
      platform,
      chatId,
      "langgraph-process-error",
      error
    );

    return {
      assistantMessage:
        "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.",
      state: {
        error: {
          message: error.message,
          type: "controller_error",
        },
      },
    };
  }
}
