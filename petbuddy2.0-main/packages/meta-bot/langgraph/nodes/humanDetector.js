import logger from "../../utils/logger.js";
import { config } from "../../config/env.js";
import { facebookMsgSender } from "../../middlewares/facebookMsgSender.js";
import { instagramMsgSender } from "../../middlewares/instagramMsgSender.js";

/**
 * Human Handoff Detector Node
 *
 * Analyzes conversation to detect when human operator intervention is needed.
 * Triggers include:
 * - Complex complaints or refund requests
 * - Repeated tool failures
 * - Explicit requests for human help
 * - Sensitive topics (medical, legal, etc.)
 * - Escalation keywords
 */

// Keywords that indicate need for human intervention
const ESCALATION_KEYWORDS = [
  // Complaints
  "complaint",
  "unhappy",
  "disappointed",
  "terrible",
  "awful",
  "worst",
  "sue",
  "lawyer",
  "attorney",

  // Refunds/Cancellations
  "refund",
  "cancel subscription",
  "cancel account",
  "delete account",
  "money back",

  // Explicit requests
  "speak to manager",
  "talk to human",
  "real person",
  "customer service",
  "supervisor",

  // Urgent matters
  "emergency",
  "urgent",
  "asap",
  "immediately",

  // Sensitive
  "medical emergency",
  "injured",
  "sick pet",
  "dying",
];

/**
 * Check if message contains escalation keywords
 */
function containsEscalationKeyword(text) {
  const lowerText = text.toLowerCase();
  return ESCALATION_KEYWORDS.some((keyword) => lowerText.includes(keyword));
}

/**
 * Check for repeated tool failures
 */
function hasRepeatedToolFailures(messages, threshold = 3) {
  const toolMessages = messages.filter((m) => m.role === "tool");
  const recentToolMessages = toolMessages.slice(-5); // Check last 5 tool messages

  let failureCount = 0;
  for (const msg of recentToolMessages) {
    try {
      const content =
        typeof msg.content === "string"
          ? JSON.parse(msg.content)
          : msg.content;
      if (content.error || content.type === "tool_execution_error") {
        failureCount++;
      }
    } catch (e) {
      // Not JSON, skip
    }
  }

  return failureCount >= threshold;
}

/**
 * Check if conversation is going in circles
 */
function isConversationStuck(messages, threshold = 4) {
  // Get last few user messages
  const userMessages = messages
    .filter((m) => m.role === "user")
    .slice(-threshold);

  if (userMessages.length < threshold) {
    return false;
  }

  // Check for similar content (basic similarity check)
  const messageTexts = userMessages.map((m) => m.content.toLowerCase().trim());
  const uniqueTexts = new Set(messageTexts);

  // If less than half are unique, conversation might be stuck
  return uniqueTexts.size < messageTexts.length / 2;
}

/**
 * Send notification to admin about handoff
 */
