/**
 * Facebook Messenger Bot Controller - Refactored
 * Handles incoming webhook events from Facebook Messenger
 *
 * Key improvements:
 * - LangGraph-only processing (removed legacy LLM path)
 * - Comprehensive structured logging
 * - Modern ES6+ patterns (Map/Set)
 * - Modular architecture
 * - Removed unused code
 */

import moment from "moment";
import axios from "axios";
import { config } from "../config/env.js";
import {
  MESSAGE_CONSTANTS,
  TIMEOUT_CONSTANTS,
  ERROR_CODES,
} from "../config/constants.js";
import { processMessageWithLangGraph } from "../langgraph/controller.js";
import { imageInputLLM } from "../lib/imageModel.js";
import {
  getCompanyByFb,
  getCollectedSystemInstructions,
  setBotActive,
} from "../services/company.service.js";
import {
  callTypingAPI,
  facebookMsgSender,
  getCustomerFbInfo,
} from "../middlewares/facebookMsgSender.js";
import {
  getOrCreateContact,
  updateContactBotSuspension,
} from "../services/contact.service.js";
import {
  createMessage,
  getMessagesByCustomer,
} from "../services/message.service.js";
import {
  getCurrentTimeInRegion,
  isWithinActiveInterval,
} from "../utils/time.js";
import logger from "../utils/logger.js";
import { ConversationBufferManager } from "../core/bufferManager.js";
import { DuplicateDetector } from "../core/duplicateDetector.js";

// Extract constants for readability
const {
  BOT_SIGNATURE,
  MAX_ATTACHMENTS,
  MAX_MESSAGE_HISTORY,
  DEFAULT_RESPONSE_DELAY_MS,
  BOT_SUSPENSION_DAYS,
} = MESSAGE_CONSTANTS;

const { SOCKET_EMIT_TIMEOUT } = TIMEOUT_CONSTANTS;
const { TOKEN_EXPIRED, RATE_LIMIT, TOKEN_EXPIRATION_SUBCODES } = ERROR_CODES.FACEBOOK;

const BACKEND_URL = config.backend.apiUrl;
const INTERNAL_API_KEY = config.security.internalApiKey;

// Buffer manager and duplicate detector
const messageBuffer = new ConversationBufferManager("facebook");
const duplicateDetector = new DuplicateDetector("facebook");


/**
 * Save message to database and emit socket event
 */
async function saveMessage(contactId, companyId, content, direction, externalId, attachments = []) {
  try {
    const savedMessage = await createMessage({
      contact_id: contactId,
      company_id: companyId,
      role: direction === "inbound" ? "user" : "assistant",
      platform: "facebook",
      content,
      direction,
      external_message_id: externalId,
      attachments,
      created_at: new Date(),
      updated_at: new Date(),
    });

    logger.messageFlow.processing(
      "facebook",
      externalId,
      contactId,
      "saved",
      `${direction} message saved`,
      {
        message_id: savedMessage._id,
        attachments_count: attachments?.length || 0,
      }
    );

    // Emit socket event for real-time updates
    if (INTERNAL_API_KEY) {
      try {
        const response = await axios.post(
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
            timeout: SOCKET_EMIT_TIMEOUT,
          }
        );

        if (!response.data?.success) {
          logger.messageFlow.warning(
            "facebook",
            externalId,
            contactId,
            "socket-emit-failed",
            "Socket emission unsuccessful",
            { response: response.data }
          );
        }
      } catch (socketError) {
        logger.messageFlow.error(
          "facebook",
          contactId,
          "socket-emit",
          socketError,
          { direction }
        );
      }
    }

    return savedMessage;
  } catch (error) {
    logger.messageFlow.error(
      "facebook",
      contactId,
      "save-message",
      error,
      { direction, external_id: externalId }
    );
    throw error;
  }
}

/**
 * Get or create Facebook contact
 */
