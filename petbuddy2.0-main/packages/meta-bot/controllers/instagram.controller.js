/**
 * Instagram Bot Controller - Refactored
 * Handles incoming webhook events from Instagram
 *
 * Key improvements:
 * - LangGraph-only processing (removed legacy LLM path)
 * - Comprehensive structured logging
 * - Modern ES6+ patterns (Map/Set)
 * - Modular architecture
 * - Image processing with vision model
 * - Removed unused code
 * - Aligned with Facebook controller best practices
 */

import moment from "moment";
import { config } from "../config/env.js";
import {
  MESSAGE_CONSTANTS,
  TIMEOUT_CONSTANTS,
  ERROR_CODES,
} from "../config/constants.js";
import { processMessageWithLangGraph } from "../langgraph/controller.js";
import { imageInputLLM } from "../lib/imageModel.js";
import {
  getCompanyByInstagram,
  getCollectedSystemInstructions,
  setBotActive,
} from "../services/company.service.js";
import {
  instagramMsgSender,
  getCustomerInstagramInfo,
  callInstaTypingAPI,
} from "../middlewares/instagramMsgSender.js";
import {
  getOrCreateContact,
  updateContactBotSuspension,
} from "../services/contact.service.js";
import {
  getCurrentTimeInRegion,
  isWithinActiveInterval,
} from "../utils/time.js";
import {
  createMessage,
  getMessagesByCustomer,
} from "../services/message.service.js";
import { Contact } from "@petbuddy/shared";
import logger from "../utils/logger.js";
import axios from "axios";
import { ConversationBufferManager } from "../core/bufferManager.js";
import { DuplicateDetector } from "../core/duplicateDetector.js";

// ========== Constants ==========
// Extract constants for readability
const {
  BOT_SIGNATURE,
  MAX_ATTACHMENTS,
  MAX_MESSAGE_HISTORY,
  DEFAULT_RESPONSE_DELAY_MS,
  BOT_SUSPENSION_DAYS,
} = MESSAGE_CONSTANTS;

const { SOCKET_EMIT_TIMEOUT } = TIMEOUT_CONSTANTS;
const { TOKEN_EXPIRED, RATE_LIMIT, TOKEN_EXPIRATION_SUBCODES } = ERROR_CODES.INSTAGRAM;

const BACKEND_URL = config.backend.apiUrl;
const INTERNAL_API_KEY = config.security.internalApiKey;

// ========== State Management ==========
const messageBuffer = new ConversationBufferManager("instagram");
const duplicateDetector = new DuplicateDetector("instagram");

// ========== Helper Functions ==========

/**
 * Get or create Instagram contact
 */
async function getOrCreateInstagramContact(instaId, company) {
  logger.messageFlow.processing(
    "instagram",
    null,
    instaId,
    "contact-lookup-start",
    "Getting or creating contact",
    { company_id: company._id }
  );

  try {
    const instaInfo = await getCustomerInstagramInfo(
      instaId,
      "username,id,profile_pic",
      company.insta_page_access_token
    );

    logger.messageFlow.processing(
      "instagram",
      null,
      instaId,
      "instagram-api-success",
      "Retrieved Instagram profile info",
      { username: instaInfo?.username }
    );

    const profileData = {
      name: instaInfo?.username || undefined,
      picture: instaInfo?.profile_pic || undefined,
    };

    const contact = await getOrCreateContact(
      instaId,
      company._id,
      "instagram",
      profileData
    );

    logger.messageFlow.processing(
      "instagram",
      null,
      instaId,
      "contact-ready",
      "Contact created/updated successfully",
      {
        contact_id: contact._id,
        full_name: contact.fullName || "Instagram User",
      }
    );

    return {
      _id: contact._id,
      chat_id: instaId,
      full_name: contact.fullName || contact.profile?.name || "Instagram User",
      phone_number: contact.phone,
      company_id: contact.companyId,
      bot_suspended: contact.botSuspended,
      bot_suspend_until: contact.botSuspendUntil,
    };
  } catch (error) {
    logger.messageFlow.error(
      "instagram",
      instaId,
      "contact-creation-failed",
      error,
      { company_id: company._id }
    );

    // Fallback: create basic contact
    try {
      logger.messageFlow.processing(
        "instagram",
        null,
        instaId,
        "contact-fallback-attempt",
        "Attempting to create basic contact without profile info"
      );

      const contact = await getOrCreateContact(
        instaId,
        company._id,
        "instagram",
        {}
      );

      logger.messageFlow.processing(
        "instagram",
        null,
        instaId,
        "contact-fallback-success",
        "Basic contact created",
        { contact_id: contact._id }
      );

      return {
        _id: contact._id,
        chat_id: instaId,
        full_name: "Instagram User",
        phone_number: "",
        company_id: contact.companyId,
        bot_suspended: contact.botSuspended,
        bot_suspend_until: contact.botSuspendUntil,
      };
    } catch (createError) {
      logger.messageFlow.error(
        "instagram",
        instaId,
        "contact-fallback-failed",
        createError,
        {}
      );
      return null;
    }
  }
}

