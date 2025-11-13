import { StateGraph, END } from "@langchain/langgraph";
import { ConversationState } from "./state/schema.js";
import { agentNode } from "./nodes/agent.js";
import { geminiAgentNode } from "./nodes/geminiAgent.js";
import { toolExecutorNode } from "./nodes/toolExecutor.js";
import {
  humanDetectorNode,
  createHandoffMessage,
} from "./nodes/humanDetector.js";
import { config } from "../config/env.js";
import logger from "../utils/logger.js";

/**
 * Create the PetBuddy conversation graph
 *
 * Hybrid AI Flow with Human Handoff Detection:
 * 1. START -> human_detector (check if human intervention needed)
 * 2. human_detector -> gemini_agent (always start with Gemini) OR end (if handoff)
 * 3. gemini_agent -> execute_tools (if tools needed) OR end (if text response ready)
 * 4. execute_tools -> gemini_agent (return to Gemini with tool results for final response)
 * 5. Repeat until final response
 *
 * Hybrid Strategy:
 * - Gemini handles ALL reasoning (tool selection + text responses) - cheap, fast, accurate
 * - Tools are executed directly without LLM intermediary - avoids message validation errors
 * - Gemini generates final response after tool execution - consistent voice
 * - OpenAI agent only used as fallback when Gemini misses required tools
 *
 * @param {string} aiProvider - AI provider override: "openai", "gemini", or null (use global default)
 * @param {Object} companyConfig - Per-company configuration (optional)
 * @param {string} companyConfig.openaiApiKey - Company-specific OpenAI key
 * @param {string} companyConfig.geminiApiKey - Company-specific Gemini key
 */
