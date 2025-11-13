import { instagramMsgSender } from "../middlewares/instagramMsgSender.js";
import { config } from "../config/env.js";
import logger from "../utils/logger.js";

/**
 * Handle manual Instagram message sending from main backend
 * This is called when operators send messages through the frontend
 */
export async function handlerManualInstagramSend(req, res) {
  logger.messageFlow.incoming(
    "instagram",
    null,
    req.body.customer_social_id,
    req.body.company_id,
    "Manual message send request received",
    { content_length: req.body.content?.length || 0 }
  );

  try {
    const {
      company_id,
      customer_id,
      platform,
      content,
      external_message_id,
      access_token,
      customer_social_id,
    } = req.body;

    // Validate required fields
    if (!content || !access_token || !customer_social_id) {
      logger.messageFlow.warning(
        "instagram",
        null,
        customer_social_id,
        "manual-send-validation-failed",
        "Missing required fields",
        { has_content: !!content, has_token: !!access_token, has_social_id: !!customer_social_id }
      );
      return res.status(400).json({
        success: false,
        error:
          "Missing required fields: content, access_token, or customer_social_id",
      });
    }

    // Send the message via Instagram Graph API
    // No need to lookup customer - main backend already validated everything
    const result = await instagramMsgSender(
      customer_social_id,
      content,
      access_token
    );

    logger.messageFlow.outgoing(
      "instagram",
      result.message_id,
      customer_id,
      customer_social_id,
      "Manual message sent successfully",
      { content_length: content.length }
    );

    return res.status(200).json({
      success: true,
      message: "MESSAGE_SENT",
      result: result,
    });
  } catch (error) {
    logger.messageFlow.error(
      "instagram",
      req.body.customer_social_id,
      "manual-send-failed",
      error,
      { customer_id: req.body.customer_id, company_id: req.body.company_id }
    );
    res.status(500).json({
      success: false,
      error: "Error in manual Instagram message send",
      details: error.message,
    });
  }
}

/**
 * Send message to admin via Instagram
 */
export async function sendMessageToAdmin(req, res) {
  logger.messageFlow.processing(
    "instagram",
    null,
    null,
    "admin-message-request",
    "Admin message request received",
    { message_length: req.body.message?.length || 0 }
  );

  try {
    const { message } = req.body;
    const message_tag = "ACCOUNT_UPDATE";
    const access_token = config.instagram.adminAccessToken;
    const admin_chat_id = config.instagram.adminChatId;

    if (!access_token || !admin_chat_id) {
      logger.messageFlow.error(
        "instagram",
        null,
        "admin-credentials-missing",
        new Error("Admin Instagram credentials not configured"),
        {}
      );
      return res.status(500).json({
        success: false,
        error: "Admin Instagram credentials not configured",
      });
    }

    if (!message) {
      logger.messageFlow.warning(
        "instagram",
        null,
        null,
        "admin-message-empty",
        "Message content is required"
      );
      return res.status(400).json({
        success: false,
        error: "Message content is required",
      });
    }

    // Send message to admin
    const result = await instagramMsgSender(
      admin_chat_id,
      message,
      access_token
    );

    logger.messageFlow.outgoing(
      "instagram",
      result.message_id,
      null,
      admin_chat_id,
      "Admin message sent successfully"
    );

    return res.status(200).json({
      success: true,
      message: "MESSAGE_SENT",
      result: result,
    });
  } catch (error) {
    logger.messageFlow.error(
      "instagram",
      null,
      "admin-message-send-failed",
      error,
      {}
    );
    res.status(500).json({
      success: false,
      error: "Error sending admin message",
      details: error.message,
    });
  }
}
