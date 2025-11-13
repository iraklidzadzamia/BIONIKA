#!/usr/bin/env node

/**
 * Hybrid Flow Verification Script
 * 
 * This script tests the hybrid Gemini + OpenAI flow to verify:
 * 1. Gemini handles text-only responses
 * 2. Tool-requiring queries route through OpenAI
 * 3. Proper transitions and logging
 * 
 * Usage:
 *   node scripts/verifyHybridFlow.js
 */

import { createConversationGraph } from "../langgraph/graph.js";
import { config } from "../config/env.js";
import logger from "../utils/logger.js";

// Test scenarios
const TEST_SCENARIOS = [
  {
    name: "Text-Only Response (Gemini Direct)",
    description: "Should route through Gemini only, no OpenAI involvement",
    input: {
      chatId: "verify-text-only",
      platform: "test",
      companyId: "test-company",
      systemInstructions: "You are a helpful assistant for a pet care business.",
      messages: [
        { role: "user", content: "Hello! How are you today?" }
      ],
      timezone: "America/New_York",
      workingHours: { monday: "9:00-17:00" },
    },
    expectedTransitions: {
      geminiToOpenAI: false,
      openAiToolExecution: false,
      openAiToGemini: false,
      geminiFinalResponse: false, // Should be gemini-direct-response instead
    },
  },
  {
    name: "Tool-Required Query (Full Hybrid Flow)",
    description: "Should route: Gemini → OpenAI → Tools → Gemini",
    input: {
      chatId: "verify-tool-flow",
      platform: "test",
      companyId: "test-company",
      systemInstructions: "You are a helpful assistant for a pet care business.",
      messages: [
        { role: "user", content: "I want to book an appointment for my dog on Monday at 2 PM" }
      ],
      fullName: "Test User",
      phoneNumber: "+1234567890",
      timezone: "America/New_York",
      workingHours: { monday: "9:00-17:00" },
    },
    expectedTransitions: {
      geminiToOpenAI: true,
      openAiToolExecution: true,
      openAiToGemini: true,
      geminiFinalResponse: true,
    },
  },
  {
    name: "Service Inquiry (Tool Enforcement Test)",
    description: "Should use get_services tool (either Gemini detects or enforcement catches)",
    input: {
      chatId: "verify-enforcement",
      platform: "test",
      companyId: "test-company",
      systemInstructions: "You are a helpful assistant for a pet care business.",
      messages: [
        { role: "user", content: "What services do you offer and how much do they cost?" }
      ],
      timezone: "America/New_York",
      workingHours: { monday: "9:00-17:00" },
    },
    expectedTransitions: {
      geminiToOpenAI: true, // Should be routed to OpenAI (either way)
      openAiToolExecution: true,
      openAiToGemini: true,
      geminiFinalResponse: true,
    },
  },
];

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(color, ...args) {
  console.log(color + args.join(" ") + colors.reset);
}

async function runVerification() {
  log(colors.bright + colors.cyan, "\n🔍 Hybrid Flow Verification");
  log(colors.cyan, "=".repeat(60));

  // Check configuration
  log(colors.blue, "\n📋 Configuration Check:");
  log(colors.reset, "  - USE_GEMINI:", config.features.useGemini ? "✅" : "❌");
  log(colors.reset, "  - OPENAI_API_KEY:", config.openai.apiKey ? "✅" : "❌");
  log(colors.reset, "  - GEMINI_API_KEY:", config.gemini.apiKey ? "✅" : "❌");
  log(colors.reset, "  - ENFORCE_TOOL_USAGE:", config.features.enforceToolUsage ? "✅" : "❌");

  const isHybridMode = config.features.useGemini && config.openai.apiKey;
  
  if (!isHybridMode) {
    log(colors.red, "\n❌ Hybrid mode not enabled!");
    log(colors.yellow, "   Please set USE_GEMINI=true and provide both API keys.");
    process.exit(1);
  }

  log(colors.green, "\n✅ Hybrid mode enabled!\n");

  // Create graph
  const graph = createConversationGraph();

  // Run test scenarios
  const results = [];

  for (let i = 0; i < TEST_SCENARIOS.length; i++) {
    const scenario = TEST_SCENARIOS[i];
    
    log(colors.bright + colors.blue, `\n${i + 1}. ${scenario.name}`);
    log(colors.reset, `   ${scenario.description}`);
    log(colors.cyan, "   " + "─".repeat(58));

    try {
      const verification = await graph.verifyHybridFlow(scenario.input);

      if (verification.success) {
        log(colors.green, "   ✅ Execution successful");

        // Check transitions
        const transitions = verification.transitions;
        let allExpectedMet = true;

        for (const [key, expected] of Object.entries(scenario.expectedTransitions)) {
          const actual = transitions[key];
          const met = expected === actual;

          if (!met) {
            allExpectedMet = false;
          }

          const icon = met ? "✅" : "❌";
          const label = key.replace(/([A-Z])/g, " $1").toLowerCase();
          log(colors.reset, `   ${icon} ${label}: ${actual} (expected: ${expected})`);
        }

        // Show flow sequence
        if (verification.flowSequence.length > 0) {
          log(colors.cyan, "\n   Flow Sequence:");
          verification.flowSequence.forEach((step, idx) => {
            log(colors.reset, `   ${idx + 1}. ${step.event}: ${step.message.substring(0, 70)}...`);
          });
        }

        results.push({
          name: scenario.name,
          success: allExpectedMet,
          transitions: transitions,
        });
      } else {
        log(colors.red, "   ❌ Execution failed:", verification.error);
        results.push({
          name: scenario.name,
          success: false,
          error: verification.error,
        });
      }
    } catch (error) {
      log(colors.red, "   ❌ Error:", error.message);
      results.push({
        name: scenario.name,
        success: false,
        error: error.message,
      });
    }

    // Wait a bit between tests to avoid rate limits
    if (i < TEST_SCENARIOS.length - 1) {
      log(colors.yellow, "\n   ⏳ Waiting 2 seconds before next test...");
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Summary
  log(colors.bright + colors.cyan, "\n" + "=".repeat(60));
  log(colors.bright + colors.cyan, "📊 Verification Summary");
  log(colors.cyan, "=".repeat(60));

  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;

  results.forEach((result, idx) => {
    const icon = result.success ? "✅" : "❌";
    const color = result.success ? colors.green : colors.red;
    log(color, `${icon} Test ${idx + 1}: ${result.name}`);
  });

  log(colors.cyan, "\n" + "─".repeat(60));
  
  if (successCount === totalCount) {
    log(colors.bright + colors.green, `\n🎉 All tests passed! (${successCount}/${totalCount})`);
    log(colors.green, "   Hybrid flow is working correctly!");
    process.exit(0);
  } else {
    log(colors.bright + colors.yellow, `\n⚠️  Some tests failed (${successCount}/${totalCount} passed)`);
    log(colors.yellow, "   Please review the logs above for details.");
    process.exit(1);
  }
}

// Run verification
runVerification().catch(error => {
  log(colors.red, "\n❌ Verification script failed:");
  console.error(error);
  process.exit(1);
});