export function createConversationGraph(aiProvider = null, companyConfig = {}) {
  // Determine if hybrid mode is possible based on per-company or global config
  const hasOpenAI = companyConfig.openaiApiKey || config.openai.apiKey;
  const hasGemini = companyConfig.geminiApiKey || config.gemini.apiKey;

  // Respect company-level AI provider preference, fallback to global config
  const effectiveProvider = aiProvider || (config.features.useGemini ? "gemini" : "openai");

  // Hybrid mode: both providers available
  const isHybridMode = hasGemini && hasOpenAI && effectiveProvider === "gemini";

  if (!isHybridMode) {
    // Single provider mode: use only one AI provider
    const useGemini = effectiveProvider === "gemini" && hasGemini;
    const useOpenAI = effectiveProvider === "openai" && hasOpenAI;

    // Ensure at least one provider is available
    if (!useGemini && !useOpenAI) {
      throw new Error(
        `No AI provider available. Company requested '${effectiveProvider}' but keys are missing. ` +
        `Has Gemini: ${hasGemini}, Has OpenAI: ${hasOpenAI}`
      );
    }

    const selectedAgent = useGemini ? geminiAgentNode : agentNode;
    const agentName = useGemini ? "gemini" : "openai";

    logger.info(`[LangGraph] Using single-provider mode: ${agentName.toUpperCase()}`);
    logger.info(`[LangGraph] Provider source: ${companyConfig.openaiApiKey || companyConfig.geminiApiKey ? 'company-specific' : 'global'}`);

    const workflow = new StateGraph(ConversationState)
      .addNode("human_detector", humanDetectorNode)
      .addNode("agent", selectedAgent)
      .addNode("execute_tools", toolExecutorNode)
      .addEdge("__start__", "human_detector")
      .addConditionalEdges(
        "human_detector",
        (state) => state.needsHumanHandoff ? "handoff" : "agent",
        { handoff: END, agent: "agent" }
      )
      .addConditionalEdges(
        "agent",
        (state) => state.currentStep === "execute_tools" ? "execute_tools" : "end",
        { execute_tools: "execute_tools", end: END }
      )
      .addEdge("execute_tools", "agent");

    const graph = workflow.compile();
    logger.info(`[LangGraph] Single-provider graph compiled (Provider: ${agentName.toUpperCase()})`);
    return graph;
  }

  // Hybrid mode: Both Gemini and OpenAI nodes
  logger.info(`[LangGraph] Using hybrid AI mode: Gemini + OpenAI`);

  const workflow = new StateGraph(ConversationState)
    // Add nodes
    .addNode("human_detector", humanDetectorNode)
    .addNode("gemini_agent", geminiAgentNode)
    .addNode("openai_agent", agentNode) // Renamed for clarity in hybrid mode
    .addNode("execute_tools", toolExecutorNode)

    // Define edges
    .addEdge("__start__", "human_detector")
    .addConditionalEdges(
      "human_detector",
      // Route to Gemini (always start with Gemini in hybrid mode)
      // FIXED: Don't mutate state in routing - pure function
      (state) => {
        if (state.needsHumanHandoff) {
          return "handoff";
        }
        // activeProvider will be set by gemini_agent node on entry
        return "gemini_agent";
      },
      {
        handoff: END,
        gemini_agent: "gemini_agent",
      }
    )
    .addConditionalEdges(
      "gemini_agent",
      // Gemini routing: tools detected -> direct tool execution, text-only -> end
      // FIXED: Pure routing function - no state mutations, clearer logic
      (state) => {
        // FIXED: Use currentStep as single source of truth for routing decisions
        // This eliminates confusion about which condition takes precedence

        switch (state.currentStep) {
          case "switch_to_openai":
            // HYBRID: Gemini detected tool calls, route DIRECTLY to execute_tools
            // Skip openai_agent node to avoid LLM validation errors
            logger.messageFlow.info(
              state.platform,
              state.chatId,
              "hybrid-transition",
              `gemini → execute_tools: Gemini detected ${state.toolCalls?.length || 0} tool calls, routing directly to tool execution`
            );
            return "execute_tools";

          case "force_openai_fallback":
            // Gemini missed tool usage - force OpenAI to generate proper tool calls
            logger.messageFlow.info(
              state.platform,
              state.chatId,
              "hybrid-transition",
              "gemini → openai-fallback: Gemini missed tool usage opportunity, routing to OpenAI for proper tool execution"
            );
            return "openai_agent";

          case "continue_with_gemini":
            // HYBRID: After tool execution, Gemini generates final response
            // This case handles the return from execute_tools → gemini_agent
            logger.messageFlow.info(
              state.platform,
              state.chatId,
              "gemini-final-response-routing",
              "Gemini generating final response after tool execution"
            );
            return "end";

          case "end":
            // Gemini handled text-only response successfully
            logger.messageFlow.info(
              state.platform,
              state.chatId,
              "gemini-direct-response",
              "Gemini handled text-only response, no tools needed"
            );
            return "end";

          default:
            // Unexpected state - log warning and end safely
            logger.messageFlow.warning(
              state.platform,
              state.chatId,
              "gemini-unexpected-routing",
              `Unexpected Gemini routing state: currentStep=${state.currentStep}, toolCalls=${state.toolCalls?.length || 0}`
            );
            return "end";
        }
      },
      {
        execute_tools: "execute_tools",
        openai_agent: "openai_agent",
        end: END,
      }
    )
    .addConditionalEdges(
      "openai_agent",
      // OpenAI routing: always route to execute tools when called in hybrid mode
      (state) => {
        // FIXED: Check for tool calls first, then currentStep
        if (state.toolCalls?.length > 0) {
          logger.messageFlow.info(
            state.platform,
            state.chatId,
            "openai-tool-execution",
            `OpenAI ${state.activeProvider === 'openai-fallback' ? '(fallback) ' : ''}executing ${state.toolCalls.length} tools`
          );
          return "execute_tools";
        }

        if (state.currentStep === "execute_tools") {
          logger.messageFlow.info(
            state.platform,
            state.chatId,
            "openai-tool-execution",
            `OpenAI routing to execute_tools based on currentStep`
          );
          return "execute_tools";
        }

        // OpenAI should never handle pure text responses in hybrid mode
        // This is a fallback that should not happen in normal flow
        logger.messageFlow.warning(
          state.platform,
          state.chatId,
          "openai-unexpected-text",
          "OpenAI received text response in hybrid mode - this should not happen"
        );
        return "end";
      },
      {
        execute_tools: "execute_tools",
        end: END,
      }
    )
    .addConditionalEdges(
      "execute_tools",
      // HYBRID MODE: After tool execution, always return to Gemini for final response generation
      // FIXED: Pure routing - state updates happen in toolExecutorNode
      (state) => {
        logger.messageFlow.info(
          state.platform,
          state.chatId,
          "hybrid-transition",
          "execute_tools → gemini: Tools executed successfully, returning to Gemini for final response"
        );
        // toolExecutorNode already sets:
        // - state.toolCalls = []
        // - state.currentStep = "continue_with_gemini" (triggers final response generation)
        // - state.activeProvider = "gemini"
        // - state.lastToolResults = [...] (for validation)
        return "gemini_agent";
      },
      {
        gemini_agent: "gemini_agent",
      }
    );

  // Compile the graph
  const graph = workflow.compile();

  logger.info(`[LangGraph] Hybrid AI graph compiled successfully (Gemini + OpenAI with seamless handoff)`);
  logger.info(`[LangGraph] Hybrid Flow Configuration:`);
  logger.info(`  - Gemini: Primary reasoning & text responses`);
  logger.info(`  - OpenAI: Tool execution only`);
  logger.info(`  - Tool Usage Enforcement: ${config.features.enforceToolUsage ? 'Enabled' : 'Disabled'}`);
  logger.info(`  - Transition Flow: human_detector → gemini_agent ↔ openai_agent → execute_tools → gemini_agent`);

  // Add verification method for testing hybrid flow
  graph.verifyHybridFlow = async function(testInput) {
    // Capture logs during execution
    const logs = [];
    const originalLog = logger.messageFlow.info;
    logger.messageFlow.info = (...args) => {
      logs.push(args);
      return originalLog(...args);
    };

    try {
      const result = await this.invoke(testInput, { recursionLimit: 25 });

      // Analyze transition logs
      const geminiToOpenAi = logs.find(([platform, chatId, event, message]) =>
        event === "hybrid-transition" &&
        message.includes("gemini → openai-tools") &&
        platform === testInput.platform &&
        chatId === testInput.chatId
      );

      const openAiToGemini = logs.find(([platform, chatId, event, message]) =>
        event === "hybrid-transition" &&
        message.includes("openai-tools → gemini") &&
        platform === testInput.platform &&
        chatId === testInput.chatId
      );

      const openAiToolExecution = logs.find(([platform, chatId, event, message]) =>
        event === "openai-tool-execution" &&
        platform === testInput.platform &&
        chatId === testInput.chatId
      );

      const geminiFinalResponse = logs.find(([platform, chatId, event, message]) =>
        event === "gemini-final-response" &&
        platform === testInput.platform &&
        chatId === testInput.chatId
      );

      return {
        success: true,
        result,
        transitions: {
          geminiToOpenAi: !!geminiToOpenAi,
          openAiToolExecution: !!openAiToolExecution,
          openAiToGemini: !!openAiToGemini,
          geminiFinalResponse: !!geminiFinalResponse,
          completeHybridFlow: !!(geminiToOpenAi && openAiToolExecution && openAiToGemini && geminiFinalResponse)
        },
        flowSequence: logs
          .filter(([platform, chatId, event]) =>
            platform === testInput.platform && chatId === testInput.chatId
          )
          .map(([platform, chatId, event, message]) => ({ event, message })),
        logs
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        transitions: {
          geminiToOpenAi: false,
          openAiToolExecution: false,
          openAiToGemini: false,
          geminiFinalResponse: false,
          completeHybridFlow: false
        },
        logs
      };
    } finally {
      // Restore original logger
      logger.messageFlow.info = originalLog;
    }
  };

  return graph;
}