/**
 * Save message to database and emit socket event
 */
async function saveMessage(
  contactId,
  companyId,
  content,
  direction,
  externalId,
  attachments = []
) {
  logger.messageFlow.processing(
    "instagram",
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
      role: direction === "inbound" ? "user" : "assistant",
      platform: "instagram",
      content,
      direction,
      external_message_id: externalId,
      attachments,
      created_at: new Date(),
      updated_at: new Date(),
    });

    logger.messageFlow.processing(
      "instagram",
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
      logger.messageFlow.processing(
        "instagram",
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
              read: direction === "outbound",
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
            "instagram",
            externalId,
            contactId,
            "socket-emit-success",
            "Socket event emitted successfully"
          );
        } else {
          logger.messageFlow.warning(
            "instagram",
            externalId,
            contactId,
            "socket-emit-failed",
            "Socket emission returned non-success status",
            { response: socketResponse.data }
          );
        }
      } catch (socketError) {
        logger.messageFlow.error(
          "instagram",
          contactId,
          "socket-emit-error",
          socketError,
          { direction }
        );
      }
    } else {
      logger.messageFlow.processing(
        "instagram",
        externalId,
        contactId,
        "socket-emit-skipped",
        "Socket emission skipped (no API key configured)"
      );
    }

    return savedMessage;
  } catch (error) {
    logger.messageFlow.error(
      "instagram",
      contactId,
      "message-save-failed",
      error,
      { direction, external_id: externalId }
    );
    throw error;
  }
}

/**
 * Send message to Instagram user
 */
async function sendMessage(
  recipientId,
  messageText,
  accessToken,
  customer,
  company
) {
  logger.messageFlow.processing(
    "instagram",
    null,
    recipientId,
    "send-start",
    "Sending message to Instagram",
    { message_length: messageText?.length || 0 }
  );

  try {
    const response = await instagramMsgSender(
      recipientId,
      messageText,
      accessToken
    );

    logger.messageFlow.outgoing(
      "instagram",
      response.message_id,
      null,
      recipientId,
      "Message sent successfully via Instagram API",
      { message_length: messageText?.length || 0 }
    );

    return response;
  } catch (sendError) {
    logger.messageFlow.error("instagram", recipientId, "send-message", sendError, {
      company_id: company._id,
      recipient_id: recipientId,
    });

    const errorCode = sendError?.response?.data?.error?.code;
    const errorSubcode = sendError?.response?.data?.error?.error_subcode;

    // Handle token errors
    if (errorCode === TOKEN_EXPIRED) {
      logger.messageFlow.error(
        "instagram",
        recipientId,
        "token-error",
        new Error(`Token error: code ${errorCode}, subcode ${errorSubcode}`),
        { company_id: company._id }
      );

      // Auto-disable bot on token expiration
      if (TOKEN_EXPIRATION_SUBCODES.includes(errorSubcode)) {
        await setBotActive(company._id, false);
        logger.messageFlow.info(
          "instagram",
          recipientId,
          "bot-disabled",
          "Bot auto-disabled due to token error"
        );
      }
    } else if (RATE_LIMIT.includes(errorCode)) {
      // FIXED: Issue #9 - Rate limits are company-wide, not per-contact
      // Instagram rate limits apply to the page token, affecting ALL customers
      logger.messageFlow.error(
        "instagram",
        recipientId,
        "rate-limited",
        new Error(`Instagram rate limit hit (code: ${errorCode}) - disabling bot company-wide`),
        { company_id: company._id }
      );

      // Disable bot for entire company, not just this contact
      await setBotActive(company._id, false);

      logger.messageFlow.info(
        "instagram",
        recipientId,
        "bot-disabled-rate-limit",
        "Bot auto-disabled company-wide due to Instagram rate limit. Manual re-enable required after rate limit window passes."
      );
    }

    return null;
  }
}

/**
 * Process image attachment
 */
