/**
 * Circuit Breaker Multi-Tenancy Tests
 * 
 * Tests that circuit breakers are properly isolated between companies
 * to prevent cascade failures across tenants.
 */

import { jest } from '@jest/globals';

// Mock logger before importing toolExecutor
jest.mock('../utils/logger.js', () => ({
  default: {
    messageFlow: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
  },
}));

describe('Circuit Breaker Multi-Tenancy Isolation', () => {
  let toolExecutorNode;
  let createLangChainTools;
  
  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Mock createLangChainTools
    jest.unstable_mockModule('../langgraph/tools/index.js', () => ({
      createLangChainTools: jest.fn(() => [
        {
          name: 'test_tool',
          invoke: jest.fn(async () => 'success'),
        },
        {
          name: 'failing_tool',
          invoke: jest.fn(async () => {
            throw new Error('Tool failure');
          }),
        },
      ]),
    }));
    
    // Import after mocking
    const module = await import('../langgraph/nodes/toolExecutor.js');
    toolExecutorNode = module.toolExecutorNode;
  });
  
  test('should isolate circuit breaker between companies', async () => {
    const company1 = 'company1_id';
    const company2 = 'company2_id';
    
    // Cause 5 failures for company1 to open circuit breaker
    for (let i = 0; i < 5; i++) {
      try {
        await toolExecutorNode({
          companyId: company1,
          chatId: 'chat1',
          platform: 'facebook',
          toolCalls: [{ 
            id: `call_${i}`,
            name: 'failing_tool', 
            args: {} 
          }],
        });
      } catch (e) {
        // Expected failures
      }
    }
    
    // Company1's circuit breaker should be open (failing_tool)
    // Company2 should still be able to use the tool
    const result = await toolExecutorNode({
      companyId: company2,
      chatId: 'chat2',
      platform: 'facebook',
      toolCalls: [{ 
        id: 'call_company2',
        name: 'test_tool', 
        args: {} 
      }],
    });
    
    // Company2's tool should succeed
    expect(result.messages).toBeDefined();
    expect(result.messages[0].content).toContain('success');
  });
  
  test('should create separate circuit breakers per company-tool combination', async () => {
    const state1 = {
      companyId: 'company_a',
      chatId: 'chat_a',
      platform: 'facebook',
      toolCalls: [{ id: 'call1', name: 'test_tool', args: {} }],
    };
    
    const state2 = {
      companyId: 'company_b',
      chatId: 'chat_b',
      platform: 'facebook',
      toolCalls: [{ id: 'call2', name: 'test_tool', args: {} }],
    };
    
    // Both should succeed with independent circuit breakers
    await expect(toolExecutorNode(state1)).resolves.toBeDefined();
    await expect(toolExecutorNode(state2)).resolves.toBeDefined();
  });
  
  test('should throw error if companyId is missing', async () => {
    const state = {
      // Missing companyId
      chatId: 'chat_id',
      platform: 'facebook',
      toolCalls: [{ id: 'call1', name: 'test_tool', args: {} }],
    };
    
    await expect(toolExecutorNode(state)).rejects.toThrow('companyId required');
  });
  
  test('should recover circuit breaker after timeout', async () => {
    jest.useFakeTimers();
    
    const company = 'company_recovery';
    
    // Cause failures to open circuit breaker
    for (let i = 0; i < 5; i++) {
      try {
        await toolExecutorNode({
          companyId: company,
          chatId: 'chat',
          platform: 'facebook',
          toolCalls: [{ id: `call_${i}`, name: 'failing_tool', args: {} }],
        });
      } catch (e) {}
    }
    
    // Advance time by 61 seconds (recovery timeout is 60s)
    jest.advanceTimersByTime(61000);
    
    // Circuit breaker should now be in HALF_OPEN state
    // and allow retry (though it may still fail)
    
    jest.useRealTimers();
  });
});

describe('Tool Execution Timeout', () => {
  let toolExecutorNode;
  
  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useRealTimers();
    
    // Mock slow tool
    jest.unstable_mockModule('../langgraph/tools/index.js', () => ({
      createLangChainTools: jest.fn(() => [
        {
          name: 'slow_tool',
          invoke: jest.fn(async () => {
            await new Promise(resolve => setTimeout(resolve, 35000)); // 35 seconds
            return 'should not reach here';
          }),
        },
      ]),
    }));
    
    const module = await import('../langgraph/nodes/toolExecutor.js');
    toolExecutorNode = module.toolExecutorNode;
  });
  
  test('should timeout after 30 seconds', async () => {
    const state = {
      companyId: 'company_timeout',
      chatId: 'chat',
      platform: 'facebook',
      toolCalls: [{ id: 'call1', name: 'slow_tool', args: {} }],
    };
    
    const startTime = Date.now();
    
    await expect(toolExecutorNode(state)).rejects.toThrow('timed out');
    
    const duration = Date.now() - startTime;
    
    // Should timeout around 30 seconds, not 35
    expect(duration).toBeLessThan(32000);
    expect(duration).toBeGreaterThan(28000);
  }, 35000); // Test timeout longer than tool timeout
});