/**
 * Invoke the conversation graph with input
 *
 * @param {Object} input - Input state
 * @param {string} input.chatId - User's chat ID
 * @param {string} input.platform - Platform (facebook, instagram)
 * @param {Array} input.messages - Conversation messages
 * @param {string} input.systemInstructions - System prompt
 * @param {string} input.companyId - Company ID
 * @param {string} input.timezone - Timezone
 * @param {string} input.fullName - Customer name (if known)
 * @param {string} input.phoneNumber - Customer phone (if known)
 * @param {string} input.aiProvider - AI provider override (optional: "openai" or "gemini")
 *
 * @returns {Object} Final state with assistantMessage
 */
/**
 * Invoke conversation with retry logic
 */
async function invokeConversationWithRetry(input, maxRetries = 2) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        logger.messageFlow.info(
          input.platform,
          input.chatId,
          "graph-retry",
          `Retrying graph invocation (attempt ${attempt + 1}/${maxRetries + 1}) after ${delay}ms`
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      logger.messageFlow.info(
        input.platform,
        input.chatId,
        "graph-invoke",
        "Starting conversation graph",
        { attempt: attempt + 1, aiProvider: input.aiProvider || 'default' }
      );

      // Build company config from input
      const companyConfig = {
        openaiApiKey: input.openaiApiKey,
        geminiApiKey: input.geminiApiKey,
      };

      const graph = createConversationGraph(input.aiProvider, companyConfig);
      const result = await graph.invoke(input, {
        recursionLimit: 25, // Prevent infinite loops
      });

      // Check if human handoff was triggered
      if (result.needsHumanHandoff) {
        logger.messageFlow.info(
          input.platform,
          input.chatId,
          "human-handoff",
          `Handoff triggered: ${result.handoffReason}`
        );

        // Set handoff message
        result.assistantMessage = createHandoffMessage(result.handoffReason);
      }

      logger.messageFlow.info(
        input.platform,
        input.chatId,
        "graph-complete",
        "Conversation graph completed",
        {
          hasMessage: !!result.assistantMessage,
          messageLength: result.assistantMessage?.length || 0,
          toolCallsCount: result.toolCalls?.length || 0,
          handoff: result.needsHumanHandoff || false,
          attempt: attempt + 1
        }
      );

      return result;

    } catch (error) {
      lastError = error;

      // Don't retry validation errors, quota errors, or invalid arguments
      const nonRetryableErrors = [
        'validation',
        'quota',
        'INVALID_ARGUMENT',
        'PERMISSION_DENIED',
        'UNAUTHENTICATED'
      ];

      const isNonRetryable = nonRetryableErrors.some(pattern =>
        error.message?.includes(pattern) || error.code?.includes(pattern)
      );

      if (isNonRetryable) {
        logger.messageFlow.error(
          input.platform,
          input.chatId,
          "graph-invoke-non-retryable",
          error
        );
        throw error; // Don't retry these
      }

      // Retry network/timeout errors
      if (attempt < maxRetries) {
        logger.messageFlow.warning(
          input.platform,
          input.chatId,
          "graph-error-retryable",
          `Graph invocation failed: ${error.message}, will retry...`,
          { attempt: attempt + 1, maxRetries: maxRetries + 1 }
        );
        continue;
      }
    }
  }

  // All retries exhausted
  logger.messageFlow.error(
    input.platform,
    input.chatId,
    "graph-invoke-failed",
    lastError
  );

  return {
    ...input,
    assistantMessage: "I apologize, but I'm having trouble processing your request right now. Please try again in a moment, or contact our support team for immediate assistance.",
    error: {
      message: lastError.message,
      type: "graph_execution_error",
      attempts: maxRetries + 1
    },
  };
}

export async function invokeConversation(input) {
  return invokeConversationWithRetry(input, 2);
}
