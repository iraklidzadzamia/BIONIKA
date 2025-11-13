import { facebookMsgSender } from "../middlewares/facebookMsgSender.js";
import { config } from "../config/env.js";
import logger from "../utils/logger.js";

/**
 * Handle manual Facebook message sending from main backend
 * This is called when operators send messages through the frontend
 */
export async function handlerManualFbSend(req, res) {
  logger.messageFlow.incoming(
    "facebook",
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
        "facebook",
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

    // Send the message via Facebook Graph API
    // No need to lookup customer - main backend already validated everything
    const result = await facebookMsgSender(
      customer_social_id,
      content,
      access_token
    );

    logger.messageFlow.outgoing(
      "facebook",
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
      "facebook",
      customer_social_id,
      "manual-send-failed",
      error,
      { customer_id, company_id }
    );
    res.status(500).json({
      success: false,
      error: "Error in manual Facebook message send",
      details: error.message,
    });
  }
}

/**
 * Send message to admin via Facebook
 */
export async function sendMessageToAdmin(req, res) {
  logger.messageFlow.processing(
    "facebook",
    null,
    null,
    "admin-message-request",
    "Admin message request received",
    { message_length: req.body.message?.length || 0 }
  );

  try {
    const { message } = req.body;
    const message_tag = "ACCOUNT_UPDATE";
    const access_token = config.facebook.adminPageAccessToken;
    const admin_chat_id = config.facebook.adminChatId;

    if (!access_token || !admin_chat_id) {
      logger.messageFlow.error(
        "facebook",
        null,
        "admin-credentials-missing",
        new Error("Admin Facebook credentials not configured"),
        {}
      );
      return res.status(500).json({
        success: false,
        error: "Admin Facebook credentials not configured",
      });
    }

    if (!message) {
      logger.messageFlow.warning(
        "facebook",
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
    const result = await facebookMsgSender(
      admin_chat_id,
      message,
      access_token,
      message_tag
    );

    logger.messageFlow.outgoing(
      "facebook",
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
      "facebook",
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