async function describeImage(imageUrl, openaiApiKey) {
  try {
    logger.messageFlow.processing(
      "instagram",
      null,
      null,
      "image-processing",
      "Processing image with vision model",
      { url: imageUrl }
    );

    const imageDescription = await imageInputLLM(openaiApiKey, imageUrl);

    logger.messageFlow.processing(
      "instagram",
      null,
      null,
      "image-processed",
      "Image processed successfully"
    );

    return `Customer sent an image: ${imageDescription}`;
  } catch (error) {
    logger.messageFlow.error(
      "instagram",
      null,
      "image-processing",
      error,
      { url: imageUrl }
    );
    return "Customer sent an image but I couldn't process it.";
  }
}

/**
 * Check if bot should respond
 */
async function canBotRespond(contactId, company) {
  logger.messageFlow.processing(
    "instagram",
    null,
    contactId,
    "bot-eligibility-check-start",
    "Checking if bot can respond",
    { company_id: company._id }
  );

  try {
    // Check contact suspension
    const contact = await Contact.findById(contactId)
      .select("botSuspended botSuspendUntil")
      .lean();

    if (!contact) {
      logger.messageFlow.error(
        "instagram",
        contactId,
        "contact-not-found",
        new Error("Contact not found in database"),
        { contact_id: contactId }
      );
      return false;
    }

    if (contact.botSuspended) {
      logger.messageFlow.info(
        "instagram",
        contactId,
        "bot-manually-suspended",
        "Bot is manually suspended for this contact"
      );
      return false;
    }

    if (
      contact.botSuspendUntil &&
      new Date() < new Date(contact.botSuspendUntil)
    ) {
      logger.messageFlow.info(
        "instagram",
        contactId,
        "bot-auto-suspended",
        `Bot is auto-suspended until ${contact.botSuspendUntil}`,
        { suspend_until: contact.botSuspendUntil }
      );
      return false;
    }

    // CLARIFICATION: Issue #13 - Two different "hours" concepts exist:
    // 1. bot_active_interval (checked here) - When bot responds to messages
    // 2. working_hours (passed to LangGraph) - Business hours for booking validation
    //
    // This is intentional: bot can respond 24/7 to answer questions, but tools
    // validate against business hours when booking appointments.

    // Check bot active interval (when bot should respond)
    if (company?.bot_active_interval?.interval_active) {
      const {
        timezone = "UTC",
        start_time,
        end_time,
      } = company.bot_active_interval;
      const currentTime = moment(getCurrentTimeInRegion(timezone), "HH:mm");
      const start = moment(start_time, "HH:mm");
      const end = moment(end_time, "HH:mm");

      if (!isWithinActiveInterval(currentTime, start, end)) {
        logger.messageFlow.info(
          "instagram",
          contactId,
          "outside-working-hours",
          "Current time is outside bot working hours",
          {
            current_time: currentTime.format("HH:mm"),
            start_time,
            end_time,
            timezone,
          }
        );
        return false;
      }

      logger.messageFlow.processing(
        "instagram",
        null,
        contactId,
        "within-working-hours",
        "Current time is within bot working hours",
        { current_time: currentTime.format("HH:mm") }
      );
    }

    logger.messageFlow.processing(
      "instagram",
      null,
      contactId,
      "bot-eligible",
      "Bot is eligible to respond"
    );

    return true;
  } catch (error) {
    logger.messageFlow.error(
      "instagram",
      contactId,
      "bot-eligibility-check-failed",
      error,
      {}
    );
    return false;
  }
}

/**
 * Process message with AI
 */
