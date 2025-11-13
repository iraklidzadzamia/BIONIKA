#!/usr/bin/env node

/**
 * Tool Enforcement Verification Script
 *
 * This script simulates the exact bug scenario from the logs:
 * - User wants to book an appointment
 * - Gemini tries to respond with confirmation
 * - Enforcement should catch it and force tool execution
 *
 * Usage: node scripts/verify-tool-enforcement.js
 */

import { config } from '../config/env.js';
import { createConversationGraph } from '../langgraph/graph.js';
import logger from '../utils/logger.js';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(color, ...args) {
  console.log(color, ...args, colors.reset);
}

async function verifyToolEnforcement() {
  log(colors.cyan, '\n🔍 Tool Enforcement Verification');
  log(colors.cyan, '=================================\n');

  // 1. Check configuration
  log(colors.blue, '1. Checking Configuration...');
  log(colors.reset, '  - USE_GEMINI:', config.features.useGemini ? '✅' : '❌');
  log(colors.reset, '  - OpenAI API Key:', config.openai.apiKey ? '✅' : '❌');
  log(colors.reset, '  - ENFORCE_TOOL_USAGE:', config.features.enforceToolUsage ? '✅' : '❌');

  if (!config.features.useGemini) {
    log(colors.red, '\n❌ FAIL: USE_GEMINI must be true for hybrid mode');
    process.exit(1);
  }

  if (!config.openai.apiKey) {
    log(colors.red, '\n❌ FAIL: OPENAI_API_KEY must be set for hybrid mode');
    process.exit(1);
  }

  if (!config.features.enforceToolUsage) {
    log(colors.yellow, '\n⚠️  WARNING: ENFORCE_TOOL_USAGE is disabled');
    log(colors.yellow, '   The fix will not prevent false confirmations!');
    log(colors.yellow, '   Set ENFORCE_TOOL_USAGE=true in .env file');
  }

  // 2. Create graph
  log(colors.blue, '\n2. Creating Conversation Graph...');
  const graph = createConversationGraph();
  log(colors.green, '  ✅ Graph created successfully');

  // 3. Test scenario: Booking request
  log(colors.blue, '\n3. Testing Booking Request Scenario...');
  log(colors.reset, '  Simulating user message: "I want to book a nail trim tomorrow at 2pm"');

  const testInput = {
    chatId: 'test-verification-001',
    platform: 'facebook',
    companyId: 'test-company',
    timezone: 'UTC',
    fullName: 'Test User',
    phoneNumber: '+1234567890',
    workingHours: [
      { weekday: 1, startTime: '09:00', endTime: '17:00' },
      { weekday: 2, startTime: '09:00', endTime: '17:00' },
      { weekday: 3, startTime: '09:00', endTime: '17:00' },
      { weekday: 4, startTime: '09:00', endTime: '17:00' },
      { weekday: 5, startTime: '09:00', endTime: '17:00' },
    ],
    systemInstructions: 'You are a helpful pet care assistant for a grooming salon.',
    messages: [
      {
        role: 'user',
        content: 'I want to book a nail trim for my dog tomorrow at 2pm'
      }
    ]
  };

  try {
    log(colors.reset, '  Invoking conversation graph...');
    const result = await graph.invoke(testInput, { recursionLimit: 25 });

    log(colors.green, '\n  ✅ Graph invocation completed');

    // 4. Analyze results
    log(colors.blue, '\n4. Analyzing Results...');

    const responseText = result.assistantMessage?.toLowerCase() || '';
    const messages = result.messages || [];

    // Check for booking confirmation language
    const confirmationPatterns = [
      /appointment.*(?:scheduled|booked|confirmed|created|set)/i,
      /(?:scheduled|booked|confirmed|created|set).*appointment/i,
      /booking.*(?:confirmed|successful|complete)/i,
      /successfully.*(?:booked|scheduled|reserved)/i,
    ];

    const hasConfirmation = confirmationPatterns.some(pattern => pattern.test(responseText));

    log(colors.reset, '\n  Response Analysis:');
    log(colors.reset, '  ----------------');
    log(colors.reset, `  Contains booking confirmation: ${hasConfirmation ? 'YES' : 'NO'}`);
    log(colors.reset, `  Response length: ${result.assistantMessage?.length || 0} chars`);
    log(colors.reset, `  Message count: ${messages.length}`);

    // Check for tool execution
    const toolMessages = messages.filter(m => m.role === 'tool');
    const bookingToolMessage = toolMessages.find(m => m.name === 'book_appointment');

    log(colors.reset, `\n  Tool Execution:`);
    log(colors.reset, '  ----------------');
    log(colors.reset, `  Total tool calls: ${toolMessages.length}`);
    log(colors.reset, `  book_appointment executed: ${bookingToolMessage ? 'YES' : 'NO'}`);

    if (bookingToolMessage) {
      try {
        const toolResult = JSON.parse(bookingToolMessage.content);
        log(colors.reset, `  Tool result success: ${toolResult.success ? 'YES' : 'NO'}`);
        if (toolResult.conflict) {
          log(colors.yellow, '  ⚠️  Booking conflict detected');
        }
      } catch (e) {
        log(colors.yellow, '  ⚠️  Could not parse tool result');
      }
    }

    // 5. Validate enforcement
    log(colors.blue, '\n5. Validation Results:');
    log(colors.reset, '  ==================');

    let passedValidation = true;

    if (hasConfirmation && !bookingToolMessage) {
      log(colors.red, '  ❌ FAIL: Booking confirmed without tool execution!');
      log(colors.red, '     This is the bug we\'re trying to fix.');
      passedValidation = false;
    } else if (hasConfirmation && bookingToolMessage) {
      log(colors.green, '  ✅ PASS: Booking confirmed after tool execution');
      log(colors.green, '     Tool enforcement is working correctly!');
    } else if (!hasConfirmation) {
      log(colors.yellow, '  ⚠️  No booking confirmation in response');
      log(colors.reset, '     This could mean:');
      log(colors.reset, '     - Bot is asking for more information');
      log(colors.reset, '     - Tool execution failed');
      log(colors.reset, '     - Response was a general question');

      if (bookingToolMessage) {
        log(colors.green, '  ✅ But tool was still executed (good!)');
      } else {
        log(colors.yellow, '  ⚠️  And no tool was executed');
        if (config.features.enforceToolUsage) {
          log(colors.red, '  ❌ FAIL: Enforcement should have triggered!');
          passedValidation = false;
        }
      }
    }

    // 6. Print sample response
    log(colors.blue, '\n6. Sample Response:');
    log(colors.reset, '  ===============');
    log(colors.reset, `  "${result.assistantMessage?.substring(0, 200)}..."`);

    // 7. Final verdict
    log(colors.blue, '\n7. Final Verdict:');
    log(colors.reset, '  ==============');

    if (passedValidation && config.features.enforceToolUsage) {
      log(colors.green, '  ✅ PASS: Tool enforcement is working correctly!');
      log(colors.green, '     The fix prevents false booking confirmations.');
      return 0;
    } else if (passedValidation && !config.features.enforceToolUsage) {
      log(colors.yellow, '  ⚠️  CONDITIONAL PASS: No enforcement issues detected');
      log(colors.yellow, '     However, ENFORCE_TOOL_USAGE is disabled.');
      log(colors.yellow, '     Enable it to fully protect against false confirmations.');
      return 1;
    } else {
      log(colors.red, '  ❌ FAIL: Tool enforcement is NOT working!');
      log(colors.red, '     The fix did not prevent false booking confirmation.');
      return 1;
    }

  } catch (error) {
    log(colors.red, '\n❌ ERROR during verification:');
    log(colors.red, `  ${error.message}`);
    if (config.isDevelopment) {
      console.error(error);
    }
    return 1;
  }
}

// Run verification
verifyToolEnforcement()
  .then(exitCode => {
    log(colors.reset, '\n');
    process.exit(exitCode);
  })
  .catch(error => {
    log(colors.red, '\n❌ Unexpected error:');
    console.error(error);
    process.exit(1);
  });