async function getOrCreateFacebookContact(fbId, company) {
  try {
    logger.messageFlow.processing(
      "facebook",
      null,
      fbId,
      "contact-lookup",
      "Getting or creating contact"
    );

    // Fetch Facebook profile info
    const fbFields = "name,id,profile_pic";
    const fbInfo = await getCustomerFbInfo(
      fbId,
      fbFields,
      company.fb_page_access_token
    );

    const profileData = {
      name: fbInfo?.name || undefined,
      picture: fbInfo?.profile_pic || undefined,
    };

    const contact = await getOrCreateContact(
      fbId,
      company._id,
      "facebook",
      profileData
    );

    logger.messageFlow.processing(
      "facebook",
      null,
      fbId,
      "contact-ready",
      "Contact created/updated",
      {
        contact_id: contact._id,
        name: contact.fullName,
      }
    );

    return {
      _id: contact._id,
      chat_id: fbId,
      full_name: contact.fullName || contact.profile?.name || "Facebook User",
      phone_number: contact.phone,
      company_id: contact.companyId,
      bot_suspended: contact.botSuspended,
      bot_suspend_until: contact.botSuspendUntil,
    };
  } catch (error) {
    logger.messageFlow.error(
      "facebook",
      fbId,
      "contact-creation",
      error,
      {}
    );

    // Fallback: create basic contact
    try {
      const contact = await getOrCreateContact(fbId, company._id, "facebook", {});
      return {
        _id: contact._id,
        chat_id: fbId,
        full_name: "Facebook User",
        phone_number: "",
        company_id: contact.companyId,
        bot_suspended: contact.botSuspended,
        bot_suspend_until: contact.botSuspendUntil,
      };
    } catch (createError) {
      logger.messageFlow.error(
        "facebook",
        fbId,
        "contact-fallback-creation",
        createError,
        {}
      );
      return null;
    }
  }
}

/**
 * Send message to Facebook and save to database
 */
async function sendMessage(recipientId, messageText, accessToken, customer, company) {
  try {
    logger.messageFlow.processing(
      "facebook",
      null,
      recipientId,
      "sending",
      "Sending message to recipient",
      { message_length: messageText?.length || 0 }
    );

    const signaturedMessage = messageText + BOT_SIGNATURE;

    const response = await facebookMsgSender(
      recipientId,
      signaturedMessage,
      accessToken
    );

    logger.messageFlow.outgoing(
      "facebook",
      response.message_id,
      recipientId,
      recipientId,
      "Message sent successfully",
      { message_length: signaturedMessage?.length || 0 }
    );

    // Save to database
    const externalMsgId = response.message_id || recipientId;
    await saveMessage(
      customer._id,
      company._id,
      signaturedMessage,
      "outbound",
      externalMsgId
    );

    return response;
  } catch (sendError) {
    logger.messageFlow.error(
      "facebook",
      recipientId,
      "send-message",
      sendError,
      { recipient_id: recipientId }
    );

    // Handle token errors
    const errorCode = sendError?.response?.data?.error?.code;
    const errorSubcode = sendError?.response?.data?.error?.error_subcode;

    if (errorCode === TOKEN_EXPIRED) {
      logger.messageFlow.error(
        "facebook",
        recipientId,
        "token-error",
        new Error(`Token error: code ${errorCode}, subcode ${errorSubcode}`),
        { company_id: company._id }
      );

      // Auto-disable bot on token expiration
      if (TOKEN_EXPIRATION_SUBCODES.includes(errorSubcode)) {
        await setBotActive(company._id, false);
        logger.messageFlow.info(
          "facebook",
          recipientId,
          "bot-disabled",
          "Bot auto-disabled due to token error"
        );
      }
    } else if (RATE_LIMIT.includes(errorCode)) {
      // FIXED: Issue #9 - Rate limits are company-wide, not per-contact
      // Facebook rate limits apply to the page token, affecting ALL customers
      logger.messageFlow.error(
        "facebook",
        recipientId,
        "rate-limited",
        new Error(`Facebook rate limit hit (code: ${errorCode}) - disabling bot company-wide`),
        { company_id: company._id }
      );

      // Disable bot for entire company, not just this contact
      await setBotActive(company._id, false);

      logger.messageFlow.info(
        "facebook",
        recipientId,
        "bot-disabled-rate-limit",
        "Bot auto-disabled company-wide due to Facebook rate limit. Manual re-enable required after rate limit window passes."
      );
    }

    return null;
  }
}

/**
 * Check if bot can respond to this contact
 */