async function processWithAI(customer, company, bufferedText = "", imageDescription = null, bufferedMessageCount = 0) {
  const { chat_id: customerInstaId, _id: customerId } = customer;
  const { insta_page_access_token } = company;

  logger.messageFlow.processing(
    "instagram",
    null,
    customerInstaId,
    "ai-processing-start",
    "Starting AI processing pipeline",
    {
      customer_id: customerId,
      company_id: company._id,
      has_buffered_text: !!bufferedText,
      has_image_description: !!imageDescription,
      buffered_message_count: bufferedMessageCount
    }
  );

  try {
    // Get conversation history
    logger.messageFlow.processing(
      "instagram",
      null,
      customerInstaId,
      "history-fetch-start",
      "Fetching conversation history",
      { limit: MAX_MESSAGE_HISTORY }
    );

    const recentMessages = await getMessagesByCustomer({
      customerId,
      platform: "instagram",
      limit: MAX_MESSAGE_HISTORY,
      skip: 0,
    });

    logger.messageFlow.processing(
      "instagram",
      null,
      customerInstaId,
      "history-fetched",
      "Conversation history retrieved",
      { message_count: recentMessages.length }
    );

    const formattedMessages = recentMessages.map((msg) => ({
      role: msg.role === "user" ? "user" : "assistant",
      content: (msg.content || "").split(BOT_SIGNATURE).join(""),
    }));

    // Build the final user message from buffered text and/or images
    let finalUserMessage = bufferedText || "";

    // Append image description if present
    if (imageDescription) {
      finalUserMessage = finalUserMessage
        ? `${finalUserMessage}\n\n${imageDescription}`
        : imageDescription;
    }

    // If we have buffered messages, remove them from history (they're combined in finalUserMessage)
    if (bufferedMessageCount > 0) {
      // Remove the buffered messages from the end of history
      let removedCount = 0;
      while (removedCount < bufferedMessageCount && formattedMessages.length > 0) {
        if (formattedMessages[formattedMessages.length - 1].role === "user") {
          formattedMessages.pop();
          removedCount++;
        } else {
          // Stop if we hit a bot message
          break;
        }
      }

      logger.messageFlow.processing(
        "instagram",
        null,
        customerInstaId,
        "using-buffered-text",
        `Removed ${removedCount} buffered messages from history, using combined text`,
        { buffered_length: finalUserMessage.length }
      );
    } else if (!finalUserMessage && formattedMessages.length > 0) {
      // No buffered message, use the last message from history
      finalUserMessage = formattedMessages[formattedMessages.length - 1]?.content || "";

      // Remove it from history since it will be the current message
      if (formattedMessages[formattedMessages.length - 1].role === "user") {
        formattedMessages.pop();
      }
    }

    // Mark as seen
    try {
      logger.messageFlow.processing(
        "instagram",
        null,
        customerInstaId,
        "mark-seen-start",
        "Marking message as seen"
      );

      await callInstaTypingAPI(
        customerInstaId,
        "mark_seen",
        insta_page_access_token
      );

      logger.messageFlow.processing(
        "instagram",
        null,
        customerInstaId,
        "mark-seen-success",
        "Message marked as seen"
      );
    } catch (e) {
      logger.messageFlow.warning(
        "instagram",
        null,
        customerInstaId,
        "mark-seen-failed",
        "Failed to mark message as seen (non-critical)",
        { error: e.message }
      );
    }

    // Get system instructions
    logger.messageFlow.processing(
      "instagram",
      null,
      customerInstaId,
      "system-instructions-fetch-start",
      "Fetching system instructions"
    );

    const systemInstructions = await getCollectedSystemInstructions(company);

    logger.messageFlow.processing(
      "instagram",
      null,
      customerInstaId,
      "system-instructions-fetched",
      "System instructions retrieved",
      { instructions_length: systemInstructions?.length || 0 }
    );

    logger.messageFlow.processing(
      "instagram",
      null,
      customerInstaId,
      "final-message-ready",
      "Final user message ready for processing",
      {
        message_preview: finalUserMessage.substring(0, 100),
        message_length: finalUserMessage.length,
      }
    );

    // Process with LangGraph
    logger.messageFlow.llm(
      "instagram",
      customerInstaId,
      "langgraph-invoke-start",
      "Invoking LangGraph for AI processing",
      {
        history_count: formattedMessages.length,
        company_id: company._id,
      }
    );

    const result = await processMessageWithLangGraph({
      chatId: customerInstaId,
      platform: "instagram",
      message: finalUserMessage,
      companyId: company._id,
      systemInstructions,
      timezone: company.timezone,
      aiProvider: company.ai_provider,
      openaiApiKey: company.openai_api_key,
      geminiApiKey: company.gemini_api_key,
      escalationConfig: company.escalation_config,
      workingHours: company.working_hours || [],
      conversationHistory: formattedMessages,
    });

    logger.messageFlow.llm(
      "instagram",
      customerInstaId,
      "langgraph-complete",
      "LangGraph processing completed",
      {
        has_message: !!result.assistantMessage,
        message_length: result.assistantMessage?.length || 0,
      }
    );

    if (!result.assistantMessage) {
      logger.messageFlow.warning(
        "instagram",
        null,
        customerInstaId,
        "no-ai-response",
        "LangGraph returned no assistant message"
      );
      return;
    }

    // Final eligibility check before sending
    logger.messageFlow.processing(
      "instagram",
      null,
      customerInstaId,
      "pre-send-eligibility-check",
      "Checking bot eligibility before sending response"
    );

    if (!(await canBotRespond(customerId, company))) {
      logger.messageFlow.info(
        "instagram",
        customerInstaId,
        "bot-ineligible-pre-send",
        "Bot eligibility changed during processing - not sending response"
      );
      return;
    }

    // Send response
    const signituredMessage = result.assistantMessage + BOT_SIGNATURE;

    logger.messageFlow.processing(
      "instagram",
      null,
      customerInstaId,
      "response-send-start",
      "Sending AI-generated response",
      { response_length: signituredMessage.length }
    );

    const sendResponse = await sendMessage(
      customerInstaId,
      signituredMessage,
      insta_page_access_token,
      customer,
      company
    );

    if (sendResponse) {
      const externalMsgId = sendResponse.message_id || customerInstaId;

      logger.messageFlow.processing(
        "instagram",
        externalMsgId,
        customerInstaId,
        "response-sent",
        "Response sent successfully, now saving to database"
      );

      await saveMessage(
        customerId,
        customer.company_id,
        signituredMessage,
        "outbound",
        externalMsgId
      );

      logger.messageFlow.processing(
        "instagram",
        externalMsgId,
        customerInstaId,
        "ai-flow-complete",
        "AI processing flow completed successfully"
      );
    } else {
      logger.messageFlow.error(
        "instagram",
        customerInstaId,
        "response-send-failed",
        new Error("Message send failed, not saving to database"),
        {}
      );
    }
  } catch (error) {
    logger.messageFlow.error(
      "instagram",
      customerInstaId,
      "ai-processing",
      error,
      {}
    );

    // Check for token expiration
    const code = error?.code || error?.response?.data?.error?.code;
    const sub = error?.error_subcode || error?.response?.data?.error?.error_subcode;

    if (code === TOKEN_EXPIRED && TOKEN_EXPIRATION_SUBCODES.includes(sub)) {
      logger.messageFlow.error(
        "instagram",
        customerInstaId,
        "token-expired",
        new Error("Access token expired, disabling bot"),
        { company_id: company._id }
      );
      await setBotActive(company._id, false);
    }

    throw error;
  }
}

