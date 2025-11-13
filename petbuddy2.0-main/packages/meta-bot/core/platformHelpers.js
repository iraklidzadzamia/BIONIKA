/**
 * Platform Helper Functions
 * Shared utility functions used across platform controllers
 */

import axios from "axios";
import moment from "moment";
import { config } from "../config/env.js";
import { createMessage } from "../services/message.service.js";
import { updateContactBotSuspension } from "../services/contact.service.js";
import logger from "../utils/logger.js";
import {
  BOT_SIGNATURE,
  MESSAGE_DIRECTION,
  MESSAGE_ROLE,
  ADMIN_REPLY_SUSPENSION_DAYS,
  ERROR_SUSPENSION_MINUTES,
  RATE_LIMIT_SUSPENSION_HOURS,
} from "./constants.js";

const BACKEND_URL = config.backend.apiUrl;
const INTERNAL_API_KEY = config.security.internalApiKey;

/**
 * Save message to database and emit socket event
 */
export async function saveMessage(
  platform,
  contactId,
  companyId,
  content,
  direction,
  externalId,
  attachments = []
) {
  logger.messageFlow.processing(
    platform,
    externalId,
    contactId,
    "message-save-start",
    `Saving ${direction} message to database`,
    {
      content_length: content?.length || 0,
      attachments_count: attachments?.length || 0,
    }
  );

  try {
    const savedMessage = await createMessage({
      contact_id: contactId,
      company_id: companyId,
      role: direction === MESSAGE_DIRECTION.INBOUND ? MESSAGE_ROLE.USER : MESSAGE_ROLE.ASSISTANT,
      platform,
      content,
      direction,
      external_message_id: externalId,
      attachments,
      created_at: new Date(),
      updated_at: new Date(),
    });

    logger.messageFlow.processing(
      platform,
      externalId,
      contactId,
      "message-saved",
      `${direction} message saved successfully`,
      {
        message_id: savedMessage._id,
        role: savedMessage.role,
      }
    );

    // Emit socket event for real-time updates
    if (INTERNAL_API_KEY) {
      await emitSocketEvent(platform, contactId, companyId, savedMessage, content, direction, externalId);
    } else {
      logger.messageFlow.processing(
        platform,
        externalId,
        contactId,
        "socket-emit-skipped",
        "Socket emission skipped (no API key configured)"
      );
    }

    return savedMessage;
  } catch (error) {
    logger.messageFlow.error(
      platform,
      contactId,
      "message-save-failed",
      error,
      { direction, external_id: externalId }
    );
    throw error;
  }
}

/**
 * Emit socket event for real-time message updates
 */
async function emitSocketEvent(platform, contactId, companyId, savedMessage, content, direction, externalId) {
  logger.messageFlow.processing(
    platform,
    externalId,
    contactId,
    "socket-emit-start",
    "Emitting socket event for real-time update"
  );

  try {
    const socketResponse = await axios.post(
      `${BACKEND_URL}/api/v1/socket/emit-message-internal`,
      {
        companyId: companyId.toString(),
        conversationId: contactId.toString(),
        message: {
          id: savedMessage._id.toString(),
          contactId: contactId.toString(),
          content,
          direction,
          timestamp: new Date().toISOString(),
          read: direction === MESSAGE_DIRECTION.OUTBOUND,
          delivered: true,
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": INTERNAL_API_KEY,
        },
        timeout: 5000,
      }
    );

    if (socketResponse.data?.success) {
      logger.messageFlow.processing(
        platform,
        externalId,
        contactId,
        "socket-emit-success",
        "Socket event emitted successfully"
      );
    } else {
      logger.messageFlow.warning(
        platform,
        externalId,
        contactId,
        "socket-emit-failed",
        "Socket emission returned non-success status",
        { response: socketResponse.data }
      );
    }
  } catch (socketError) {
    logger.messageFlow.error(
      platform,
      contactId,
      "socket-emit-error",
      socketError,
      { direction }
    );
  }
}

/**
 * Handle token errors (190 error code)
 */
export function handleTokenError(platform, recipientId, company, errorCode, errorSubcode, onDisableBot) {
  logger.messageFlow.error(
    platform,
    recipientId,
    "token-error",
    new Error(`Token error: code ${errorCode}, subcode ${errorSubcode}`),
    { company_id: company._id, code: errorCode, subcode: errorSubcode }
  );

  if (errorSubcode === 463) {
    logger.messageFlow.warning(
      platform,
      null,
      recipientId,
      "token-expired",
      "Access token has expired - requires re-authentication",
      { company_id: company._id }
    );

    if (onDisableBot) {
      onDisableBot();
    }
  } else if (errorSubcode === 467) {
    logger.messageFlow.warning(
      platform,
      null,
      recipientId,
      "token-invalidated",
      "Access token has been invalidated - requires re-authentication",
      { company_id: company._id }
    );

    if (onDisableBot) {
      onDisableBot();
    }
  }
}

