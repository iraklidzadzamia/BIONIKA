/**
 * Test Routes
 * These endpoints are only available in development/test environments
 *
 * IMPORTANT: Never expose these in production!
 */

import { Router } from "express";
import { config } from "../config/env.js";
import logger from "../utils/logger.js";
import { getCompanyByFb } from "../services/company.service.js";

const router = Router();

/**
 * Test endpoint to verify webhook setup
 * GET /test/webhook
 */
router.get("/webhook", (req, res) => {
  const VERIFY_TOKEN = config.security.verifyToken;

  res.json({
    message: "Webhook test endpoint",
    verifyToken: VERIFY_TOKEN ? "✅ Set" : "❌ Missing",
    timestamp: new Date().toISOString(),
    testUrl: `/chat/facebook?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=test123`,
  });
});

/**
 * Test company lookup endpoint
 * GET /test/company-lookup?fbPageId=<id>
 */
router.get("/company-lookup", async (req, res) => {
  const fbPageId = req.query.fbPageId || "602445226293374";

  try {
    logger.messageFlow.processing(
      "test",
      null,
      null,
      "company-lookup-test",
      `Testing company lookup for FB Page ID: ${fbPageId}`
    );

    const company = await getCompanyByFb(fbPageId);

    if (company) {
      logger.messageFlow.processing(
        "test",
        null,
        null,
        "company-lookup-success",
        `Company found: ${company.name}`,
        { company_id: company._id, bot_active: company.bot_active }
      );

      return res.json({
        success: true,
        message: "Company found",
        company: {
          id: company._id,
          name: company.name,
          bot_active: company.bot_active,
          fb_chat_id: company.fb_chat_id,
        },
      });
    } else {
      logger.messageFlow.warning(
        "test",
        null,
        null,
        "company-lookup-failed",
        `Company NOT found for FB Page ID: ${fbPageId}`
      );

      return res.json({
        success: false,
        message: `Company not found for Facebook Page ID: ${fbPageId}`,
        suggestion: "Check that CompanyIntegration has facebookChatId set correctly",
      });
    }
  } catch (error) {
    logger.messageFlow.error("test", null, "company-lookup-error", error, {
      fbPageId,
    });

    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
    });
  }
});

/**
 * Test logging endpoint - generates sample logs to verify logging is working
 * GET /test/logs
 */
router.get("/logs", (req, res) => {
  const testSenderId = "test_user_12345";
  const testMessageId = "test_msg_67890";

  // Generate various types of logs
  logger.messageFlow.incoming(
    "instagram",
    testMessageId,
    testSenderId,
    "test_company",
    "Test incoming message log",
    { test: true, environment: config.env }
  );

  logger.messageFlow.processing(
    "instagram",
    testMessageId,
    testSenderId,
    "test-action",
    "Test processing log",
    { step: 1 }
  );

  logger.messageFlow.llm(
    "instagram",
    testSenderId,
    "test-llm-action",
    "Test LLM log",
    { model: "gpt-4" }
  );

  logger.messageFlow.outgoing(
    "instagram",
    testMessageId,
    testSenderId,
    testSenderId,
    "Test outgoing message log",
    { test: true }
  );

  logger.messageFlow.warning(
    "instagram",
    testMessageId,
    testSenderId,
    "test-warning",
    "Test warning log",
    { warning_type: "test" }
  );

  logger.messageFlow.error(
    "instagram",
    testSenderId,
    "test-error",
    new Error("Test error log"),
    { error_type: "test" }
  );

  res.json({
    success: true,
    message: "Test logs generated successfully!",
    logsGenerated: 6,
    types: ["incoming", "processing", "llm", "outgoing", "warning", "error"],
    tip: "Check logs with: docker-compose logs -f meta-bot OR docker exec -it petbuddy-meta-bot tail -f /app/packages/meta-bot/logs/message-flow.log",
    timestamp: new Date().toISOString(),
  });
});

export default router;