/**
 * Handle admin echo messages (human replies)
 */
async function handleEchoMessage(webhookEvent) {
  const recipientInstaId = webhookEvent.recipient?.id;
  const senderInstaId = webhookEvent.sender?.id;
  const msgText = webhookEvent.message?.text || "";
  const externalMsgId = webhookEvent?.message?.mid || recipientInstaId;

  logger.messageFlow.incoming(
    "instagram",
    externalMsgId,
    senderInstaId,
    recipientInstaId,
    "Received echo message (admin reply)",
    { has_signature: msgText.endsWith(BOT_SIGNATURE) }
  );

  // Skip bot messages (already saved)
  if (msgText.endsWith(BOT_SIGNATURE)) {
    logger.messageFlow.processing(
      "instagram",
      externalMsgId,
      senderInstaId,
      "echo-skip-bot",
      "Skipping bot echo message (already saved)"
    );
    return;
  }

  logger.messageFlow.processing(
    "instagram",
    externalMsgId,
    senderInstaId,
    "echo-human-detected",
    "Processing human admin reply"
  );

  // Get company
  const company = await getCompanyByInstagram(senderInstaId);
  if (!company) {
    logger.messageFlow.error(
      "instagram",
      senderInstaId,
      "echo-company-not-found",
      new Error(`Company not found for sender ${senderInstaId}`),
      {}
    );
    return;
  }

  logger.messageFlow.processing(
    "instagram",
    externalMsgId,
    senderInstaId,
    "echo-company-found",
    "Company found for admin reply",
    { company_id: company._id }
  );

  // Get or create contact for recipient
  const customer = await getOrCreateInstagramContact(recipientInstaId, company);
  if (!customer) {
    logger.messageFlow.error(
      "instagram",
      recipientInstaId,
      "echo-contact-creation-failed",
      new Error("Failed to create contact for echo message"),
      {}
    );
    return;
  }

  // FIXED: Check for special commands before auto-suspending
  // Allow admin to control bot behavior with special messages
  const lowerMsg = msgText.toLowerCase().trim();

  // Command: /resume - Clear bot suspension immediately
  if (lowerMsg === '/resume' || lowerMsg === '/resume bot' || lowerMsg === '/enable bot') {
    try {
      await updateContactBotSuspension(customer._id, undefined, null);

      logger.messageFlow.info(
        "instagram",
        externalMsgId,
        "bot-suspension-cleared",
        "Admin cleared bot suspension with /resume command"
      );

      // Don't save the command message
      return;
    } catch (error) {
      logger.messageFlow.error(
        "instagram",
        recipientInstaId,
        "clear-suspension",
        error,
        {}
      );
    }
  }

  // Save admin message
  await saveMessage(
    customer._id,
    company._id,
    msgText,
    "outbound",
    externalMsgId
  );

  logger.messageFlow.processing(
    "instagram",
    externalMsgId,
    senderInstaId,
    "echo-message-saved",
    "Admin reply saved to database"
  );

  // Auto-suspend bot when admin replies (unless it's a command)
  const suspensionDate = new Date();
  suspensionDate.setDate(suspensionDate.getDate() + BOT_SUSPENSION_DAYS);

  try {
    await updateContactBotSuspension(
      customer._id,
      undefined,
      suspensionDate
    );

    logger.messageFlow.info(
      "instagram",
      externalMsgId,
      "bot-auto-suspended",
      `Bot auto-suspended until ${suspensionDate.toISOString()} (${BOT_SUSPENSION_DAYS} days) due to admin reply. Use /resume to re-enable.`
    );
  } catch (e) {
    logger.messageFlow.error(
      "instagram",
      senderInstaId,
      "bot-suspend-failed",
      e,
      {}
    );
  }
}

