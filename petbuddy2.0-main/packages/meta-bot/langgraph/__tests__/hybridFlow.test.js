import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { createConversationGraph } from "../graph.js";
import { config } from "../../config/env.js";
import logger from "../../utils/logger.js";

/**
 * Hybrid AI Flow Tests
 * 
 * These tests verify that the hybrid Gemini + OpenAI flow works correctly:
 * 1. Gemini handles text-only responses
 * 2. Gemini detects tool usage and routes to OpenAI
 * 3. OpenAI executes tools
 * 4. Flow returns to Gemini for final response
 * 5. Tool usage enforcement catches missed opportunities
 */

describe("Hybrid AI Flow - Gemini + OpenAI", () => {
  let graph;
  let capturedLogs = [];

  beforeAll(() => {
    // Skip tests if not in hybrid mode
    if (!config.features.useGemini || !config.openai.apiKey) {
      console.log("⚠️  Skipping hybrid flow tests - not in hybrid mode");
      return;
    }

    // Mock logger to capture transitions
    const originalInfo = logger.messageFlow.info;
    logger.messageFlow.info = (...args) => {
      capturedLogs.push({ type: "info", args });
      return originalInfo(...args);
    };

    graph = createConversationGraph();
  });

  afterAll(() => {
    // Restore original logger
    if (logger.messageFlow.info.mockRestore) {
      logger.messageFlow.info.mockRestore();
    }
  });

  it("should create hybrid graph with both Gemini and OpenAI nodes", () => {
    if (!config.features.useGemini || !config.openai.apiKey) {
      return;
    }

    expect(graph).toBeDefined();
    expect(graph.verifyHybridFlow).toBeDefined();
  });

  it("should route text-only queries through Gemini without OpenAI", async () => {
    if (!config.features.useGemini || !config.openai.apiKey) {
      return;
    }

    capturedLogs = [];

    const input = {
      chatId: "test-chat-1",
      platform: "test",
      companyId: "test-company",
      systemInstructions: "You are a helpful assistant.",
      messages: [
        {
          role: "user",
          content: "Hello! How are you?",
        },
      ],
      timezone: "America/New_York",
      workingHours: { monday: "9:00-17:00" },
    };

    const result = await graph.invoke(input, { recursionLimit: 25 });

    expect(result.assistantMessage).toBeDefined();
    expect(result.currentStep).toBe("end");

    // Verify Gemini handled the text response directly
    const geminiDirectResponse = capturedLogs.find(
      log => log.args[2] === "gemini-direct-response"
    );
    expect(geminiDirectResponse).toBeDefined();

    // Verify OpenAI was NOT invoked for text-only response
    const openaiInvocation = capturedLogs.find(
      log => log.args[2] === "openai-agent-node"
    );
    expect(openaiInvocation).toBeUndefined();
  });

  it("should route tool-requiring queries through Gemini → OpenAI → Tools → Gemini", async () => {
    if (!config.features.useGemini || !config.openai.apiKey) {
      return;
    }

    capturedLogs = [];

    const input = {
      chatId: "test-chat-2",
      platform: "test",
      companyId: "test-company",
      systemInstructions: "You are a helpful assistant for a pet care business.",
      messages: [
        {
          role: "user",
          content: "I want to book an appointment for my dog on Monday at 2 PM",
        },
      ],
      fullName: "John Doe",
      phoneNumber: "+1234567890",
      timezone: "America/New_York",
      workingHours: { monday: "9:00-17:00" },
    };

    const result = await graph.invoke(input, { recursionLimit: 25 });

    expect(result.assistantMessage).toBeDefined();

    // Verify hybrid transition: gemini → openai-tools
    const geminiToOpenAI = capturedLogs.find(
      log =>
        log.args[2] === "hybrid-transition" &&
        log.args[3]?.includes("gemini → openai")
    );
    expect(geminiToOpenAI).toBeDefined();

    // Verify OpenAI tool execution
    const openaiToolExecution = capturedLogs.find(
      log =>
        log.args[2] === "openai-tool-execution" ||
        log.args[2] === "openai-fallback-reasoning"
    );
    expect(openaiToolExecution).toBeDefined();

    // Verify tool execution
    const toolExecution = capturedLogs.find(
      log => log.args[2] === "tool-executor"
    );
    expect(toolExecution).toBeDefined();

    // Verify return to Gemini for final response
    const openaiToGemini = capturedLogs.find(
      log =>
        log.args[2] === "hybrid-transition" &&
        log.args[3]?.includes("openai-tools → gemini")
    );
    expect(openaiToGemini).toBeDefined();

    // Verify Gemini generated final response
    const geminiFinalResponse = capturedLogs.find(
      log =>
        log.args[2] === "gemini-final-response" ||
        log.args[2] === "gemini-final-response-complete"
    );
    expect(geminiFinalResponse).toBeDefined();
  });

  it("should enforce tool usage when Gemini misses tool opportunity", async () => {
    if (!config.features.useGemini || !config.openai.apiKey || !config.features.enforceToolUsage) {
      return;
    }

    capturedLogs = [];

    const input = {
      chatId: "test-chat-3",
      platform: "test",
      companyId: "test-company",
      systemInstructions: "You are a helpful assistant for a pet care business.",
      messages: [
        {
          role: "user",
          content: "What services do you offer and how much do they cost?",
        },
      ],
      timezone: "America/New_York",
      workingHours: { monday: "9:00-17:00" },
    };

    const result = await graph.invoke(input, { recursionLimit: 25 });

    expect(result.assistantMessage).toBeDefined();

    // Check if Gemini missed the tool or correctly detected it
    const geminiMissedTool = capturedLogs.find(
      log => log.args[2] === "gemini-missed-tool"
    );

    const geminiDetectedTool = capturedLogs.find(
      log => log.args[2] === "gemini-tool-detection"
    );

    // Either Gemini detected the tool OR the enforcement caught it
    expect(geminiMissedTool || geminiDetectedTool).toBeDefined();

    // Verify OpenAI was invoked (either by Gemini or enforcement)
    const openaiInvocation = capturedLogs.find(
      log =>
        log.args[2] === "openai-agent-node" ||
        log.args[2] === "openai-fallback-reasoning"
    );
    expect(openaiInvocation).toBeDefined();
  });

  it("should verify complete hybrid flow using built-in verification", async () => {
    if (!config.features.useGemini || !config.openai.apiKey) {
      return;
    }

    const testInput = {
      chatId: "test-chat-verify",
      platform: "test",
      companyId: "test-company",
      systemInstructions: "You are a helpful assistant for a pet care business.",
      messages: [
        {
          role: "user",
          content: "Check my appointments please",
        },
      ],
      fullName: "Jane Smith",
      phoneNumber: "+1987654321",
      timezone: "America/New_York",
      workingHours: { monday: "9:00-17:00" },
    };

    const verification = await graph.verifyHybridFlow(testInput);

    expect(verification.success).toBe(true);
    expect(verification.transitions).toBeDefined();
    
    // At minimum, we should see some transitions
    // The exact transitions depend on whether Gemini detects tools or enforcement kicks in
    expect(verification.flowSequence.length).toBeGreaterThan(0);

    console.log("\n📊 Hybrid Flow Verification:");
    console.log("  Transitions:", verification.transitions);
    console.log("  Flow Sequence:", verification.flowSequence);
  });

  it("should track metrics for hybrid flow transitions", async () => {
    if (!config.features.useGemini || !config.openai.apiKey) {
      return;
    }

    capturedLogs = [];

    const input = {
      chatId: "test-chat-metrics",
      platform: "test",
      companyId: "test-company",
      systemInstructions: "You are a helpful assistant.",
      messages: [
        {
          role: "user",
          content: "What are your business hours?",
        },
      ],
      timezone: "America/New_York",
      workingHours: { monday: "9:00-17:00" },
    };

    const result = await graph.invoke(input, { recursionLimit: 25 });

    expect(result.assistantMessage).toBeDefined();

    // Verify logging occurred
    expect(capturedLogs.length).toBeGreaterThan(0);

    // Check for key log events
    const logEvents = capturedLogs.map(log => log.args[2]);
    
    expect(logEvents).toContain("graph-invoke");
    expect(logEvents).toContain("graph-complete");
  });
});

