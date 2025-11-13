import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createLangChainTools } from "../tools/index.js";
import { config } from "../../config/env.js";
import logger from "../../utils/logger.js";
import metricsTracker from "../../utils/metrics.js";

/**
 * Helper function to safely extract string content from Gemini response
 * Handles both string and array content formats
 */
function getContentAsString(content) {
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
    return content.map(c => typeof c === 'string' ? c : c.text || '').join(' ');
  }

  // Unexpected content type - log for debugging
  logger.messageFlow.warning(
    'gemini',
    'unknown',
    'unexpected-content-type',
    `getContentAsString received unexpected content type: ${typeof content}`,
    {
      contentType: typeof content,
      contentValue: JSON.stringify(content)?.substring(0, 200)
    }
  );

  return '';
}

/**
 * Gemini Agent node - AI reasoning node powered by Google Gemini
 *
 * This node:
 * 1. Takes the conversation state
 * 2. Calls Google Gemini with tools
 * 3. Handles tool calls or returns assistant message
 * 4. Updates state accordingly
 */
export async function geminiAgentNode(state) {
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
    currentStep,
  } = state;

  // Check if we're continuing after tool execution (hybrid mode)
  if (currentStep === "continue_with_gemini") {
    logger.messageFlow.llm(
      platform,
      chatId,
      "gemini-final-response",
      "Generating final response after tool execution"
    );

    const startTime = Date.now();

    // VALIDATION: Check if book_appointment was called and failed
    const lastToolResults = state.lastToolResults || [];
    const bookingToolResult = lastToolResults.find(r => r.name === 'book_appointment');
    const bookingFailed = bookingToolResult && !bookingToolResult.success;
    const bookingConflict = bookingToolResult?.data?.conflict === true;

    // ENFORCEMENT: Check if booking conflict occurred but get_available_times was not called
    if (bookingConflict) {
      const calledAvailableTimes = lastToolResults.some(r =>
        r.name === 'get_available_times' && r.success
      );

      if (!calledAvailableTimes) {
        logger.messageFlow.warning(
          platform,
          chatId,
          "conflict-without-alternatives",
          "Booking conflict detected but get_available_times was not called. Forcing tool execution."
        );

        // Force call to get_available_times
        const conflictParams = bookingToolResult.data.get_available_times_params;

        return {
          currentStep: "execute_tools",
          toolCalls: [{
            id: `forced_${Date.now()}`,
            type: "function",
            function: {
              name: "get_available_times",
              arguments: JSON.stringify(conflictParams)
            }
          }],
          messages: [], // Don't add incomplete response
          activeProvider: "gemini"
        };
      }
    }

    try {
      // Use company-specific Gemini API key if available, fallback to global
      const geminiApiKey = state.geminiApiKey || config.gemini.apiKey;

      // Validate Gemini API key
      if (!geminiApiKey) {
        throw new Error("GEMINI_API_KEY is not configured. Please set it in your .env file or company settings.");
      }

      // For final response generation after tools, use Gemini without tools
      // since tools have already been executed
      const resolvedApiVersion =
        config.gemini.apiVersion ||
        (String(config.gemini.chatModel).startsWith("gemini-1.5") ? "v1" : "v1beta");

      const model = new ChatGoogleGenerativeAI({
        model: String(config.gemini.chatModel),
        apiKey: String(geminiApiKey),
        temperature: 0.7,
        maxRetries: 2,
        apiVersion: resolvedApiVersion,
      });

      // Build customer context (same as before)
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

      // Add booking in progress context
      if (state.bookingInProgress) {
        const elapsed = Date.now() - state.bookingInProgress.timestamp;
        const minutes = Math.floor(elapsed / 60000);
        const selectionType = state.bookingInProgress.needsSelection.type;
        const options = state.bookingInProgress.needsSelection.options;

        customerContext += `\n\n---\n\n🚨 BOOKING IN PROGRESS (${minutes} min ago) - ACTION REQUIRED:

Customer was trying to book with these details:
${JSON.stringify(state.bookingInProgress.originalParams, null, 2)}

Selection needed: ${selectionType}
Available options: ${JSON.stringify(options, null, 2)}

CRITICAL INSTRUCTION:
The customer's CURRENT message is their ${selectionType} selection response.
You MUST immediately call book_appointment with:
1. ALL the original parameters from above
2. PLUS the ${selectionType}_id based on their selection:
   - If they named a ${selectionType}, find it in the options and use its "id" field
   - If they said "any"/"yes"/"ok"/"first", use the first option's "id" field

DO NOT just respond with text. You MUST call the book_appointment tool now with the selected ${selectionType}_id.`;
      }

      // Use same message pruning logic
      const MAX_MESSAGES = 15;
      let prunedMessages = messages;
      let conversationSummary = "";

      if (messages.length > MAX_MESSAGES) {
        // FIXED: Use same improved pruning algorithm
        const messagesToKeep = new Set();
        const messageIndices = new Map();

        messages.forEach((msg, idx) => {
          messageIndices.set(msg, idx);
        });

        // Step 1: Keep last MAX_MESSAGES as candidates
        const startIndex = Math.max(0, messages.length - MAX_MESSAGES);
        for (let i = startIndex; i < messages.length; i++) {
          messagesToKeep.add(messages[i]);
        }

        // Step 2: Ensure dependencies are kept
        let addedDependencies = true;
        while (addedDependencies) {
          addedDependencies = false;

          for (const message of messagesToKeep) {
            const idx = messageIndices.get(message);

            // Tool result needs its tool_call message
            if (message.role === "tool" && message.tool_call_id) {
              const toolCallMsg = messages.slice(0, idx).reverse().find(
                m => m.role === "assistant" &&
                     m.tool_calls?.some(tc => tc.id === message.tool_call_id)
              );

              if (toolCallMsg && !messagesToKeep.has(toolCallMsg)) {
                messagesToKeep.add(toolCallMsg);
                addedDependencies = true;
              }
            }

            // Tool_call message needs all its results
            if (message.role === "assistant" && message.tool_calls) {
              for (const toolCall of message.tool_calls) {
                const resultMsg = messages.slice(idx + 1).find(
                  m => m.role === "tool" && m.tool_call_id === toolCall.id
                );

                if (resultMsg && !messagesToKeep.has(resultMsg)) {
                  messagesToKeep.add(resultMsg);
                  addedDependencies = true;
                }
              }
            }
          }
        }

        // Step 3: Convert to ordered array
        prunedMessages = messages.filter(msg => messagesToKeep.has(msg));

        const messagesToRemove = messages.filter(msg => !messagesToKeep.has(msg));

        if (messagesToRemove.length > 0) {
          const userMessages = messagesToRemove.filter(m => m.role === 'user').map(m => m.content);
          const topics = userMessages.slice(-3).join('; '); // FIXED: Use last 3, not first 3

          conversationSummary = `\n\n[Earlier in conversation: ${messagesToRemove.length} messages about: ${topics}...]`;

          logger.messageFlow.info(
            platform,
            chatId,
            "message-pruning",
            `Smart pruning: removed ${messagesToRemove.length} messages, keeping ${prunedMessages.length} (preserved tool call integrity)`
          );
        }
      }

      // Build validation context based on tool results
      let validationContext = "";
      if (bookingFailed) {
        validationContext = `\n\n⚠️ BOOKING VALIDATION FAILED:\nThe book_appointment tool returned an error. You MUST NOT tell the user their booking is confirmed. Instead, explain the error and offer alternatives.`;
      } else if (bookingConflict) {
        validationContext = `\n\n⚠️ BOOKING CONFLICT DETECTED:\nThe book_appointment tool returned a conflict (all staff unavailable). You MUST acknowledge this and present alternative time slots. DO NOT claim the booking succeeded.`;
      } else if (bookingToolResult && bookingToolResult.success) {
        validationContext = `\n\n✅ BOOKING CONFIRMED:\nThe book_appointment tool succeeded. You can now confirm the booking to the user with details from the tool result.`;
      }

      // Prepare messages with system instructions and tool results
      const systemMessage = {
        role: "system",
        content: `${systemInstructions}${customerContext}${conversationSummary}${validationContext}\n\n---\n\nTOOL EXECUTION COMPLETE: The requested tools have been executed. Now provide a natural, conversational response to the user based on the tool results above.\n\nIMPORTANT - If any tool result shows a booking conflict (conflict: true, all_staff_unavailable: true), you MUST acknowledge the conflict and present alternative time slots from the get_available_times tool results. DO NOT just say sorry - show the actual available times.`,
      };

      const allMessages = [systemMessage, ...prunedMessages];

      // Generate final response with tool results
      const response = await model.invoke(allMessages);

      // Track Gemini execution metrics for final response
      const executionTime = Date.now() - startTime;
      await metricsTracker.trackAgentExecution({
        platform,
        chatId,
        companyId,
        messageCount: allMessages.length,
        toolCallsCount: 0,
        executionTime,
        success: true,
        provider: "gemini-final-response",
      });

      const finalContent = getContentAsString(response.content);

      logger.messageFlow.llm(
        platform,
        chatId,
        "gemini-final-response-complete",
        `Final response generated: ${finalContent.substring(0, 50)}...`
      );

      // SAFETY CHECK: Ensure response content is never empty
      if (!finalContent || finalContent.trim().length === 0) {
        logger.messageFlow.error(
          platform,
          chatId,
          "gemini-empty-final-response",
          new Error("Gemini returned empty final response content after tools"),
          {
            rawContent: JSON.stringify(response.content),
            contentType: typeof response.content,
            contentIsArray: Array.isArray(response.content)
          }
        );

        return {
          messages: [
            {
              role: "assistant",
              content: "I apologize, but I'm having trouble generating a response based on the results. Could you please try again?",
            },
          ],
          assistantMessage: "I apologize, but I'm having trouble generating a response based on the results. Could you please try again?",
          currentStep: "end",
          activeProvider: "gemini",
        };
      }

      logger.messageFlow.info(
        platform,
        chatId,
        "gemini-returning-final-response",
        `Returning final assistantMessage with length: ${finalContent.length}`,
        {
          preview: finalContent.substring(0, 100),
          fullLength: finalContent.length
        }
      );

      return {
        messages: [
          {
            role: "assistant",
            content: finalContent,
          },
        ],
        assistantMessage: finalContent,
        currentStep: "end",
        activeProvider: "gemini", // FIXED: Return state updates instead of mutating
      };
    } catch (error) {
      logger.messageFlow.error(platform, chatId, "gemini-final-response", error);

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
        provider: "gemini-final-response",
      });

      // Fallback to OpenAI if Gemini fails during final response
      if (config.openai.apiKey) {
        logger.messageFlow.warning(
          platform,
          chatId,
          "gemini-fallback-final",
          "Gemini failed during final response, falling back to OpenAI"
        );

        const { agentNode } = await import("./agent.js");
        return agentNode(state);
      }

      return {
        error: {
          message: error.message,
          type: "gemini_final_response_error",
        },
        assistantMessage:
          "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.",
        currentStep: "end",
      };
    }
  }

  logger.messageFlow.llm(
    platform,
    chatId,
    "gemini-agent-node",
    `Processing with ${messages.length} messages`
  );

  const startTime = Date.now();

  try {
    // Use company-specific Gemini API key if available, fallback to global
    const geminiApiKey = state.geminiApiKey || config.gemini.apiKey;

    // Validate Gemini API key
    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY is not configured. Please set it in your .env file, company settings, or use OpenAI instead.");
    }

    // Validate model name
    if (!config.gemini.chatModel) {
      throw new Error("GEMINI_CHAT_MODEL is not configured. Please set it in your .env file.");
    }

    const resolvedApiVersion =
      config.gemini.apiVersion ||
      // Gemini 1.5 endpoints live under v1; newer families default to v1beta unless overridden
      (String(config.gemini.chatModel).startsWith("gemini-1.5") ? "v1" : "v1beta");

    // Log configuration for debugging
    logger.messageFlow.info(
      platform,
      chatId,
      "gemini-config",
      `Initializing Gemini with model: ${config.gemini.chatModel}, API key: ${state.geminiApiKey ? 'company-specific' : 'global'}, API version: ${resolvedApiVersion}`
    );

    // Create tools for Gemini to reason about (but not execute)
    // In hybrid mode, Gemini uses tools for reasoning but routes execution to OpenAI
    const tools = createLangChainTools(platform, {
      chat_id: chatId,
      company_id: companyId,
      platform,  // AUTHORIZATION FIX: Include platform in context for verifyAuthorization
      timezone,
      working_hours: workingHours,
    });

    // Create Gemini model WITH tools for reasoning
    // Note: @langchain/google-genai expects 'model' not 'modelName'
    // In hybrid mode: Gemini reasons about tools but doesn't execute them
    const model = new ChatGoogleGenerativeAI({
      model: String(config.gemini.chatModel),
      apiKey: String(geminiApiKey),
      temperature: 0.7,
      maxRetries: 2,
      apiVersion: resolvedApiVersion,
    });

    // Bind tools for reasoning (hybrid mode) or use without tools (single mode)
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

    // Add booking in progress context
    if (state.bookingInProgress) {
      const elapsed = Date.now() - state.bookingInProgress.timestamp;
      const minutes = Math.floor(elapsed / 60000);
      const selectionType = state.bookingInProgress.needsSelection.type;
      const options = state.bookingInProgress.needsSelection.options;

      customerContext += `\n\n---\n\n🚨 BOOKING IN PROGRESS (${minutes} min ago) - ACTION REQUIRED:

Customer was trying to book with these details:
${JSON.stringify(state.bookingInProgress.originalParams, null, 2)}

Selection needed: ${selectionType}
Available options: ${JSON.stringify(options, null, 2)}

CRITICAL INSTRUCTION:
The customer's CURRENT message is their ${selectionType} selection response.
You MUST immediately call book_appointment with:
1. ALL the original parameters from above
2. PLUS the ${selectionType}_id based on their selection:
   - If they named a ${selectionType}, find it in the options and use its "id" field
   - If they said "any"/"yes"/"ok"/"first", use the first option's "id" field

DO NOT just respond with text. You MUST call the book_appointment tool now with the selected ${selectionType}_id.`;
    }

    // Implement smart message pruning to manage token usage while preserving tool call integrity
    const MAX_MESSAGES = 15; // Keep last 15 messages to prevent token overflow
    let prunedMessages = messages;
    let conversationSummary = "";

    if (messages.length > MAX_MESSAGES) {
      // Smart pruning: preserve tool_call + result pairs to avoid validation errors
      // Gemini requires that tool messages reference preceding assistant messages with tool_calls

      // FIXED: Build dependency map first, then keep messages based on dependencies
      const messagesToKeep = new Set();
      const messageIndices = new Map(); // Map message to its index for quick lookup

      messages.forEach((msg, idx) => {
        messageIndices.set(msg, idx);
      });

      // Step 1: Always keep the last MAX_MESSAGES worth of messages as candidates
      const startIndex = Math.max(0, messages.length - MAX_MESSAGES);
      for (let i = startIndex; i < messages.length; i++) {
        messagesToKeep.add(messages[i]);
      }

      // Step 2: For each kept message, ensure its dependencies are also kept
      // This handles tool_call/result pairs that might span the boundary
      let addedDependencies = true;
      while (addedDependencies) {
        addedDependencies = false;

        for (const message of messagesToKeep) {
          const idx = messageIndices.get(message);

          // If this is a tool result, ensure its tool_call message is kept
          if (message.role === "tool" && message.tool_call_id) {
            const toolCallMsg = messages.slice(0, idx).reverse().find(
              m => m.role === "assistant" &&
                   m.tool_calls?.some(tc => tc.id === message.tool_call_id)
            );

            if (toolCallMsg && !messagesToKeep.has(toolCallMsg)) {
              messagesToKeep.add(toolCallMsg);
              addedDependencies = true;
            }
          }

          // If this is an assistant message with tool_calls, ensure all results are kept
          if (message.role === "assistant" && message.tool_calls) {
            for (const toolCall of message.tool_calls) {
              const resultMsg = messages.slice(idx + 1).find(
                m => m.role === "tool" && m.tool_call_id === toolCall.id
              );

              if (resultMsg && !messagesToKeep.has(resultMsg)) {
                messagesToKeep.add(resultMsg);
                addedDependencies = true;
              }
            }
          }
        }
      }

      // Step 3: Convert Set to ordered array
      prunedMessages = messages.filter(msg => messagesToKeep.has(msg));

      const messagesToRemove = messages.filter(msg => !messagesToKeep.has(msg));

      if (messagesToRemove.length > 0) {
        // Create summary of removed conversation - use LAST 3 user messages before pruning point
        const userMessages = messagesToRemove
          .filter(m => m.role === 'user')
          .map(m => m.content);
        const topics = userMessages.slice(-3).join('; '); // FIXED: Use last 3, not first 3

        conversationSummary = `\n\n[Earlier in conversation: ${messagesToRemove.length} messages about: ${topics}...]`;

        logger.messageFlow.info(
          platform,
          chatId,
          "message-pruning",
          `Smart pruning: removed ${messagesToRemove.length} messages, keeping ${prunedMessages.length} (preserved tool call integrity)`
        );
      }
    }

    // Prepare messages with system instructions
    // HYBRID MODE: Add explicit tool usage instructions for Gemini
    const hybridModeInstructions = `

---

IMPORTANT - TOOL USAGE INSTRUCTIONS:
You have access to the following tools for providing accurate information:
${tools.map(t => `- ${t.name}: ${t.description}`).join('\n')}

CRITICAL RULES:
1. If the user asks about appointments (booking, viewing, availability, scheduling), you MUST use the appropriate tool
2. If the user asks about services (pricing, duration, types), you MUST use get_services
3. If the user asks about business hours or availability, you MUST use get_availability
4. DO NOT make up information about appointments, services, or availability - ALWAYS use tools when available
5. Only provide text-only responses for greetings, general questions, or confirmation of tool results

BOOKING CONFIRMATION RULE (CRITICAL):
- NEVER tell the user their appointment is "scheduled", "booked", "confirmed", or "created" UNLESS you just called the book_appointment tool in THIS turn
- NEVER use phrases like "Your appointment is scheduled" or "Booking confirmed" in a text-only response
- If you haven't called book_appointment in this turn, you can only say things like "I can help you book that" or "Let me schedule that for you"
- Only confirm bookings AFTER the book_appointment tool returns success: true

TOOL DEPENDENCY RULES (CRITICAL):
- Before calling book_appointment, you MUST first call get_customer_info AND get_customer_full_name
- Before calling reschedule_appointment or cancel_appointment, you MUST first call get_customer_appointments
- The system will automatically inject missing dependencies, but you should ALWAYS call required dependencies yourself
- Required dependencies ensure you have all necessary information before performing operations

When in doubt, USE THE TOOL. It's better to use a tool than to provide potentially incorrect information.

---

BOOKING CONFLICT HANDLING:
When the book_appointment tool returns a response with "conflict": true and "all_staff_unavailable": true:
1. The response will include "get_available_times_params" with the exact parameters you need
2. You MUST immediately call the get_available_times tool with those parameters
3. Present the alternative time slots to the customer in a helpful, friendly manner
4. Apologize for the inconvenience and explain that the requested time was unavailable
5. DO NOT just say "try another time" - show the actual available slots from get_available_times

Example: "I apologize, but all our staff are booked at 9:00 AM on that date. Here are the available times I found for you: [list the time ranges]. Which of these times works best for you?"

---

LOCATION & STAFF SELECTION HANDLING (CRITICAL - NEVER AUTO-ASSIGN):
When the book_appointment tool returns "needs_selection", this means the customer must choose between multiple options.
UNDER NO CIRCUMSTANCES should you proceed with booking without explicitly asking the customer for their preference.

1. LOCATION SELECTION (needs_selection.type === "location"):
   - The company has multiple locations
   - You MUST call get_location_choices with the service_name to get the full list with addresses
   - Present ALL location options to the customer with their names and addresses
   - Ask the customer which location they prefer
   - WAIT for the customer to respond with their choice
   - Once they choose, call book_appointment again with the location_id parameter
   - Example: "We have 3 locations that offer this service: 1) Downtown (123 Main St), 2) Westside (456 Oak Ave), 3) Eastside (789 Pine Rd). Which location works best for you?"
   - PROHIBITED: Never say "I'll book you at our main location" or silently choose a location

2. STAFF SELECTION (needs_selection.type === "staff"):
   - Multiple staff members are qualified for this service at the chosen location
   - You MUST call get_staff_list with service_name, location_id, appointment_time, and duration_minutes
   - CRITICAL: ALWAYS pass appointment_time and duration_minutes to check availability
   - Present ALL available staff options to the customer
   - Ask: "We have [N] staff members available: [names]. Would you like to choose one, or should I book with the first available?"
   
   AFTER CUSTOMER RESPONDS:
   - If customer says "auto-select", "first available", "any", "no preference", or similar:
     * You MUST call get_staff_list if you haven't already in this turn to get valid staff IDs
     * Use the FIRST staff's "id" field from the get_staff_list response
     * Call book_appointment with that staff_id immediately
   
   - If customer names a specific staff member (e.g., "vinme", "Sarah", "sec groom"):
     * You MUST call get_staff_list if you haven't already in this turn to get valid staff IDs
     * Find the named staff in the get_staff_list response
     * Extract their "id" field (NOT the name)
     * Call book_appointment with that exact staff_id
     * DO NOT make up or guess staff IDs - use ONLY the "id" from get_staff_list response
   
   - CRITICAL: NEVER proceed with booking without first calling get_staff_list to get valid IDs
   - CRITICAL: NEVER use staff names or made-up IDs in book_appointment
   - CRITICAL: ALWAYS use the "id" field from get_staff_list response
   - PROHIBITED: Never present staff who are unavailable at the requested time
   - PROHIBITED: Never say "I'll assign you to Sarah" without calling book_appointment
   - PROHIBITED: Never just respond with text after customer makes selection - you MUST call book_appointment

3. MANDATORY RULES - VIOLATIONS WILL BREAK THE SYSTEM:
   - For LOCATION selection: NEVER auto-assign - ALWAYS ask the customer first
   - For STAFF selection: Auto-select first available UNLESS customer requests to choose
   - NEVER proceed with booking until you have the customer's location preference
   - Include the location_id and/or staff_id in the book_appointment call after customer chooses
   - Use the exact "id" field from the options returned by get_location_choices or get_staff_list
   - Keep the original appointment_time, service_name, and other parameters from the context
   - DO NOT confirm the booking until book_appointment returns success: true
   - If you book without proper selection, the appointment will be created incorrectly`;

    const systemMessage = {
      role: "system",
      content: `${systemInstructions}${customerContext}${conversationSummary}${hybridModeInstructions}`,
    };

    const allMessages = [systemMessage, ...prunedMessages];

    // Invoke Gemini with tools for reasoning
    logger.messageFlow.info(
      platform,
      chatId,
      "gemini-tool-reasoning",
      `Gemini reasoning with ${tools.length} available tools: ${tools.map(t => t.name).join(', ')}`
    );

    const response = await modelWithTools.invoke(allMessages);

    // Check if Gemini detected tool calls (hybrid mode)
    if (response.tool_calls && response.tool_calls.length > 0) {
      logger.messageFlow.llm(
        platform,
        chatId,
        "gemini-tool-detection",
        `Gemini detected ${response.tool_calls.length} tool calls - routing to OpenAI for execution`
      );

      // Track Gemini reasoning metrics
      const executionTime = Date.now() - startTime;
      await metricsTracker.trackAgentExecution({
        platform,
        chatId,
        companyId,
        messageCount: allMessages.length,
        toolCallsCount: response.tool_calls.length,
        executionTime,
        success: true,
        provider: "gemini-reasoning",
      });

      // Return tool calls for OpenAI to execute (hybrid handoff)
      return {
        messages: [
          {
            role: "assistant",
            content: getContentAsString(response.content),
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
        currentStep: "switch_to_openai", // Signal to route to OpenAI
        activeProvider: "gemini", // FIXED: Return state updates instead of mutating
      };
    }

    // No tool calls detected - Analyze if Gemini should have used tools
    // Get the last user message to check intent
    const lastUserMessage = prunedMessages.filter(m => m.role === 'user').slice(-1)[0];
    const userQuery = lastUserMessage?.content?.toLowerCase() || '';

    // Get Gemini's response to check if it's claiming an action was completed
    const contentText = getContentAsString(response.content);
    const geminiResponse = contentText.toLowerCase();

    // Define patterns that typically require tool usage (user intent)
    const toolRequiredPatterns = [
      /book|schedule|make.*appointment|reserve|set.*appointment/i,
      /view.*appointment|show.*appointment|my.*appointment|check.*appointment/i,
      /cancel|reschedule|change.*appointment|modify.*appointment/i,
      /available|availability|free.*time|open.*slot|when.*can/i,
      /service|price|pricing|cost|how.*much/i,
      /hour|hours|open|close|when.*open|business.*hour/i,
    ];

    // CRITICAL: Detect if Gemini is claiming a booking/action succeeded without tool execution
    // These patterns indicate Gemini is hallucinating a successful action
    // REFINED: More precise patterns to avoid false positives on helping phrases

    // FIXED: Issue #12 - Expanded helping phrase detection to reduce false positives
    // First check if this is a helping/offering phrase (should NOT trigger enforcement)
    const helpingPhrases = [
      // Offering to help patterns
      /(?:can|will|would like to|let me|i can|i'll|i will|happy to|i'd be happy to).*(?:help|assist|book|schedule)/i,
      /(?:help|assist).*(?:you|with).*(?:book|schedule)/i,

      // Question patterns (asking permission)
      /would you like.*(?:to book|me to schedule|me to check)/i,
      /shall i.*(?:book|schedule|check|look)/i,
      /do you want.*(?:to book|to schedule|me to)/i,
      /should i.*(?:book|schedule|check)/i,

      // Future tense (not claiming completion)
      /(?:i will|i'll|let me).*(?:schedule|book|check|get that)/i,
      /(?:sure|great|okay|ok).*(?:i'll|let me|i will).*(?:schedule|book|check)/i,

      // Process/availability checking phrases
      /(?:let me|i'll).*(?:check|look|see).*(?:availability|available|times)/i,
      /(?:checking|looking at|reviewing).*(?:availability|schedule|times)/i,
    ];

    const isHelpingPhrase = helpingPhrases.some(pattern => pattern.test(geminiResponse));

    // Only check for false confirmations if NOT a helping phrase
    let claimsActionCompleted = false;

    if (!isHelpingPhrase) {
      // Past tense confirmations that indicate completed action
      const actionConfirmationPatterns = [
        // English past tense confirmations
        /(?:your|the).*appointment.*(?:has been|is now|was).*(?:scheduled|booked|confirmed|created)/i,
        /(?:successfully|already).*(?:booked|scheduled|confirmed|reserved)/i,
        /booking.*(?:confirmed|successful|completed|is confirmed)/i,
        /appointment.*(?:confirmed|is scheduled|is booked)/i,
        /(?:i have|i've).*(?:booked|scheduled|confirmed).*appointment/i,

        // Georgian past tense confirmations
        /ჩაინიშნა/i, // "was scheduled" (past tense)
        /დაიჯავშნა/i, // "was booked" (past tense)
        /დადასტურდა/i, // "confirmed" (past tense)
      ];

      claimsActionCompleted = actionConfirmationPatterns.some(pattern => pattern.test(geminiResponse));
    }

    // Check if user query suggested tool usage
    const shouldHaveUsedTool = toolRequiredPatterns.some(pattern => pattern.test(userQuery));

    // FIXED: Issue #5 - Always enforce booking confirmation checks, regardless of config
    // This prevents hallucinated booking confirmations which could mislead customers
    if (claimsActionCompleted) {
      logger.messageFlow.error(
        platform,
        chatId,
        "gemini-false-booking-claim",
        new Error(`CRITICAL: Gemini claimed booking completed without tool execution: "${geminiResponse.substring(0, 100)}..."`),
        { enforcement: "MANDATORY - bypasses config setting" }
      );

      // Track that Gemini made false booking claim
      const executionTime = Date.now() - startTime;
      await metricsTracker.trackAgentExecution({
        platform,
        chatId,
        companyId,
        messageCount: allMessages.length,
        toolCallsCount: 0,
        executionTime,
        success: false,
        errorMessage: "Gemini claimed action completed without tool execution - CRITICAL SAFETY VIOLATION",
        provider: "gemini-false-booking",
      });

      // ALWAYS force routing to OpenAI for proper tool execution
      return {
        messages: [], // Don't add Gemini's false response
        currentStep: "force_openai_fallback", // Signal to route to OpenAI
        geminiResponse: getContentAsString(response.content), // Save for potential fallback
        activeProvider: "openai-fallback",
      };
    }

    // Check for other tool usage opportunities (respects config setting)
    if (shouldHaveUsedTool && config.features.enforceToolUsage) {
      logger.messageFlow.warning(
        platform,
        chatId,
        "gemini-missed-tool",
        `Gemini provided text response but query suggests tool usage: "${userQuery.substring(0, 100)}..." - Forcing OpenAI tool execution`
      );

      // Track that Gemini missed a tool opportunity
      const executionTime = Date.now() - startTime;
      await metricsTracker.trackAgentExecution({
        platform,
        chatId,
        companyId,
        messageCount: allMessages.length,
        toolCallsCount: 0,
        executionTime,
        success: false,
        errorMessage: "Gemini missed tool usage opportunity",
        provider: "gemini-missed-tool",
      });

      // Force routing to OpenAI for proper tool execution
      return {
        messages: [], // Don't add Gemini's text response
        currentStep: "force_openai_fallback", // Signal to route to OpenAI
        geminiResponse: getContentAsString(response.content), // Save for potential fallback
        activeProvider: "openai-fallback",
      };
    }

    // No tool calls detected - Gemini handles text response
    const responseContent = getContentAsString(response.content);

    logger.messageFlow.llm(
      platform,
      chatId,
      "gemini-agent-response",
      `Gemini handled text response: ${responseContent.substring(0, 50)}...`
    );

    // Track Gemini execution metrics
    const executionTime = Date.now() - startTime;
    await metricsTracker.trackAgentExecution({
      platform,
      chatId,
      companyId,
      messageCount: allMessages.length,
      toolCallsCount: 0,
      executionTime,
      success: true,
      provider: "gemini",
    });

    // SAFETY CHECK: Ensure response content is never empty
    if (!responseContent || responseContent.trim().length === 0) {
      logger.messageFlow.error(
        platform,
        chatId,
        "gemini-empty-response",
        new Error("Gemini returned empty response content"),
        {
          rawContent: JSON.stringify(response.content),
          contentType: typeof response.content,
          contentIsArray: Array.isArray(response.content)
        }
      );

      return {
        messages: [
          {
            role: "assistant",
            content: "I apologize, but I'm having trouble formulating a response right now. Could you please rephrase your question?",
          },
        ],
        assistantMessage: "I apologize, but I'm having trouble formulating a response right now. Could you please rephrase your question?",
        currentStep: "end",
        activeProvider: "gemini",
      };
    }

    logger.messageFlow.info(
      platform,
      chatId,
      "gemini-returning-response",
      `Returning assistantMessage with length: ${responseContent.length}`,
      {
        preview: responseContent.substring(0, 100),
        fullLength: responseContent.length
      }
    );

    return {
      messages: [
        {
          role: "assistant",
          content: responseContent,
        },
      ],
      assistantMessage: responseContent,
      currentStep: "end",
      activeProvider: "gemini", // FIXED: Return state updates instead of mutating
    };
  } catch (error) {
    logger.messageFlow.error(platform, chatId, "gemini-agent-node", error);

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
      provider: "gemini",
    });

    // Check if we should fallback to OpenAI
    if (config.openai.apiKey) {
      logger.messageFlow.warning(
        platform,
        chatId,
        "gemini-fallback",
        "Gemini failed, attempting fallback to OpenAI"
      );

      // Import OpenAI agent dynamically to avoid circular dependencies
      const { agentNode } = await import("./agent.js");
      return agentNode(state);
    }

    return {
      error: {
        message: error.message,
        type: "gemini_agent_error",
      },
      assistantMessage:
        "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.",
      currentStep: "end",
    };
  }
}