/**
 * Handle incoming user message
 */
async function handleUserMessage(webhookEvent, company) {
  const senderInstaId = webhookEvent?.sender?.id;
  const incomingText = webhookEvent?.message?.text || "";
  const incomingAttachments = webhookEvent?.message?.attachments || [];
  const externalMessageId = webhookEvent?.message?.mid || senderInstaId;

  logger.messageFlow.incoming(
    "instagram",
    externalMessageId,
    senderInstaId,
    company._id,
    "Received user message",
    {
      has_text: !!incomingText,
      text_length: incomingText?.length || 0,
      attachments_count: incomingAttachments?.length || 0,
    }
  );

  // Validate sender
  if (!senderInstaId) {
    logger.messageFlow.error(
      "instagram",
      null,
      "missing-sender-id",
      new Error("Webhook event missing sender ID"),
      {}
    );
    return;
  }

  // Check for duplicates
  if (duplicateDetector.isDuplicate(externalMessageId)) {
    return; // Already logged in DuplicateDetector
  }

  // Process attachments
  const attachments = [];
  if (incomingAttachments.length > 0) {
    logger.messageFlow.processing(
      "instagram",
      externalMessageId,
      senderInstaId,
      "attachments-processing-start",
      "Processing message attachments",
      { attachment_count: incomingAttachments.length }
    );

    const attachmentsToProcess = incomingAttachments.slice(0, MAX_ATTACHMENTS);

    if (incomingAttachments.length > MAX_ATTACHMENTS) {
      logger.messageFlow.warning(
        "instagram",
        externalMessageId,
        senderInstaId,
        "attachments-too-many",
        `Message has ${incomingAttachments.length} attachments, processing only ${MAX_ATTACHMENTS}`,
        { total: incomingAttachments.length, processing: MAX_ATTACHMENTS }
      );
    }

    for (const attachment of attachmentsToProcess) {
      if (attachment?.payload?.url) {
        try {
          new URL(attachment.payload.url); // Validate URL
          attachments.push({
            type: attachment.type || "file",
            url: attachment.payload.url,
            file_description: "",
          });
        } catch {
          logger.messageFlow.warning(
            "instagram",
            externalMessageId,
            senderInstaId,
            "attachment-invalid-url",
            "Skipping attachment with invalid URL",
            { url: attachment.payload.url }
          );
        }
      }
    }

    logger.messageFlow.processing(
      "instagram",
      externalMessageId,
      senderInstaId,
      "attachments-processed",
      `Processed ${attachments.length} valid attachments`,
      { valid_count: attachments.length }
    );
  }

  // Get or create contact
  const customer = await getOrCreateInstagramContact(senderInstaId, company);
  if (!customer) {
    logger.messageFlow.error(
      "instagram",
      senderInstaId,
      "contact-creation-failed",
      new Error("Failed to create or retrieve contact"),
      {}
    );
    return;
  }

  // Save incoming message
  await saveMessage(
    customer._id,
    company._id,
    incomingText,
    "inbound",
    externalMessageId,
    attachments
  );

  // FIXED: Mark as processed AFTER successful save
  // This ensures retries work if save fails
  duplicateDetector.add(externalMessageId);

  logger.messageFlow.processing(
    "instagram",
    externalMessageId,
    senderInstaId,
    "message-marked-processed",
    "Message saved and marked as processed"
  );

  // Check if bot is active
  if (!company.bot_active) {
    logger.messageFlow.info(
      "instagram",
      senderInstaId,
      "bot-inactive",
      "Bot is not active for this company - message saved but no response sent",
      { company_id: company._id }
    );
    return;
  }

  // Check working hours
  if (company.bot_active_interval?.interval_active) {
    const {
      timezone = "UTC",
      start_time,
      end_time,
    } = company.bot_active_interval;
    const currentTime = moment(getCurrentTimeInRegion(timezone), "HH:mm");
    const start = moment(start_time, "HH:mm");
    const end = moment(end_time, "HH:mm");

    if (!isWithinActiveInterval(currentTime, start, end)) {
      logger.messageFlow.info(
        "instagram",
        senderInstaId,
        "outside-working-hours-initial",
        "Outside working hours - message saved but no response sent",
        {
          current_time: currentTime.format("HH:mm"),
          start_time,
          end_time,
          timezone,
        }
      );
      return;
    }

    logger.messageFlow.processing(
      "instagram",
      externalMessageId,
      senderInstaId,
      "within-working-hours-initial",
      "Within working hours - proceeding with response"
    );
  }

  // Determine delay based on company settings and message content
  const isSentenceEnd = /[.!?…]\s*$/.test(incomingText);
  let standardDelay = company.bot?.responseDelay?.standard || config.bot.responseDelayMs || DEFAULT_RESPONSE_DELAY_MS;

  // Safeguard: ensure delay is at least 1000ms (values less than 1000 are likely config errors)
  if (standardDelay < 1000) {
    logger.messageFlow.warning(
      "instagram",
      externalMessageId,
      senderInstaId,
      "delay-too-small",
      `Response delay (${standardDelay}ms) too small, using default (${config.bot.responseDelayMs}ms)`,
      { configured_delay: standardDelay }
    );
    standardDelay = config.bot.responseDelayMs || DEFAULT_RESPONSE_DELAY_MS;
  }

  const sentenceEndDelay = company.bot?.responseDelay?.sentenceEnd || Math.floor(standardDelay / 4);
  const delayMs = isSentenceEnd ? sentenceEndDelay : standardDelay;

  logger.messageFlow.processing(
    "instagram",
    externalMessageId,
    senderInstaId,
    "buffer-set",
    `Buffering response for ${delayMs}ms`,
    { is_sentence_end: isSentenceEnd, delay_type: isSentenceEnd ? 'sentence_end' : 'standard' }
  );

  // Get image URL if present
  const imageUrl = Array.isArray(incomingAttachments) && incomingAttachments[0]?.payload?.url
    ? incomingAttachments[0].payload.url
    : null;

  // Add message to buffer - it will accumulate text and images
  messageBuffer.addMessage(senderInstaId, {
    customer,
    company,
    delayMs,
    messageText: incomingText, // Pass the text to accumulate
    imageUrl, // Pass image URL to accumulate
    onFlush: async (bufferedCustomer, bufferedCompany, combinedText, imageUrls, messageCount) => {
      try {
        // Process ALL accumulated images
        let imageDescription = null;
        if (imageUrls && imageUrls.length > 0) {
          // Process all images and combine descriptions
          const descriptions = await Promise.all(
            imageUrls.map(url => describeImage(url, bufferedCompany.openai_api_key))
          );
          imageDescription = descriptions.join('\n\n');

          logger.messageFlow.processing(
            "instagram",
            null,
            senderInstaId,
            "images-processed",
            `Processed ${imageUrls.length} image(s) from buffered messages`
          );
        }

        // Process with AI using the combined text from buffer
        // Pass messageCount so processWithAI knows how many messages to remove from history
        await processWithAI(bufferedCustomer, bufferedCompany, combinedText, imageDescription, messageCount);
      } catch (error) {
        logger.messageFlow.error(
          "instagram",
          senderInstaId,
          "buffered-processing-failed",
          error,
          {}
        );
      }
    },
  });
}