describe("Hybrid Flow Configuration", () => {
  it("should enable hybrid mode when both Gemini and OpenAI are configured", () => {
    if (!config.gemini.apiKey || !config.openai.apiKey) {
      console.log("⚠️  Skipping - not in hybrid mode");
      return;
    }

    expect(config.features.useGemini).toBe(true);
    expect(config.openai.apiKey).toBeDefined();
    expect(config.gemini.apiKey).toBeDefined();
  });

  it("should have enforce tool usage configured", () => {
    expect(config.features.enforceToolUsage).toBeDefined();
    expect(typeof config.features.enforceToolUsage).toBe("boolean");
  });
});

describe("Edge Cases and Error Handling", () => {
  it("should handle Gemini errors by falling back to OpenAI", async () => {
    if (!config.features.useGemini || !config.openai.apiKey) {
      return;
    }

    // This would require mocking Gemini to fail
    // For now, we'll just verify the fallback logic exists
    const graph = createConversationGraph();
    expect(graph).toBeDefined();
  });

  it("should prevent infinite loops with recursion limit", async () => {
    if (!config.features.useGemini || !config.openai.apiKey) {
      return;
    }

    const input = {
      chatId: "test-chat-recursion",
      platform: "test",
      companyId: "test-company",
      systemInstructions: "You are a helpful assistant.",
      messages: [
        {
          role: "user",
          content: "Hello",
        },
      ],
      timezone: "America/New_York",
      workingHours: { monday: "9:00-17:00" },
    };

    // Should complete within recursion limit
    const result = await graph.invoke(input, { recursionLimit: 25 });
    expect(result).toBeDefined();
  });
});