async function notifyHumanOperator({
  platform,
  chatId,
  reason,
  lastMessage,
  companyId,
  escalationConfig,
}) {
  try {
    logger.messageFlow.info(
      platform,
      chatId,
      "human-handoff",
      `Human intervention needed: ${reason}`
    );

    // Get admin chat ID from company escalation config or fallback to global config
    let adminChatId;
    let adminToken;

    if (escalationConfig) {
      // Use company-specific escalation configuration
      if (platform === "facebook") {
        adminChatId = escalationConfig.facebookAdminChatId;
        adminToken = escalationConfig.facebookAdminToken;
      } else if (platform === "instagram") {
        adminChatId = escalationConfig.instagramAdminChatId;
        adminToken = escalationConfig.instagramAdminToken;
      }

      if (adminChatId && adminToken) {
        logger.messageFlow.info(
          platform,
          chatId,
          "escalation-config",
          "Using company-specific escalation configuration"
        );
      }
    }

    // Fallback to global config if company-specific config not available
    if (!adminChatId || !adminToken) {
      if (platform === "facebook") {
        adminChatId = config.facebook.adminChatId;
        adminToken = config.facebook.adminPageAccessToken;
      } else if (platform === "instagram") {
        adminChatId = config.instagram.adminChatId;
        adminToken = config.instagram.adminAccessToken;
      }

      if (adminChatId && adminToken) {
        logger.messageFlow.info(
          platform,
          chatId,
          "escalation-config",
          "Using global escalation configuration"
        );
      }
    }

    if (!adminChatId) {
      logger.messageFlow.info(
        platform,
        chatId,
        "human-handoff",
        "No admin chat ID configured for notifications (neither company-specific nor global)"
      );
      return;
    }

    // Send notification to admin
    const notificationMessage = `🚨 Human handoff requested\n\nReason: ${reason}\nChat ID: ${chatId}\nCompany ID: ${companyId}\nLast message: "${lastMessage}"\n\nPlease check the admin panel for details.`;

    try {
      if (platform === "facebook") {
        if (adminToken) {
          await facebookMsgSender(adminChatId, notificationMessage, adminToken);
          logger.messageFlow.info(
            platform,
            adminChatId,
            "admin-notification-sent",
            "Admin notification sent successfully via Facebook"
          );
        } else {
          logger.messageFlow.warning(
            platform,
            chatId,
            "admin-notification-failed",
            "No admin Facebook token configured"
          );
        }
      } else if (platform === "instagram") {
        if (adminToken) {
          await instagramMsgSender(adminChatId, notificationMessage, adminToken);
          logger.messageFlow.info(
            platform,
            adminChatId,
            "admin-notification-sent",
            "Admin notification sent successfully via Instagram"
          );
        } else {
          logger.messageFlow.warning(
            platform,
            chatId,
            "admin-notification-failed",
            "No admin Instagram token configured"
          );
        }
      }
    } catch (notificationError) {
      logger.messageFlow.error(
        platform,
        chatId,
        "admin-notification-error",
        notificationError,
        { adminChatId }
      );
    }
  } catch (error) {
    logger.messageFlow.error(platform, chatId, "notify-admin", error);
  }
}

/**
 * Human Detector Node
 */
export async function humanDetectorNode(state) {
  const { messages, platform, chatId, companyId, escalationConfig } = state;

  // Get last user message
  const userMessages = messages.filter((m) => m.role === "user");
  const lastUserMessage =
    userMessages.length > 0
      ? userMessages[userMessages.length - 1].content
      : "";

  let needsHandoff = false;
  let handoffReason = null;

  // Check 1: Escalation keywords
  if (containsEscalationKeyword(lastUserMessage)) {
    needsHandoff = true;
    handoffReason = "escalation_keyword_detected";
    logger.messageFlow.info(
      platform,
      chatId,
      "human-detector",
      "Escalation keyword detected in message"
    );
  }

  // Check 2: Repeated tool failures
  if (!needsHandoff && hasRepeatedToolFailures(messages)) {
    needsHandoff = true;
    handoffReason = "repeated_tool_failures";
    logger.messageFlow.info(
      platform,
      chatId,
      "human-detector",
      "Repeated tool failures detected"
    );
  }

  // Check 3: Conversation stuck in loop
  if (!needsHandoff && isConversationStuck(messages)) {
    needsHandoff = true;
    handoffReason = "conversation_stuck";
    logger.messageFlow.info(
      platform,
      chatId,
      "human-detector",
      "Conversation appears stuck in a loop"
    );
  }

  // Check 4: Very long conversation (may need human touch)
  if (!needsHandoff && messages.length > 500) {
    needsHandoff = true;
    handoffReason = "long_conversation";
    logger.messageFlow.info(
      platform,
      chatId,
      "human-detector",
      "Conversation has exceeded 500 messages"
    );
  }

  // If handoff needed, notify admin
  if (needsHandoff) {
    await notifyHumanOperator({
      platform,
      chatId,
      reason: handoffReason,
      lastMessage: lastUserMessage,
      companyId,
      escalationConfig,
    });
  }

  return {
    needsHumanHandoff: needsHandoff,
    handoffReason: handoffReason,
  };
}

/**
 * Create handoff message for user
 */
export function createHandoffMessage(reason) {
  const messages = {
    escalation_keyword_detected:
      "I understand this is important to you. Let me connect you with a member of our team who can better assist you. Someone will be with you shortly.",
    repeated_tool_failures:
      "I'm having some technical difficulties assisting you properly. Let me transfer you to our support team who can help you right away.",
    conversation_stuck:
      "I want to make sure you get the best help possible. Let me connect you with a team member who can better address your needs.",
    long_conversation:
      "I've enjoyed chatting with you! To make sure we address everything properly, let me connect you with our team for more personalized assistance.",
    default:
      "Let me connect you with our team for personalized assistance. Someone will be with you shortly.",
  };

  return messages[reason] || messages.default;
}