async function canBotRespond(customer, company) {
  const { bot_suspended, bot_suspend_until, chat_id } = customer;

  // Check manual suspension
  if (bot_suspended) {
    logger.messageFlow.info(
      "facebook",
      chat_id,
      "bot-suspended",
      "Bot manually suspended for this contact"
    );
    return false;
  }

  // Check auto-suspension
  if (bot_suspend_until) {
    const suspendDate = new Date(bot_suspend_until);
    const now = new Date();

    if (now < suspendDate) {
      logger.messageFlow.info(
        "facebook",
        chat_id,
        "bot-auto-suspended",
        `Bot auto-suspended until ${bot_suspend_until}`
      );
      return false;
    } else {
      // Auto-suspension expired, clear it
      try {
        await updateContactBotSuspension(customer._id, undefined, null);
        logger.messageFlow.info(
          "facebook",
          chat_id,
          "suspension-cleared",
          "Auto-suspension expired and cleared"
        );
      } catch (error) {
        logger.messageFlow.error(
          "facebook",
          chat_id,
          "clear-suspension",
          error,
          {}
        );
        return false;
      }
    }
  }

  // Check if bot is active for company
  if (!company.bot_active) {
    logger.messageFlow.info(
      "facebook",
      chat_id,
      "bot-inactive",
      "Bot is not active for this company"
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
  const { bot_active_interval } = company;
  if (bot_active_interval?.interval_active) {
    const { start_time, end_time, timezone: intervalTimezone } = bot_active_interval;
    const tz = intervalTimezone || company.timezone || "UTC";
    const currentTime = moment(getCurrentTimeInRegion(tz), "HH:mm");
    const start = moment(start_time, "HH:mm");
    const end = moment(end_time, "HH:mm");

    if (!isWithinActiveInterval(currentTime, start, end)) {
      logger.messageFlow.info(
        "facebook",
        chat_id,
        "outside-interval",
        "Outside bot active interval (bot will not respond)",
        { current_time: currentTime.format("HH:mm"), start_time, end_time }
      );
      return false;
    }
  }

  // Note: working_hours validation happens in tools (e.g., book_appointment)
  // Bot can still answer questions outside business hours
  return true;
}

/**
 * Process image attachment
 */
async function describeImage(imageUrl, openaiApiKey) {
  try {
    logger.messageFlow.processing(
      "facebook",
      null,
      null,
      "image-processing",
      "Processing image with vision model",
      { url: imageUrl }
    );

    const imageDescription = await imageInputLLM(openaiApiKey, imageUrl);

    logger.messageFlow.processing(
      "facebook",
      null,
      null,
      "image-processed",
      "Image processed successfully"
    );

    return `Customer sent an image: ${imageDescription}`;
  } catch (error) {
    logger.messageFlow.error(
      "facebook",
      null,
      "image-processing",
      error,
      { url: imageUrl }
    );
    return "Customer sent an image but I couldn't process it.";
  }
}

/**
 * Process customer message with AI (LangGraph)
 */
async function processWithAI(customer, company, bufferedText = "", imageDescription = null, bufferedMessageCount = 0) {
  const { chat_id: customerFbId, _id: customerId } = customer;
  const { fb_page_access_token, openai_api_key } = company;

  try {
    logger.messageFlow.processing(
      "facebook",
      null,
      customerFbId,
      "ai-processing-start",
      "Starting AI processing with LangGraph",
      {
        has_buffered_text: !!bufferedText,
        buffered_text_length: bufferedText?.length || 0,
        buffered_message_count: bufferedMessageCount
      }
    );

    // Get conversation history
    const recentMessages = await getMessagesByCustomer({
      customerId,
      platform: "facebook",
      limit: MAX_MESSAGE_HISTORY,
      skip: 0,
    });

    logger.messageFlow.processing(
      "facebook",
      null,
      customerFbId,
      "history-loaded",
      "Conversation history loaded",
      { message_count: recentMessages.length }
    );

    // Format messages for LangGraph
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
      // They were just saved individually but we're sending them combined
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
        "facebook",
        null,
        customerFbId,
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
      await callTypingAPI(customerFbId, "mark_seen", fb_page_access_token);
    } catch (e) {
      // Ignore typing indicator errors
    }

    // Get system instructions
    const system_instructions = await getCollectedSystemInstructions(company);

    logger.messageFlow.processing(
      "facebook",
      null,
      customerFbId,
      "langgraph-invoke",
      "Invoking LangGraph",
      {
        history_length: formattedMessages.length,
        final_message_length: finalUserMessage.length
      }
    );

    // Process with LangGraph
    const langGraphResult = await processMessageWithLangGraph({
      chatId: customerFbId,
      platform: "facebook",
      message: finalUserMessage,
      companyId: company._id,
      systemInstructions: system_instructions,
      timezone: company.timezone,
      aiProvider: company.ai_provider,
      openaiApiKey: company.openai_api_key,
      geminiApiKey: company.gemini_api_key,
      escalationConfig: company.escalation_config,
      workingHours: company.working_hours || [],
      conversationHistory: formattedMessages,
    });

    logger.messageFlow.processing(
      "facebook",
      null,
      customerFbId,
      "langgraph-complete",
      "LangGraph processing complete",
      { has_response: !!langGraphResult.assistantMessage }
    );

    // Send response if available
    if (langGraphResult.assistantMessage) {
      await sendMessage(
        customerFbId,
        langGraphResult.assistantMessage,
        fb_page_access_token,
        customer,
        company
      );
    } else {
      logger.messageFlow.warning(
        "facebook",
        null,
        customerFbId,
        "no-response",
        "LangGraph returned no response"
      );
    }
  } catch (error) {
    logger.messageFlow.error(
      "facebook",
      customerFbId,
      "ai-processing",
      error,
      {}
    );

    // Check for token expiration
    const code = error?.code || error?.response?.data?.error?.code;
    const sub = error?.error_subcode || error?.response?.data?.error?.error_subcode;

    if (code === TOKEN_EXPIRED && TOKEN_EXPIRATION_SUBCODES.includes(sub)) {
      logger.messageFlow.error(
        "facebook",
        customerFbId,
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
 * Handle echo message (admin reply)
 */
async function handleEchoMessage(webhookEvent, company) {
  const recipientFbId = webhookEvent.recipient?.id;
  const msgText = webhookEvent.message?.text || "";
  const externalMsgId = webhookEvent?.message?.mid || recipientFbId;

  logger.messageFlow.incoming(
    "facebook",
    externalMsgId,
    recipientFbId,
    company._id,
    "Received echo message (admin reply)",
    { has_signature: msgText.endsWith(BOT_SIGNATURE) }
  );

  // Skip bot messages (they're already saved)
  if (msgText.endsWith(BOT_SIGNATURE)) {
    logger.messageFlow.processing(
      "facebook",
      externalMsgId,
      recipientFbId,
      "echo-skip",
      "Skipping echo of bot message (already saved)"
    );
    return;
  }

  // This is a real admin/human message
  logger.messageFlow.processing(
    "facebook",
    externalMsgId,
    recipientFbId,
    "admin-message",
    "Processing admin/human message"
  );

  // Get or create customer
  const customer = await getOrCreateFacebookContact(recipientFbId, company);
  if (!customer) {
    logger.messageFlow.error(
      "facebook",
      recipientFbId,
      "admin-message-no-contact",
      new Error("Could not create contact for admin message"),
      {}
    );
    return;
  }

  // FIXED: Issue #11 - Check for special commands before auto-suspending
  // Allow admin to control bot behavior with special messages
  const lowerMsg = msgText.toLowerCase().trim();

  // Command: /resume - Clear bot suspension immediately
  if (lowerMsg === '/resume' || lowerMsg === '/resume bot' || lowerMsg === '/enable bot') {
    try {
      await updateContactBotSuspension(customer._id, undefined, null);

      logger.messageFlow.info(
        "facebook",
        externalMsgId,
        "bot-suspension-cleared",
        "Admin cleared bot suspension with /resume command"
      );

      // Don't save the command message
      return;
    } catch (error) {
      logger.messageFlow.error(
        "facebook",
        recipientFbId,
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
      "facebook",
      externalMsgId,
      "bot-auto-suspended",
      `Bot auto-suspended until ${suspensionDate.toISOString()} (${BOT_SUSPENSION_DAYS} days) due to admin reply. Use /resume to re-enable.`
    );
  } catch (error) {
    logger.messageFlow.error(
      "facebook",
      recipientFbId,
      "suspend-bot",
      error,
      {}
    );
  }
}

/**
 * Handle customer message
 */
async function handleUserMessage(webhookEvent, company) {
  const senderFbId = webhookEvent.sender?.id;
  const incomingText = webhookEvent.message?.text;
  const incomingAttachments = webhookEvent.message?.attachments;
  const externalMessageId = webhookEvent?.message?.mid || senderFbId;

  // Validate sender
  if (!senderFbId) {
    logger.messageFlow.error(
      "facebook",
      null,
      "missing-sender",
      new Error("Missing sender ID in webhook event"),
      {}
    );
    return;
  }

  // Validate content
  if (!incomingText && !incomingAttachments) {
    logger.messageFlow.processing(
      "facebook",
      externalMessageId,
      senderFbId,
      "no-content",
      "No message content to process"
    );
    return;
  }

  logger.messageFlow.incoming(
    "facebook",
    externalMessageId,
    senderFbId,
    company._id,
    "Received user message",
    {
      has_text: !!incomingText,
      text_length: incomingText?.length || 0,
      attachments_count: incomingAttachments?.length || 0,
    }
  );

  // FIXED: Issue #7 - Check for duplicate but don't mark as processed yet
  // Only mark as processed after successful handling to allow retries on failure
  if (duplicateDetector.isDuplicate(externalMessageId)) {
    // Duplicate detector already logs, no need to log again
    return;
  }

  // Get or create customer
  const customer = await getOrCreateFacebookContact(senderFbId, company);
  if (!customer) {
    logger.messageFlow.error(
      "facebook",
      senderFbId,
      "customer-creation-failed",
      new Error("Could not create customer"),
      {}
    );
    // FIXED: Don't mark as processed on error - allow retry
    return;
  }

  // Process attachments
  const attachments = [];
  if (Array.isArray(incomingAttachments) && incomingAttachments.length > 0) {
    const attachmentsToProcess = incomingAttachments.slice(0, MAX_ATTACHMENTS);

    if (incomingAttachments.length > MAX_ATTACHMENTS) {
      logger.messageFlow.warning(
        "facebook",
        externalMessageId,
        senderFbId,
        "too-many-attachments",
        `Message has ${incomingAttachments.length} attachments, processing only ${MAX_ATTACHMENTS}`
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
        } catch (urlError) {
          logger.messageFlow.warning(
            "facebook",
            externalMessageId,
            senderFbId,
            "invalid-attachment-url",
            `Invalid attachment URL: ${attachment.payload.url}`
          );
        }
      }
    }
  }

  // Save incoming message
  await saveMessage(
    customer._id,
    company._id,
    incomingText || "",
    "inbound",
    externalMessageId,
    attachments
  );

  // FIXED: Issue #7 - Mark as processed AFTER successful save
  // This ensures retries work if save fails
  duplicateDetector.add(externalMessageId);

  logger.messageFlow.processing(
    "facebook",
    externalMessageId,
    senderFbId,
    "message-marked-processed",
    "Message saved and marked as processed"
  );

  // Check if bot can respond
  if (!(await canBotRespond(customer, company))) {
    return;
  }

  // Determine delay based on company settings and message content
  const isSentenceEnd = /[.!?…]\s*$/.test(incomingText || "");
  let standardDelay = company.bot?.responseDelay?.standard || config.bot.responseDelayMs || DEFAULT_RESPONSE_DELAY_MS;

  // Safeguard: ensure delay is at least 1000ms (values less than 1000 are likely config errors)
  if (standardDelay < 1000) {
    logger.messageFlow.warning(
      "facebook",
      externalMessageId,
      senderFbId,
      "delay-too-small",
      `Response delay (${standardDelay}ms) too small, using default (${config.bot.responseDelayMs}ms)`,
      { configured_delay: standardDelay }
    );
    standardDelay = config.bot.responseDelayMs || DEFAULT_RESPONSE_DELAY_MS;
  }

  const sentenceEndDelay = company.bot?.responseDelay?.sentenceEnd || Math.floor(standardDelay / 4);
  const delayMs = isSentenceEnd ? sentenceEndDelay : standardDelay;

  logger.messageFlow.processing(
    "facebook",
    externalMessageId,
    senderFbId,
    "buffering",
    `Buffering message (${delayMs}ms delay)`,
    { is_sentence_end: isSentenceEnd, delay_type: isSentenceEnd ? 'sentence_end' : 'standard' }
  );

  // Get image URL if present
  const imageUrl = Array.isArray(incomingAttachments) && incomingAttachments[0]?.payload?.url
    ? incomingAttachments[0].payload.url
    : null;

  // Add message to buffer - it will accumulate text and images
  messageBuffer.addMessage(senderFbId, {
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
            "facebook",
            null,
            senderFbId,
            "images-processed",
            `Processed ${imageUrls.length} image(s) from buffered messages`
          );
        }

        // Process with AI using the combined text from buffer
        // Pass messageCount so processWithAI knows how many messages to remove from history
        await processWithAI(bufferedCustomer, bufferedCompany, combinedText, imageDescription, messageCount);
      } catch (err) {
        logger.messageFlow.error(
          "facebook",
          senderFbId,
          "buffered-processing",
          err,
          {}
        );
      }
    },
  });
}

/**
 * Main webhook handler for Facebook Messenger
 */
export async function handlerFacebook(req, res) {
  try {
    const { body } = req;

    logger.messageFlow.incoming(
      "facebook",
      null,
      null,
      null,
      "Received webhook",
      { object: body?.object }
    );

    // Validate payload structure
    if (!body || !body.entry || !Array.isArray(body.entry)) {
      logger.messageFlow.error(
        "facebook",
        null,
        "invalid-payload",
        new Error("Invalid webhook payload structure"),
        {}
      );
      return res.status(400).send("Invalid payload");
    }

    // Respond immediately (Facebook requires quick response)
    res.status(200).send("EVENT_RECEIVED");

    // Validate it's a Facebook page event
    if (body.object !== "page") {
      logger.messageFlow.warning(
        "facebook",
        null,
        null,
        "non-facebook-webhook",
        `Received non-Facebook webhook: ${body.object}`
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

        totalEventsProcessed++;

        try {
          // Handle echo messages (admin replies)
          if (webhookEvent.message?.is_echo) {
            const recipientFbId = webhookEvent.recipient?.id;

            const company = await getCompanyByFb(recipientFbId);
            if (!company) {
              logger.messageFlow.error(
                "facebook",
                recipientFbId,
                "company-not-found",
                new Error(`Company not found for recipient: ${recipientFbId}`),
                {}
              );
              continue;
            }

            await handleEchoMessage(webhookEvent, company);
            continue;
          }

          // Handle customer messages
          const recipientFbId = webhookEvent.recipient?.id;
          const senderFbId = webhookEvent.sender?.id;

          // Debug webhook structure
          logger.messageFlow.processing(
            "facebook",
            null,
            null,
            "webhook-debug",
            "Webhook event details",
            {
              recipient_id: recipientFbId,
              sender_id: senderFbId,
              has_message: !!webhookEvent.message,
              is_echo: webhookEvent.message?.is_echo
            }
          );

          const company = await getCompanyByFb(recipientFbId);
          if (!company) {
            logger.messageFlow.error(
              "facebook",
              recipientFbId,
              "company-not-found",
              new Error(`Company not found for recipient: ${recipientFbId}`),
              {
                recipient_id: recipientFbId,
                sender_id: senderFbId
              }
            );
            continue;
          }

          await handleUserMessage(webhookEvent, company);
        } catch (eventError) {
          logger.messageFlow.error(
            "facebook",
            webhookEvent?.sender?.id,
            "event-processing-error",
            eventError,
            {
              recipient_id: webhookEvent?.recipient?.id,
              sender_id: webhookEvent?.sender?.id
            }
          );

          // Clean up buffer on error for this specific event
          const senderFbId = webhookEvent?.sender?.id;
          if (senderFbId) {
            messageBuffer.cancel(senderFbId);
          }
        }
      }
    }

    // Log batch processing statistics
    if (totalEventsProcessed > 1) {
      logger.messageFlow.processing(
        "facebook",
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
        "facebook",
        null,
        null,
        "no-messaging-event",
        "No messaging events in webhook"
      );
    }
  } catch (error) {
    logger.messageFlow.error(
      "facebook",
      null,
      "handler-error",
      error,
      {}
    );

    // Clean up buffer on error
    const senderFbId = req?.body?.entry?.[0]?.messaging?.[0]?.sender?.id;
    if (senderFbId) {
      messageBuffer.cancel(senderFbId);
    }
  }
}
