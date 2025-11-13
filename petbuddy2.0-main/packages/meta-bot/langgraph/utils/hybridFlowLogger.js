import logger from "../../utils/logger.js";

/**
 * Hybrid Flow Logger
 * 
 * Tracks and logs transitions in the hybrid AI flow (Gemini ↔ OpenAI)
 */

export class HybridFlowLogger {
  constructor(platform, chatId) {
    this.platform = platform;
    this.chatId = chatId;
    this.transitions = [];
    this.startTime = Date.now();
  }

  /**
   * Log a transition in the hybrid flow
   * @param {string} from - Source node (e.g., "gemini", "openai", "execute_tools")
   * @param {string} to - Target node
   * @param {string} reason - Reason for transition
   * @param {Object} metadata - Additional metadata
   */
  logTransition(from, to, reason, metadata = {}) {
    const transition = {
      from,
      to,
      reason,
      timestamp: Date.now(),
      elapsed: Date.now() - this.startTime,
      ...metadata,
    };

    this.transitions.push(transition);

    logger.messageFlow.info(
      this.platform,
      this.chatId,
      "hybrid-transition",
      `${from} → ${to}: ${reason}`,
      metadata
    );
  }

  /**
   * Log Gemini's tool detection
   */
  logGeminiToolDetection(toolCalls) {
    this.logTransition(
      "gemini_agent",
      "openai_agent",
      `Gemini detected ${toolCalls.length} tool calls`,
      {
        toolCount: toolCalls.length,
        tools: toolCalls.map(tc => tc.name),
      }
    );
  }

  /**
   * Log Gemini missed tool opportunity
   */
  logGeminiMissedTool(userQuery, patterns) {
    this.logTransition(
      "gemini_agent",
      "openai_agent",
      "Gemini missed tool usage - forcing OpenAI fallback",
      {
        userQuery: userQuery.substring(0, 100),
        matchedPatterns: patterns,
      }
    );
  }

  /**
   * Log OpenAI tool execution
   */
  logOpenAIToolExecution(toolCalls) {
    this.logTransition(
      "openai_agent",
      "execute_tools",
      `OpenAI executing ${toolCalls.length} tools`,
      {
        toolCount: toolCalls.length,
        tools: toolCalls.map(tc => tc.name),
      }
    );
  }

  /**
   * Log tool execution completion
   */
  logToolExecutionComplete(results) {
    this.logTransition(
      "execute_tools",
      "gemini_agent",
      "Tools executed - returning to Gemini for final response",
      {
        toolCount: results.length,
        successCount: results.filter(r => r.success).length,
        failureCount: results.filter(r => !r.success).length,
      }
    );
  }

  /**
   * Log Gemini final response
   */
  logGeminiFinalResponse(responseLength) {
    this.logTransition(
      "gemini_agent",
      "end",
      "Gemini generated final response after tool execution",
      {
        responseLength,
      }
    );
  }

  /**
   * Log Gemini direct text response (no tools)
   */
  logGeminiDirectResponse(responseLength) {
    this.logTransition(
      "gemini_agent",
      "end",
      "Gemini handled text-only response (no tools needed)",
      {
        responseLength,
      }
    );
  }

  /**
   * Get summary of hybrid flow
   */
  getSummary() {
    const totalTime = Date.now() - this.startTime;
    const nodeVisits = {};

    // Count visits to each node
    for (const transition of this.transitions) {
      nodeVisits[transition.from] = (nodeVisits[transition.from] || 0) + 1;
      nodeVisits[transition.to] = (nodeVisits[transition.to] || 0) + 1;
    }

    const usedHybridFlow = this.transitions.some(
      t => t.from === "gemini_agent" && t.to === "openai_agent"
    );

    return {
      totalTime,
      transitionCount: this.transitions.length,
      nodeVisits,
      usedHybridFlow,
      transitions: this.transitions,
    };
  }

  /**
   * Log final summary
   */
  logSummary() {
    const summary = this.getSummary();

    logger.messageFlow.info(
      this.platform,
      this.chatId,
      "hybrid-flow-summary",
      `Completed in ${summary.totalTime}ms with ${summary.transitionCount} transitions`,
      {
        usedHybridFlow: summary.usedHybridFlow,
        nodeVisits: summary.nodeVisits,
      }
    );

    // Log the complete transition path
    const path = this.transitions.map(t => `${t.from}→${t.to}`).join(" → ");
    logger.messageFlow.info(
      this.platform,
      this.chatId,
      "hybrid-flow-path",
      `Flow path: ${path}`
    );
  }
}

/**
 * Create a hybrid flow logger instance
 */
export function createHybridFlowLogger(platform, chatId) {
  return new HybridFlowLogger(platform, chatId);
}