/**
 * Handle rate limit errors (4 or 80007 error code)
 */
export async function handleRateLimitError(platform, recipientId, customerId, company) {
  const suspendUntil = moment().add(RATE_LIMIT_SUSPENSION_HOURS, "hour").toDate();

  logger.messageFlow.warning(
    platform,
    null,
    recipientId,
    "rate-limited",
    `Rate limit hit - suspending bot for ${RATE_LIMIT_SUSPENSION_HOURS} hour(s)`,
    { company_id: company._id, suspend_until: suspendUntil.toISOString() }
  );

  await updateContactBotSuspension(customerId, undefined, suspendUntil);

  logger.messageFlow.processing(
    platform,
    null,
    recipientId,
    "bot-suspended",
    "Bot auto-suspended due to rate limit",
    { suspend_until: suspendUntil.toISOString() }
  );
}

/**
 * Suspend bot after admin reply
 */
export async function suspendBotAfterAdminReply(platform, contactId, externalMsgId, senderId) {
  const suspendUntil = new Date();
  suspendUntil.setDate(suspendUntil.getDate() + ADMIN_REPLY_SUSPENSION_DAYS);

  try {
    await updateContactBotSuspension(contactId, undefined, suspendUntil);

    logger.messageFlow.processing(
      platform,
      externalMsgId,
      senderId,
      "bot-suspended-admin-reply",
      `Bot auto-suspended for ${ADMIN_REPLY_SUSPENSION_DAYS} days due to admin reply`,
      {
        suspend_until: suspendUntil.toISOString(),
        contact_id: contactId,
      }
    );
  } catch (error) {
    logger.messageFlow.error(
      platform,
      senderId,
      "bot-suspend-failed",
      error,
      {}
    );
  }
}

/**
 * Suspend bot after error
 */
export async function suspendBotAfterError(platform, customerId, customerChatId) {
  const suspendUntil = moment().add(ERROR_SUSPENSION_MINUTES, "minutes").toDate();

  await updateContactBotSuspension(customerId, undefined, suspendUntil);

  logger.messageFlow.processing(
    platform,
    null,
    customerChatId,
    "bot-suspended-error",
    `Bot auto-suspended for ${ERROR_SUSPENSION_MINUTES} minutes due to AI processing error`,
    { suspend_until: suspendUntil.toISOString() }
  );
}

/**
 * Check if text ends with bot signature
 */
export function hasBotSignature(text) {
  return text && text.endsWith(BOT_SIGNATURE);
}

/**
 * Add bot signature to message
 */
export function addBotSignature(text) {
  return text + BOT_SIGNATURE;
}

/**
 * Remove bot signature from message
 */
export function removeBotSignature(text) {
  if (!text) return "";
  return text.replace(BOT_SIGNATURE, "");
}

/**
 * Determine response delay based on message content
 * Shorter delay if message ends with sentence-ending punctuation
 */
export function calculateResponseDelay(text, baseDelayMs) {
  const isSentenceEnd = /[.!?…]\s*$/.test(text || "");
  return isSentenceEnd
    ? Math.min(1000, Math.max(250, Math.floor(baseDelayMs / 2)))
    : baseDelayMs;
}

/**
 * Process and validate attachments
 */
export function processAttachments(platform, messageId, senderId, attachments, maxAttachments) {
  const processedAttachments = [];

  if (!Array.isArray(attachments) || attachments.length === 0) {
    return processedAttachments;
  }

  logger.messageFlow.processing(
    platform,
    messageId,
    senderId,
    "attachments-processing-start",
    "Processing message attachments",
    { attachment_count: attachments.length }
  );

  const attachmentsToProcess = attachments.slice(0, maxAttachments);

  if (attachments.length > maxAttachments) {
    logger.messageFlow.warning(
      platform,
      messageId,
      senderId,
      "attachments-too-many",
      `Message has ${attachments.length} attachments, processing only ${maxAttachments}`,
      { total: attachments.length, processing: maxAttachments }
    );
  }

  for (const attachment of attachmentsToProcess) {
    if (attachment?.payload?.url) {
      try {
        new URL(attachment.payload.url); // Validate URL
        processedAttachments.push({
          type: attachment.type || "file",
          url: attachment.payload.url,
          file_description: "",
        });
      } catch {
        logger.messageFlow.warning(
          platform,
          messageId,
          senderId,
          "attachment-invalid-url",
          "Skipping attachment with invalid URL",
          { url: attachment.payload.url }
        );
      }
    }
  }

  logger.messageFlow.processing(
    platform,
    messageId,
    senderId,
    "attachments-processed",
    `Processed ${processedAttachments.length} valid attachments`,
    { valid_count: processedAttachments.length }
  );

  return processedAttachments;
}
