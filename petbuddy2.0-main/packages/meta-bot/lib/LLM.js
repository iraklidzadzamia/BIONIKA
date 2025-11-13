import OpenAI from "openai";
import { tools } from "../utils/openaiTools.js";
import { config } from "../config/env.js";
import logger from "../utils/logger.js";

const CHAT_MODEL = config.openai.chatModel;

/**
 * Creates a chat completion with tools.
 * Returns assistant message (if present) and all tool calls (if any).
 */
export async function createChatWithTools(
  messagesFromDb,
  system_instructions,
  openai_api_key,
  full_name,
  phone_number,
  tool_choice = "auto",
  platform = "unknown",
  senderId = "unknown"
) {
  if (!openai_api_key) throw new Error("OpenAI API key is required");

  logger.messageFlow.llm(
    platform,
    senderId,
    "request",
    `Creating chat with ${messagesFromDb?.length || 0} messages`,
    {
      tool_choice,
      has_name: !!full_name,
      has_phone: !!phone_number,
    }
  );

  const openai = new OpenAI({
    apiKey: openai_api_key,
    timeout: 30000, // 30 second timeout
  });

  // Build customer context to inform LLM about already-known information
  let customerContext = "";
  if (full_name || phone_number) {
    customerContext =
      "\n\n---\n\nIMPORTANT - Customer Information Already Known:\n";
    if (full_name && full_name.trim()) {
      customerContext += `- Customer Name: ${full_name} (ALREADY SAVED - do NOT ask for it again)\n`;
    }
    if (phone_number && phone_number.trim()) {
      customerContext += `- Customer Phone: ${phone_number} (ALREADY SAVED - do NOT ask for it again)\n`;
    }
    customerContext +=
      "\nYou MUST use this saved information when booking appointments. Do NOT ask the customer to provide their name or phone number again - you already have it!";
  }

  let instructions = {
    role: "system",
    content: [
      {
        type: "text",
        text: `${system_instructions}${customerContext}`,
      },
    ],
  };

  let messages = [instructions, ...(messagesFromDb || [])];

  // Add retry logic with exponential backoff
  const MAX_RETRIES = 2;
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: CHAT_MODEL,
        messages,
        max_completion_tokens: 2000,
        tools,
        tool_choice,
      });

      const choice = response.choices[0]?.message;

      // If tool calls exist, return ALL of them as array
      let tool_calls = [];
      if (choice?.tool_calls?.length) {
        for (const call of choice.tool_calls) {
          let parameters = {};
          try {
            parameters = JSON.parse(call.function.arguments);
          } catch (e) {
            parameters = {}; // fallback: blank
          }
          tool_calls.push({
            name: call.function.name,
            parameters,
            raw: call,
          });
        }
      }

      const assistant_message = choice?.content || "";

      // Log LLM response
      logger.messageFlow.llm(
        platform,
        senderId,
        "response",
        `Received ${tool_calls.length} tool calls and ${
          assistant_message ? "a message" : "no message"
        }`,
        {
          tool_calls_count: tool_calls.length,
          has_message: !!assistant_message,
          message_length: assistant_message?.length || 0,
        }
      );

      return {
        assistant_message: assistant_message || null,
        tool_calls: tool_calls.length ? tool_calls : null,
        raw_choice: choice,
      };
    } catch (error) {
      lastError = error;
      logger.messageFlow.error(platform, senderId, "llm-create-chat", error, {
        attempt,
        max_retries: MAX_RETRIES,
      });

      // Don't retry on certain errors
      if (error.status === 401 || error.status === 403) {
        // Authentication errors - don't retry
        console.error("[LLM] Authentication error - not retrying");
        break;
      }

      if (error.status === 400) {
        // Bad request - don't retry
        console.error("[LLM] Bad request error - not retrying");
        break;
      }

      // Retry on 429 (rate limit), 500 (server error), 503 (service unavailable), timeouts
      if (attempt < MAX_RETRIES) {
        const delayMs = Math.pow(2, attempt) * 1000; // 2s, 4s
        console.log(`[LLM] Retrying in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
    }
  }

  // All retries exhausted, throw error with context
  const openAIError = new Error(lastError?.message || "OpenAI API error");
  openAIError.status = lastError?.status;
  openAIError.originalError = lastError;
  openAIError.name = "OpenAIError";
  throw openAIError;
}

export async function continueChatWithToolResults({
  priorMessages,
  system_instructions,
  openai_api_key,
  toolResults,
  platform = "unknown",
  senderId = "unknown",
}) {
  if (!openai_api_key) throw new Error("OpenAI API key is required");

  logger.messageFlow.llm(
    platform,
    senderId,
    "followup",
    `Creating follow-up with ${toolResults?.length || 0} tool results`,
    {
      tool_results_count: toolResults?.length || 0,
    }
  );

  const openai = new OpenAI({
    apiKey: openai_api_key,
    timeout: 30000, // 30 second timeout
  });

  const systemMsg = {
    role: "system",
    content: [{ type: "text", text: `${system_instructions}` }],
  };

  // Construct messages: system + history + tool outputs as tool messages
  const messages = [systemMsg, ...(priorMessages || [])];

  for (const tr of toolResults) {
    // Add the assistant tool call stub for better trace (optional)
    messages.push({
      role: "assistant",
      tool_calls: [
        {
          id: tr.raw?.id || `tool_${tr.name}`,
          type: "function",
          function: {
            name: tr.name,
            arguments: JSON.stringify(tr.parameters || {}),
          },
        },
      ],
      content: "",
    });

    // Add the tool result message
    messages.push({
      role: "tool",
      tool_call_id: tr.raw?.id || undefined,
      name: tr.name,
      content: JSON.stringify(tr.result || {}),
    });
  }

  // Add retry logic with exponential backoff
  const MAX_RETRIES = 2;
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: CHAT_MODEL,
        messages,
        max_completion_tokens: 2500,
      });

      const choice = response.choices[0]?.message;

      const assistant_message = choice?.content || "";

      logger.messageFlow.llm(
        platform,
        senderId,
        "followup-response",
        `Received follow-up message`,
        {
          message_length: assistant_message?.length || 0,
        }
      );

      return {
        assistant_message,
      };
    } catch (error) {
      lastError = error;
      logger.messageFlow.error(platform, senderId, "llm-continue-chat", error, {
        attempt,
        max_retries: MAX_RETRIES,
      });

      // Don't retry on certain errors
      if (
        error.status === 401 ||
        error.status === 403 ||
        error.status === 400
      ) {
        console.error("[LLM] Non-retryable error - not retrying");
        break;
      }

      // Retry on 429, 500, 503, timeouts
      if (attempt < MAX_RETRIES) {
        const delayMs = Math.pow(2, attempt) * 1000;
        console.log(`[LLM] Retrying in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
    }
  }

  // All retries exhausted, throw error
  const openAIError = new Error(lastError?.message || "OpenAI API error");
  openAIError.status = lastError?.status;
  openAIError.originalError = lastError;
  openAIError.name = "OpenAIError";
  throw openAIError;
}
