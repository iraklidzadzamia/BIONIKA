import { ChatOpenAI } from "@langchain/openai";
import { createLangChainTools } from "../tools/index.js";
import { config } from "../../config/env.js";
import logger from "../../utils/logger.js";
import metricsTracker from "../../utils/metrics.js";

/**
 * Agent node - the main AI reasoning node
 *
 * This node:
 * 1. Takes the conversation state
 * 2. Calls OpenAI with tools
 * 3. Handles tool calls or returns assistant message
 * 4. Updates state accordingly
 */
export async function agentNode(state) {
  const {
    messages,
    systemInstructions,
    chatId,
    platform,
    companyId,
    timezone,
    workingHours,
    fullName,
    phoneNumber,
    toolCalls, // Check if we have tool calls from Gemini (hybrid mode)
    activeProvider,
  } = state;

  logger.messageFlow.llm(
    platform,
    chatId,
    "openai-agent-node",
    `Processing with ${messages.length} messages (Provider: ${activeProvider || 'openai'})`
  );

  const startTime = Date.now();

  // HYBRID MODE: OpenAI handles tool execution from Gemini
  if (activeProvider === "openai") {
    // Validate we have tool calls to execute
    if (!toolCalls || toolCalls.length === 0) {
      logger.messageFlow.error(
        platform,
        chatId,
        "openai-hybrid-violation",
        "OpenAI called without tool calls in hybrid mode - this violates the hybrid strategy"
      );

      // Track error metrics
      const executionTime = Date.now() - startTime;
      await metricsTracker.trackAgentExecution({
        platform,
        chatId,
        companyId,
        messageCount: messages.length,
        toolCallsCount: 0,
        executionTime,
        success: false,
        errorMessage: "OpenAI called without tool calls in hybrid mode",
        provider: "openai-hybrid-violation",
      });

      // Fallback: return error state (should not happen in normal flow)
      return {
        error: {
          message: "OpenAI received invalid hybrid mode request",
          type: "hybrid_mode_violation",
        },
        assistantMessage: "I apologize, but there seems to be an issue with processing your request.",
        currentStep: "end",
      };
    }

    logger.messageFlow.info(
      platform,
      chatId,
      "openai-tool-execution",
      `OpenAI executing ${toolCalls.length} tools from Gemini reasoning`
    );

    // Track OpenAI routing metrics for hybrid mode
    const executionTime = Date.now() - startTime;
    await metricsTracker.trackAgentExecution({
      platform,
      chatId,
      companyId,
      messageCount: messages.length,
      toolCallsCount: toolCalls.length,
      executionTime,
      success: true,
      provider: "openai-routing",
    });

    // Route to tool execution - OpenAI doesn't generate responses in hybrid mode
    return {
      toolCalls,
      currentStep: "execute_tools",
      activeProvider: "openai", // FIXED: Return state updates instead of mutating
    };
  }

  // HYBRID MODE FALLBACK: OpenAI needs to generate tool calls when Gemini missed them
  if (activeProvider === "openai-fallback") {
    logger.messageFlow.info(
      platform,
      chatId,
      "openai-fallback-reasoning",
      "OpenAI generating tool calls after Gemini missed tool opportunity"
    );

    // Continue to normal OpenAI processing with tools to generate the correct tool calls
    // Fall through to standard processing below
  }

  try {
    // Use company-specific OpenAI API key if available, fallback to global
    const openaiApiKey = state.openaiApiKey || config.openai.apiKey;

    if (!openaiApiKey) {
      throw new Error("OPENAI_API_KEY is not configured. Please set it in your .env file or company settings.");
    }

    logger.messageFlow.info(
      platform,
      chatId,
      "openai-config",
      `Initializing OpenAI with model: ${config.openai.chatModel}, API key: ${state.openaiApiKey ? 'company-specific' : 'global'}`
    );

    // Create OpenAI model with tools
    const model = new ChatOpenAI({
      modelName: config.openai.chatModel,
      openAIApiKey: openaiApiKey,
      timeout: 30000,
    });

    // Create tools with current context
    const tools = createLangChainTools(platform, {
      chat_id: chatId,
      company_id: companyId,
      platform,  // AUTHORIZATION FIX: Include platform in context for verifyAuthorization
      timezone,
      working_hours: workingHours,
    });

    // Bind tools to model
    const modelWithTools = model.bindTools(tools);

    // Build customer context
    let customerContext = "";
    if (fullName || phoneNumber) {
      customerContext =
        "\n\n---\n\nIMPORTANT - Customer Information Already Known:\n";
      if (fullName && fullName.trim()) {
        customerContext += `- Customer Name: ${fullName} (ALREADY SAVED - do NOT ask for it again)\n`;
      }
      if (phoneNumber && phoneNumber.trim()) {
        customerContext += `- Customer Phone: ${phoneNumber} (ALREADY SAVED - do NOT ask for it again)\n`;
      }
      customerContext +=
        "\nYou MUST use this saved information when booking appointments. Do NOT ask the customer to provide their name or phone number again - you already have it!";
    }

    // Implement smart message pruning to manage token usage while preserving tool call integrity
    const MAX_MESSAGES = 15; // Keep last 15 messages to prevent token overflow
    let prunedMessages = messages;
    let conversationSummary = "";

    if (messages.length > MAX_MESSAGES) {
      // Smart pruning: preserve tool_call + result pairs to avoid OpenAI validation errors
      // OpenAI requires that tool messages reference preceding assistant messages with tool_calls

      const messagesToKeep = [];
      const messagesToRemove = [];

      // Start from the end and work backwards, keeping at least MAX_MESSAGES
      for (let i = messages.length - 1; i >= 0 && messagesToKeep.length < MAX_MESSAGES; i--) {
        const message = messages[i];

        // Always keep recent messages
        if (i >= messages.length - MAX_MESSAGES) {
          messagesToKeep.unshift(message);
          continue;
        }

        // If this is a tool result, check if we kept its corresponding tool_call
        if (message.role === "tool" && message.tool_call_id) {
          // Find the assistant message with this tool_call_id
          const toolCallMsg = messages.slice(0, i).reverse().find(
            m => m.role === "assistant" &&
                 m.tool_calls?.some(tc => tc.id === message.tool_call_id)
          );

          // If we kept the tool_call message, we must keep this result too
          if (toolCallMsg && messagesToKeep.includes(toolCallMsg)) {
            messagesToKeep.unshift(message);
            continue;
          }
        }

        // If this is an assistant message with tool_calls, check if we kept any results
        if (message.role === "assistant" && message.tool_calls) {
          const hasKeptResults = message.tool_calls.some(tc =>
            messagesToKeep.some(m => m.role === "tool" && m.tool_call_id === tc.id)
          );

          // If we kept any tool results, we must keep this message too
          if (hasKeptResults) {
            messagesToKeep.unshift(message);
            continue;
          }
        }

        // This message can be safely removed
        messagesToRemove.push(message);
      }

      // Add any remaining old messages to remove list
      for (let i = 0; i < messages.length - messagesToKeep.length; i++) {
        if (!messagesToKeep.includes(messages[i]) && !messagesToRemove.includes(messages[i])) {
          messagesToRemove.push(messages[i]);
        }
      }

      if (messagesToRemove.length > 0) {
        // Create summary of removed conversation
        const userMessages = messagesToRemove.filter(m => m.role === 'user').map(m => m.content);
        const topics = userMessages.slice(0, 3).join('; ');

        conversationSummary = `\n\n[Earlier in conversation: ${messagesToRemove.length} messages about: ${topics}...]`;
        prunedMessages = messagesToKeep;

        logger.messageFlow.info(
          platform,
          chatId,
          "message-pruning",
          `Smart pruning: removed ${messagesToRemove.length} messages, keeping ${messagesToKeep.length} (preserved tool call integrity)`
        );
      } else {
        prunedMessages = messages;
      }
    }

    // Prepare messages with system instructions
    const systemMessage = {
      role: "system",
      content: `${systemInstructions}${customerContext}${conversationSummary}`,
    };

    const allMessages = [systemMessage, ...prunedMessages];

    // Invoke the model
    const response = await modelWithTools.invoke(allMessages);

    // Check if there are tool calls
    if (response.tool_calls && response.tool_calls.length > 0) {
      logger.messageFlow.llm(
        platform,
        chatId,
        "agent-response",
        `Received ${response.tool_calls.length} tool calls`
      );

      // Track agent execution metrics
      const executionTime = Date.now() - startTime;
      await metricsTracker.trackAgentExecution({
        platform,
        chatId,
        companyId,
        messageCount: allMessages.length,
        toolCallsCount: response.tool_calls.length,
        executionTime,
        success: true,
      });

      // FIXED: In hybrid mode with fallback, ensure proper routing to execute_tools
      // When OpenAI is used as fallback and generates tool calls, we need to:
      // 1. Route to execute_tools for execution
      // 2. Then return to Gemini (handled by toolExecutor setting activeProvider="gemini")
      const currentStepValue = (activeProvider === "openai-fallback") ? "execute_tools" : "execute_tools";

      // Return state update with tool calls
      return {
        messages: [
          {
            role: "assistant",
            content: response.content || "",
            tool_calls: response.tool_calls.map((tc) => ({
              id: tc.id,
              type: "function",
              function: {
                name: tc.name,
                arguments: JSON.stringify(tc.args),
              },
            })),
          },
        ],
        toolCalls: response.tool_calls,
        currentStep: currentStepValue,
        // Keep activeProvider to help with routing back through graph
        activeProvider: activeProvider === "openai-fallback" ? "openai-fallback" : activeProvider,
      };
    }

    // No tool calls, just return the message
    logger.messageFlow.llm(
      platform,
      chatId,
      "agent-response",
      `Received text response: ${response.content?.substring(0, 50)}...`
    );

    // Track agent execution metrics
    const executionTime = Date.now() - startTime;
    await metricsTracker.trackAgentExecution({
      platform,
      chatId,
      companyId,
      messageCount: allMessages.length,
      toolCallsCount: 0,
      executionTime,
      success: true,
    });

    return {
      messages: [
        {
          role: "assistant",
          content: response.content,
        },
      ],
      assistantMessage: response.content,
      currentStep: "end",
    };
  } catch (error) {
    logger.messageFlow.error(platform, chatId, "agent-node", error);

    // Track failed agent execution
    const executionTime = Date.now() - startTime;
    await metricsTracker.trackAgentExecution({
      platform,
      chatId,
      companyId,
      messageCount: messages.length,
      toolCallsCount: 0,
      executionTime,
      success: false,
      errorMessage: error.message,
    });

    return {
      error: {
        message: error.message,
        type: "agent_error",
      },
      assistantMessage:
        "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.",
      currentStep: "end",
    };
  }
}
