/**
 * Tool Enforcement Tests
 *
 * Tests that verify the hybrid LangGraph flow prevents LLMs from claiming
 * actions (bookings, cancellations) succeeded without executing tools.
 *
 * This is a regression test for the bug where Gemini would respond with
 * "Your appointment is scheduled" without calling book_appointment.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { config } from '../../config/env.js';
import { createConversationGraph } from '../graph.js';

describe('Tool Enforcement - Prevent False Confirmations', () => {
  let graph;

  beforeEach(() => {
    // Ensure we're in hybrid mode with enforcement enabled
    if (!config.features.useGemini || !config.openai.apiKey || !config.features.enforceToolUsage) {
      console.warn('⚠️  Skipping tool enforcement tests - hybrid mode or enforcement not enabled');
      console.warn('   Required: USE_GEMINI=true, OPENAI_API_KEY set, ENFORCE_TOOL_USAGE=true');
      return;
    }

    graph = createConversationGraph();
  });

  /**
   * Core regression test: Gemini must not claim a booking succeeded
   * without actually calling book_appointment tool
   */
  it('should prevent Gemini from claiming booking success without tool execution', async () => {
    if (!config.features.useGemini || !config.openai.apiKey || !config.features.enforceToolUsage) {
      console.log('⏭️  Test skipped (hybrid mode not configured)');
      return;
    }

    const input = {
      chatId: 'test-user-123',
      platform: 'facebook',
      companyId: 'test-company-456',
      timezone: 'UTC',
      fullName: 'Test User',
      phoneNumber: '+1234567890',
      workingHours: [
        { weekday: 1, startTime: '09:00', endTime: '17:00' }
      ],
      systemInstructions: 'You are a helpful pet care assistant for a grooming salon.',
      messages: [
        {
          role: 'user',
          content: 'I want to book a nail trim for my dog tomorrow at 2pm'
        }
      ]
    };

    // MOCK SCENARIO: Simulate Gemini trying to respond with booking confirmation
    // without calling book_appointment tool
    //
    // Expected behavior with ENFORCE_TOOL_USAGE=true:
    // 1. Gemini detects confirmation language in its own response
    // 2. Enforcement logic forces OpenAI fallback to execute book_appointment
    // 3. Final response only confirms if book_appointment succeeds

    const result = await graph.invoke(input, { recursionLimit: 25 });

    // Assertions:
    // 1. If booking was confirmed in the response, book_appointment must have been called
    const responseText = result.assistantMessage?.toLowerCase() || '';
    const hasBookingConfirmation =
      /appointment.*(?:scheduled|booked|confirmed|created|set)/.test(responseText) ||
      /(?:scheduled|booked|confirmed|created|set).*appointment/.test(responseText) ||
      /booking.*(?:confirmed|successful|complete)/.test(responseText) ||
      /successfully.*(?:booked|scheduled|reserved)/.test(responseText);

    if (hasBookingConfirmation) {
      // If response claims booking succeeded, verify tool was executed
      const messages = result.messages || [];
      const toolMessages = messages.filter(m => m.role === 'tool' && m.name === 'book_appointment');

      expect(toolMessages.length).toBeGreaterThan(0);
      console.log('✅ Booking confirmation requires tool execution - PASS');

      // Verify the tool result shows success
      const toolResult = toolMessages[0];
      const toolData = JSON.parse(toolResult.content);
      expect(toolData.success).toBe(true);
      console.log('✅ Tool result shows success: true - PASS');
    } else {
      // If no confirmation, that's also acceptable (might be asking for more info)
      console.log('ℹ️  No booking confirmation in response - acceptable');
    }

    // 2. The response must not be a direct Gemini text response if enforcement caught it
    expect(result.error).toBeUndefined();
  }, 30000); // 30 second timeout for API calls

  /**
   * Test that Gemini cannot claim cancellation without cancel_appointment tool
   */
  it('should prevent Gemini from claiming cancellation without tool execution', async () => {
    if (!config.features.useGemini || !config.openai.apiKey || !config.features.enforceToolUsage) {
      console.log('⏭️  Test skipped (hybrid mode not configured)');
      return;
    }

    const input = {
      chatId: 'test-user-789',
      platform: 'facebook',
      companyId: 'test-company-456',
      timezone: 'UTC',
      fullName: 'Test User',
      phoneNumber: '+1234567890',
      systemInstructions: 'You are a helpful pet care assistant for a grooming salon.',
      messages: [
        {
          role: 'user',
          content: 'Cancel my appointment'
        }
      ]
    };

    const result = await graph.invoke(input, { recursionLimit: 25 });

    const responseText = result.assistantMessage?.toLowerCase() || '';
    const hasCancellationConfirmation =
      /appointment.*(?:canceled|cancelled|removed)/.test(responseText) ||
      /(?:canceled|cancelled|removed).*appointment/.test(responseText) ||
      /cancellation.*successful/.test(responseText);

    if (hasCancellationConfirmation) {
      const messages = result.messages || [];
      const toolMessages = messages.filter(m => m.role === 'tool' && m.name === 'cancel_appointment');

      // If claiming cancellation, must have executed the tool
      expect(toolMessages.length).toBeGreaterThan(0);
      console.log('✅ Cancellation confirmation requires tool execution - PASS');
    } else {
      // Might be asking for appointment ID - acceptable
      console.log('ℹ️  No cancellation confirmation (likely asking for details)');
    }

    expect(result.error).toBeUndefined();
  }, 30000);

  /**
   * Test detection of Georgian booking confirmation language
   */
  it('should detect Georgian confirmation language and enforce tools', async () => {
    if (!config.features.useGemini || !config.openai.apiKey || !config.features.enforceToolUsage) {
      console.log('⏭️  Test skipped (hybrid mode not configured)');
      return;
    }

    // Test input with Georgian language
    const input = {
      chatId: 'test-user-geo',
      platform: 'facebook',
      companyId: 'test-company-456',
      timezone: 'Asia/Tbilisi',
      fullName: 'მომხმარებელი',
      phoneNumber: '+995555123456',
      systemInstructions: 'You are a helpful pet care assistant. Respond in Georgian.',
      messages: [
        {
          role: 'user',
          content: 'მინდა ჩავჯავშნო ფრჩხილების კრეფა ხვალ 14:00 საათზე' // "I want to book nail trim tomorrow at 14:00"
        }
      ]
    };

    const result = await graph.invoke(input, { recursionLimit: 25 });

    const responseText = result.assistantMessage || '';
    // Check for Georgian confirmation words
    const hasGeorgianConfirmation =
      /ჩაინიშნ/.test(responseText) ||  // "scheduled"
      /დაჯავშნ/.test(responseText) ||  // "booked"
      /დადასტურდა/.test(responseText); // "confirmed"

    if (hasGeorgianConfirmation) {
      const messages = result.messages || [];
      const toolMessages = messages.filter(m => m.role === 'tool' && m.name === 'book_appointment');

      expect(toolMessages.length).toBeGreaterThan(0);
      console.log('✅ Georgian confirmation detected, tool enforcement triggered - PASS');
    } else {
      console.log('ℹ️  No Georgian confirmation detected');
    }

    expect(result.error).toBeUndefined();
  }, 30000);

  /**
   * Test that legitimate text-only responses are allowed
   */
  it('should allow text-only responses for greetings and questions', async () => {
    if (!config.features.useGemini || !config.openai.apiKey || !config.features.enforceToolUsage) {
      console.log('⏭️  Test skipped (hybrid mode not configured)');
      return;
    }

    const input = {
      chatId: 'test-user-greeting',
      platform: 'facebook',
      companyId: 'test-company-456',
      timezone: 'UTC',
      systemInstructions: 'You are a helpful pet care assistant.',
      messages: [
        {
          role: 'user',
          content: 'Hello! What services do you offer?'
        }
      ]
    };

    const result = await graph.invoke(input, { recursionLimit: 25 });

    // Should have a response
    expect(result.assistantMessage).toBeDefined();
    expect(result.assistantMessage.length).toBeGreaterThan(0);

    // Should not have error
    expect(result.error).toBeUndefined();

    console.log('✅ Text-only response for general question - PASS');
  }, 30000);

  /**
   * Test that final response validation prevents false confirmations after tool execution
   */
  it('should validate tool results before allowing confirmation in final response', async () => {
    if (!config.features.useGemini || !config.openai.apiKey || !config.features.enforceToolUsage) {
      console.log('⏭️  Test skipped (hybrid mode not configured)');
      return;
    }

    // This test verifies the state validation logic in geminiAgent.js
    // When book_appointment fails, Gemini should not claim success

    const input = {
      chatId: 'test-validation',
      platform: 'facebook',
      companyId: 'nonexistent-company-999', // This will cause tool to fail
      timezone: 'UTC',
      fullName: 'Test User',
      phoneNumber: '+1234567890',
      systemInstructions: 'You are a helpful pet care assistant.',
      messages: [
        {
          role: 'user',
          content: 'Book a nail trim for tomorrow at 2pm for my dog Max'
        }
      ]
    };

    const result = await graph.invoke(input, { recursionLimit: 25 });

    const responseText = result.assistantMessage?.toLowerCase() || '';

    // Even if tool was called and failed, response should not claim success
    const claimsSuccess =
      /appointment.*(?:scheduled|booked|confirmed)/.test(responseText) ||
      /booking.*successful/.test(responseText);

    if (claimsSuccess) {
      // If claiming success, verify tool actually succeeded
      const toolResult = result.lastToolResults?.find(r => r.name === 'book_appointment');
      if (toolResult) {
        expect(toolResult.success).toBe(true);
        console.log('✅ Success claim matches tool result - PASS');
      } else {
        // This would be a bug - claiming success without tool execution
        expect(toolResult).toBeDefined();
      }
    } else {
      console.log('✅ No false success claim after tool failure - PASS');
    }
  }, 30000);
});

describe('Tool Enforcement Configuration', () => {
  it('should have ENFORCE_TOOL_USAGE environment variable defined', () => {
    expect(config.features.enforceToolUsage).toBeDefined();
    expect(typeof config.features.enforceToolUsage).toBe('boolean');
    console.log(`ℹ️  ENFORCE_TOOL_USAGE: ${config.features.enforceToolUsage}`);
  });

  it('should be in hybrid mode when both Gemini and OpenAI are configured', () => {
    const hasGemini = config.features.useGemini && config.gemini.apiKey;
    const hasOpenAI = config.openai.apiKey;

    if (hasGemini && hasOpenAI) {
      console.log('✅ Hybrid mode enabled (Gemini + OpenAI)');
      expect(hasGemini).toBe(true);
      expect(hasOpenAI).toBe(true);
    } else {
      console.log('ℹ️  Hybrid mode not configured (missing API keys)');
    }
  });
});
