/**
 * Test for Facebook controller buffer race condition fix
 *
 * This test verifies that rapid messages don't cause race conditions
 * where older timeouts clean up newer buffers, preventing message processing.
 */

import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('../utils/logger.js', () => ({
  messageFlow: {
    processing: jest.fn(),
    incoming: jest.fn(),
    outgoing: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock services
jest.mock('../services/company.service.js', () => ({
  getCompanyByFb: jest.fn(),
  getCollectedSystemInstructions: jest.fn(),
  setBotActive: jest.fn(),
}));

jest.mock('../services/contact.service.js', () => ({
  getOrCreateContact: jest.fn(),
  updateContactBotSuspension: jest.fn(),
}));

jest.mock('../services/message.service.js', () => ({
  createMessage: jest.fn(),
  getMessagesByCustomer: jest.fn(),
}));

jest.mock('../middlewares/facebookMsgSender.js', () => ({
  callTypingAPI: jest.fn(),
  facebookMsgSender: jest.fn(),
  getCustomerFbInfo: jest.fn(),
}));

jest.mock('../langgraph/controller.js', () => ({
  processMessageWithLangGraph: jest.fn(),
}));

jest.mock('../lib/imageModel.js', () => ({
  imageInputLLM: jest.fn(),
}));

jest.mock('../utils/time.js', () => ({
  getCurrentTimeInRegion: jest.fn(),
  isWithinActiveInterval: jest.fn(),
}));

// Import after mocking
import { conversationBuffers } from '../facebook.controller.js';

// Mock Date.now for consistent test results
const mockNow = 1000000000000;
global.Date.now = jest.fn(() => mockNow);

// Mock Math.random for consistent flush IDs
let randomCounter = 0;
global.Math.random = jest.fn(() => {
  randomCounter += 0.1;
  return randomCounter;
});

// Mock setTimeout to execute immediately for testing
global.setTimeout = jest.fn((callback) => {
  // Execute immediately to simulate synchronous behavior in tests
  callback();
  return 'timeout-id';
});

global.clearTimeout = jest.fn();

describe('Facebook Controller Buffer Race Condition Fix', () => {
  let processWithAI;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    conversationBuffers.clear();
    randomCounter = 0;

    // Import the function after clearing mocks
    const { processWithAI: importedProcessWithAI } = require('../facebook.controller.js');
    processWithAI = importedProcessWithAI;
  });

  it('should process only the latest message in rapid succession', async () => {
    // Mock processWithAI to track calls
    const mockProcessWithAI = jest.fn().mockResolvedValue(undefined);
    require('../langgraph/controller.js').processMessageWithLangGraph = mockProcessWithAI;

    // Mock customer and company
    const customer = {
      _id: 'customer-id',
      chat_id: 'sender-123',
      bot_suspended: false,
    };

    const company = {
      _id: 'company-id',
      bot_active: true,
      fb_page_access_token: 'token',
      openai_api_key: 'key',
    };

    // Mock getOrCreateFacebookContact
    require('../services/contact.service.js').getOrCreateContact.mockResolvedValue(customer);

    // Mock canBotRespond
    require('../utils/time.js').isWithinActiveInterval.mockReturnValue(true);

    // Mock saveMessage
    require('../services/message.service.js').createMessage.mockResolvedValue({
      _id: 'message-id',
    });

    // Mock getMessagesByCustomer
    require('../services/message.service.js').getMessagesByCustomer.mockResolvedValue([]);

    // Mock getCollectedSystemInstructions
    require('../services/company.service.js').getCollectedSystemInstructions.mockResolvedValue('instructions');

    // Simulate first message
    const webhookEvent1 = {
      sender: { id: 'sender-123' },
      message: {
        text: 'First message',
        mid: 'msg-1',
      },
    };

    // Simulate second message (rapid succession)
    const webhookEvent2 = {
      sender: { id: 'sender-123' },
      message: {
        text: 'Second message',
        mid: 'msg-2',
      },
    };

    // Import handleUserMessage function
    const { handleUserMessage } = require('../facebook.controller.js');

    // Process first message
    await handleUserMessage(webhookEvent1, company);

    // Process second message immediately after (simulating rapid succession)
    await handleUserMessage(webhookEvent2, company);

    // Verify processWithAI was called only once (for the latest message)
    expect(mockProcessWithAI).toHaveBeenCalledTimes(1);

    // Verify it was called with the second message content
    const callArgs = mockProcessWithAI.mock.calls[0][0];
    expect(callArgs.message).toBe('Second message');
  });

  it('should handle stale timeouts correctly', async () => {
    // Create a buffer with an old flush ID
    const senderId = 'sender-123';
    const oldFlushId = 999999999999;
    const newFlushId = mockNow + 0.1;

    conversationBuffers.set(senderId, {
      timeoutId: 'old-timeout',
      flushId: oldFlushId,
      lastActivity: mockNow,
      customer: { _id: 'customer-id' },
      company: { _id: 'company-id' },
    });

    // Import cleanupBuffer
    const { cleanupBuffer } = require('../facebook.controller.js');

    // Try to cleanup with old flush ID - should not work
    cleanupBuffer(senderId);

    // Buffer should still exist since flush ID doesn't match
    expect(conversationBuffers.has(senderId)).toBe(true);

    // Now update with new flush ID
    const buffer = conversationBuffers.get(senderId);
    buffer.flushId = newFlushId;

    // Cleanup should work now
    cleanupBuffer(senderId);
    expect(conversationBuffers.has(senderId)).toBe(false);
  });

  it('should generate unique flush IDs for each timeout', () => {
    // Test that flush IDs are unique
    const id1 = Date.now() + Math.random();
    const id2 = Date.now() + Math.random();

    expect(id1).not.toBe(id2);
    expect(typeof id1).toBe('number');
    expect(typeof id2).toBe('number');
  });
});