// ========== Main Handler ==========

/**
 * Instagram webhook handler
 */
export async function handlerInstagram(req, res) {
  logger.messageFlow.incoming(
    "instagram",
    null,
    null,
    null,
    "Instagram webhook received",
    {
      has_body: !!req.body,
      has_entry: !!req.body?.entry,
      user_agent: req.headers?.["user-agent"]
    }
  );

  try {
    const { body } = req;

    // Validate payload
    if (!body || !body.entry || !Array.isArray(body.entry)) {
      logger.messageFlow.warning(
        "instagram",
        null,
        null,
        null,
        "webhook-invalid-payload",
        "Invalid webhook payload structure"
      );
      return res.status(400).send("Invalid payload");
    }

    // Acknowledge webhook immediately (Instagram requires fast response)
    res.status(200).send("EVENT_RECEIVED");

    logger.messageFlow.processing(
      "instagram",
      null,
      null,
      "webhook-acknowledged",
      "Webhook acknowledged, processing event"
    );

    // Validate Instagram event
    if (body.object !== "instagram") {
      logger.messageFlow.warning(
        "instagram",
        null,
        null,
        null,
        "webhook-invalid-object",
        `Received non-Instagram webhook: ${body.object}`,
        { object: body.object }
      );
      return;
    }

    // Process all entries and all messaging events within each entry
    let totalEventsProcessed = 0;
    let totalEntriesProcessed = 0;

    for (const entry of body.entry) {
      if (!entry.messaging || !Array.isArray(entry.messaging)) {
        continue;
      }

      totalEntriesProcessed++;

      for (const webhookEvent of entry.messaging) {
        if (!webhookEvent) {
          continue;
        }

        // Ignore template messages
        if (webhookEvent.message?.attachments?.[0]?.type === "template") {
          logger.messageFlow.processing(
            "instagram",
            null,
            null,
            "webhook-template-ignored",
            "Ignoring template message"
          );
          continue;
        }

        totalEventsProcessed++;

        try {
          // Handle echo messages (admin replies)
          if (webhookEvent?.message?.is_echo) {
            logger.messageFlow.processing(
              "instagram",
              webhookEvent?.message?.mid,
              null,
              "webhook-echo-detected",
              "Echo message detected - routing to echo handler"
            );
            await handleEchoMessage(webhookEvent);
            continue;
          }

          // Get company
          const recipientInstaId = webhookEvent?.recipient?.id;

          logger.messageFlow.processing(
            "instagram",
            null,
            recipientInstaId,
            "company-lookup-start",
            "Looking up company by Instagram ID"
          );

          const company = await getCompanyByInstagram(recipientInstaId);

          if (!company) {
            logger.messageFlow.error(
              "instagram",
              recipientInstaId,
              "company-not-found",
              new Error(`Company not found for recipient ${recipientInstaId}`),
              { recipient_id: recipientInstaId }
            );
            continue;
          }

          logger.messageFlow.processing(
            "instagram",
            null,
            recipientInstaId,
            "company-found",
            "Company found successfully",
            { company_id: company._id }
          );

          // Validate message content
          const incomingText = webhookEvent?.message?.text || "";
          const incomingAttachments = webhookEvent?.message?.attachments || [];

          if (!incomingText && incomingAttachments.length === 0) {
            logger.messageFlow.processing(
              "instagram",
              null,
              null,
              "webhook-no-content",
              "No content to process in webhook event"
            );
            continue;
          }

          // Handle user message
          logger.messageFlow.processing(
            "instagram",
            webhookEvent?.message?.mid,
            null,
            "webhook-routing-user-message",
            "Routing to user message handler"
          );

          await handleUserMessage(webhookEvent, company);

          logger.messageFlow.processing(
            "instagram",
            webhookEvent?.message?.mid,
            null,
            "webhook-complete",
            "Webhook processing completed successfully"
          );
        } catch (eventError) {
          logger.messageFlow.error(
            "instagram",
            webhookEvent?.sender?.id,
            "event-processing-error",
            eventError,
            {
              recipient_id: webhookEvent?.recipient?.id,
              sender_id: webhookEvent?.sender?.id,
              message_id: webhookEvent?.message?.mid
            }
          );

          // Clean up buffer on error for this specific event
          const senderInstaId = webhookEvent?.sender?.id;
          if (senderInstaId) {
            messageBuffer.cancel(senderInstaId);
          }
        }
      }
    }

    // Log batch processing statistics
    if (totalEventsProcessed > 1) {
      logger.messageFlow.processing(
        "instagram",
        null,
        null,
        "batch-processed",
        "Processed batched webhook events",
        {
          entries: totalEntriesProcessed,
          events: totalEventsProcessed
        }
      );
    }

    if (totalEventsProcessed === 0) {
      logger.messageFlow.warning(
        "instagram",
        null,
        null,
        "no-messaging-event",
        "No messaging events in webhook"
      );
    }
  } catch (error) {
    logger.messageFlow.error(
      "instagram",
      null,
      "webhook-handler-error",
      error,
      {}
    );

    // Clean up buffer on error
    const senderInstaId = req.body?.entry?.[0]?.messaging?.[0]?.sender?.id;
    if (senderInstaId) {
      messageBuffer.cancel(senderInstaId);
    }
  }
}
