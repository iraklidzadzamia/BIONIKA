import express from "express";
import cors from "cors";
import { config } from "./config/env.js";
import { connectDB, disconnectDB } from "./config/database.js";
import operatorRoute from "./routes/operatorBot.routes.js";
import testRoute from "./routes/test.routes.js";
import {
  verifyFacebookWebhook,
  verifyInstagramWebhook,
} from "./utils/webhookVerifier.js";
import logger from "./utils/logger.js";

// Init app
const app = express();
const PORT = config.port;
const VERIFY_TOKEN = config.security.verifyToken;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    // Check database connectivity
    const mongoose = await import("mongoose");
    const dbStatus = mongoose.default.connection.readyState;
    const dbStatusMap = {
      0: "disconnected",
      1: "connected",
      2: "connecting",
      3: "disconnecting",
    };

    const checks = {
      database: dbStatusMap[dbStatus] || "unknown",
      openai: config.openai.apiKey ? "configured" : "not_configured",
      gemini: config.gemini.apiKey ? "configured" : "not_configured",
    };

    const isHealthy = checks.database === "connected";

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? "healthy" : "degraded",
      service: "Meta Bot Server",
      timestamp: new Date().toISOString(),
      checks,
      endpoints: {
        facebook: `/chat/facebook`,
        instagram: `/chat/instagram`,
        manualFacebook: `/chat/manual-facebook`,
        manualInstagram: `/chat/manual-instagram`,
      },
    });
  } catch (error) {
    logger.error("Health check failed", { error: error.message });
    res.status(503).json({
      status: "unhealthy",
      service: "Meta Bot Server",
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

// Routes
app.use("/chat", operatorRoute);

// Test endpoints (only in development/test)
if (config.isDevelopment || config.isTest) {
  app.use("/test", testRoute);
  logger.info("✅ Test endpoints enabled at /test/* (Development/Test mode)");
} else {
  logger.info("🔒 Test endpoints disabled (Production mode)");
}

// Webhook Verification
app.get("/chat/facebook", (req, res) =>
  verifyFacebookWebhook(req, res, VERIFY_TOKEN)
);
app.get("/chat/instagram", (req, res) =>
  verifyInstagramWebhook(req, res, VERIFY_TOKEN)
);

// Start server after DB connects
const startServer = async () => {
  try {
    // Connect to MongoDB (same database as main backend)
    await connectDB();
    console.log("✅ Connected to MongoDB");

    // Start server
    const server = app.listen(PORT, () => {
      console.log(`🚀 Meta Bot Server running on port ${PORT}`);
      console.log(
        `📱 Facebook webhook: http://localhost:${PORT}/chat/facebook`
      );
      console.log(
        `📸 Instagram webhook: http://localhost:${PORT}/chat/instagram`
      );
      console.log(`💬 Chat API: http://localhost:${PORT}/chat`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);
    });

    // Graceful shutdown
    const gracefulShutdown = (signal) => {
      console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

      server.close(async () => {
        console.log("✅ HTTP server closed");

        try {
          // Close database connection
          await disconnectDB();
          console.log("✅ Database connection closed");
          process.exit(0);
        } catch (error) {
          console.error("❌ Error during shutdown:", error);
          process.exit(1);
        }
      });

      // Force close after 30 seconds
      setTimeout(() => {
        console.error("⏰ Forced shutdown after timeout");
        process.exit(1);
      }, 30000);
    };

    // Handle shutdown signals
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

    // Handle uncaught exceptions
    process.on("uncaughtException", (error) => {
      console.error("❌ Uncaught Exception:", error);
      process.exit(1);
    });

    process.on("unhandledRejection", (reason, promise) => {
      console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
      process.exit(1);
    });
  } catch (error) {
    console.error("❌ Failed to start Meta Bot server:", error);
    process.exit(1);
  }
};

startServer();
