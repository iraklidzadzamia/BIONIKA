import mongoose from "mongoose";
import logger from "./logger.js";

/**
 * Tool Metrics Tracker
 *
 * Tracks tool execution metrics for monitoring and analytics:
 * - Execution time
 * - Success/failure rates
 * - Tool usage patterns
 * - Error types
 */

class MetricsTracker {
  constructor() {
    this.metricsBuffer = [];
    this.BUFFER_SIZE = 10;
    this.FLUSH_INTERVAL = 30000; // 30 seconds

    // Start periodic flush
    this.startPeriodicFlush();
  }

  /**
   * Track a tool execution
   */
  async trackToolExecution({
    toolName,
    success,
    executionTime,
    platform,
    chatId,
    companyId,
    errorMessage = null,
    errorType = null,
  }) {
    const metric = {
      tool_name: toolName,
      success,
      execution_time_ms: executionTime,
      platform,
      chat_id: chatId,
      company_id: companyId,
      error_message: errorMessage,
      error_type: errorType,
      timestamp: new Date(),
    };

    this.metricsBuffer.push(metric);

    // Log to console for immediate feedback
    const status = success ? "✅" : "❌";
    logger.messageFlow.info(
      platform,
      chatId,
      "tool-metrics",
      `${status} ${toolName} - ${executionTime}ms`
    );

    // Flush if buffer is full
    if (this.metricsBuffer.length >= this.BUFFER_SIZE) {
      await this.flush();
    }
  }

  /**
   * Track agent node execution
   */
  async trackAgentExecution({
    platform,
    chatId,
    companyId,
    messageCount,
    toolCallsCount,
    executionTime,
    success,
    errorMessage = null,
  }) {
    const metric = {
      type: "agent_execution",
      platform,
      chat_id: chatId,
      company_id: companyId,
      message_count: messageCount,
      tool_calls_count: toolCallsCount,
      execution_time_ms: executionTime,
      success,
      error_message: errorMessage,
      timestamp: new Date(),
    };

    this.metricsBuffer.push(metric);

    if (this.metricsBuffer.length >= this.BUFFER_SIZE) {
      await this.flush();
    }
  }

  /**
   * Flush metrics to database
   */
  async flush() {
    if (this.metricsBuffer.length === 0) {
      return;
    }

    const metricsToFlush = [...this.metricsBuffer];
    this.metricsBuffer = [];

    try {
      // Check if mongoose is connected
      if (mongoose.connection.readyState !== 1) {
        logger.messageFlow.info(
          "system",
          "metrics",
          "metrics-flush",
          "MongoDB not connected, skipping metrics flush"
        );
        // Keep metrics in buffer for next flush
        this.metricsBuffer = [...metricsToFlush, ...this.metricsBuffer];
        return;
      }

      const collection = mongoose.connection.collection("tool_metrics");
      await collection.insertMany(metricsToFlush);

      logger.messageFlow.info(
        "system",
        "metrics",
        "metrics-flush",
        `Flushed ${metricsToFlush.length} metrics to database`
      );
    } catch (error) {
      logger.messageFlow.error(
        "system",
        "metrics",
        "metrics-flush-error",
        error
      );

      // Put metrics back in buffer to retry
      this.metricsBuffer = [...metricsToFlush, ...this.metricsBuffer];
    }
  }

  /**
   * Start periodic flush
   */
  startPeriodicFlush() {
    setInterval(async () => {
      await this.flush();
    }, this.FLUSH_INTERVAL);
  }

  /**
   * Get metrics summary (for dashboard)
   */
  async getSummary({ companyId, startDate, endDate }) {
    try {
      if (mongoose.connection.readyState !== 1) {
        logger.messageFlow.info("system", "metrics", "summary", "MongoDB not connected");
        return [];
      }

      const collection = mongoose.connection.collection("tool_metrics");

      const query = {
        company_id: companyId,
        timestamp: {
          $gte: startDate || new Date(Date.now() - 24 * 60 * 60 * 1000), // Default: last 24h
          $lte: endDate || new Date(),
        },
      };

      // Aggregate metrics
      const summary = await collection
        .aggregate([
          { $match: query },
          {
            $group: {
              _id: "$tool_name",
              total_calls: { $sum: 1 },
              successful_calls: {
                $sum: { $cond: ["$success", 1, 0] },
              },
              failed_calls: {
                $sum: { $cond: ["$success", 0, 1] },
              },
              avg_execution_time: { $avg: "$execution_time_ms" },
              max_execution_time: { $max: "$execution_time_ms" },
              min_execution_time: { $min: "$execution_time_ms" },
            },
          },
          {
            $project: {
              tool_name: "$_id",
              total_calls: 1,
              successful_calls: 1,
              failed_calls: 1,
              success_rate: {
                $multiply: [
                  { $divide: ["$successful_calls", "$total_calls"] },
                  100,
                ],
              },
              avg_execution_time: { $round: ["$avg_execution_time", 2] },
              max_execution_time: 1,
              min_execution_time: 1,
            },
          },
          { $sort: { total_calls: -1 } },
        ])
        .toArray();

      return summary;
    } catch (error) {
      logger.messageFlow.error("system", "metrics", "summary-error", error);
      return [];
    }
  }

  /**
   * Get error breakdown
   */
  async getErrorBreakdown({ companyId, startDate, endDate }) {
    try {
      if (mongoose.connection.readyState !== 1) {
        logger.messageFlow.info("system", "metrics", "error-breakdown", "MongoDB not connected");
        return [];
      }

      const collection = mongoose.connection.collection("tool_metrics");

      const query = {
        company_id: companyId,
        success: false,
        timestamp: {
          $gte: startDate || new Date(Date.now() - 24 * 60 * 60 * 1000),
          $lte: endDate || new Date(),
        },
      };

      const errors = await collection
        .aggregate([
          { $match: query },
          {
            $group: {
              _id: {
                tool_name: "$tool_name",
                error_type: "$error_type",
              },
              count: { $sum: 1 },
              sample_error: { $first: "$error_message" },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 20 },
        ])
        .toArray();

      return errors;
    } catch (error) {
      logger.messageFlow.error(
        "system",
        "metrics",
        "error-breakdown-error",
        error
      );
      return [];
    }
  }
}

// Singleton instance
const metricsTracker = new MetricsTracker();

export default metricsTracker;
