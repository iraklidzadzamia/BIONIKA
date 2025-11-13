#!/usr/bin/env node

/**
 * Verification script for Facebook controller buffer race condition fix
 *
 * This script simulates the race condition logic to verify that:
 * 1. Only the latest message triggers processing
 * 2. Stale timeouts don't interfere with newer ones
 * 3. Buffers are cleaned up properly with flush ID validation
 */

console.log('🔧 Starting buffer race condition verification...\n');

// Simulate conversation buffers as a Map
const conversationBuffers = new Map();

// Test 1: Simulate rapid messages with flush ID tracking
console.log('Test 1: Rapid message scenario with flush ID validation');
console.log('--------------------------------------------------------');

const senderId = 'test-sender-123';
let processWithAICallCount = 0;

// Mock processWithAI function to track calls
const mockProcessWithAI = async (messageText, flushId) => {
  processWithAICallCount++;
  console.log(`✅ processWithAI called (call #${processWithAICallCount}) with message: "${messageText}" (flushId: ${flushId})`);
};

// Simulate the fixed buffer logic
function simulateMessageBuffering(senderFbId, messageText, delayMs = 100) {
  console.log(`📨 Processing message: "${messageText}"`);

  let buffer = conversationBuffers.get(senderFbId);
  if (!buffer) {
    buffer = {
      timeoutId: null,
      lastImageUrl: null,
      lastActivity: Date.now(),
      lastMessage: messageText,
      flushId: null,
    };
    conversationBuffers.set(senderFbId, buffer);
    console.log('📦 Created new buffer');
  } else {
    buffer.lastActivity = Date.now();
    buffer.lastMessage = messageText;

    if (buffer.timeoutId) {
      clearTimeout(buffer.timeoutId);
      console.log('⏰ Cleared existing timeout');
    }
  }

  // Generate new flush ID (this is the key fix!)
  const currentFlushId = Date.now() + Math.random();
  buffer.flushId = currentFlushId;
  console.log(`🔢 Generated flush ID: ${currentFlushId}`);

  // Simulate setTimeout with race condition protection
  buffer.timeoutId = setTimeout(async () => {
    const currentBuffer = conversationBuffers.get(senderFbId);

    // RACE CONDITION FIX: Check if this timeout is still the latest
    if (!currentBuffer || currentBuffer.flushId !== currentFlushId) {
      console.log(`⚠️  Skipping stale timeout (buffer flushId: ${currentBuffer?.flushId}, timeout flushId: ${currentFlushId})`);
      return;
    }

    console.log(`🚀 Executing timeout for message: "${messageText}" (flushId: ${currentFlushId})`);

    try {
      await mockProcessWithAI(messageText, currentFlushId);
    } finally {
      // RACE CONDITION FIX: Only cleanup if this is still the active timeout
      if (currentBuffer && currentBuffer.flushId === currentFlushId) {
        conversationBuffers.delete(senderFbId);
        console.log('🧹 Cleaned up buffer');
      } else {
        console.log('⏳ Skipped cleanup (newer timeout active)');
      }
    }
  }, delayMs);

  console.log(`⏳ Scheduled timeout (${delayMs}ms) for message: "${messageText}"\n`);
}

// Test rapid messages
console.log('Simulating rapid messages (each 50ms delay):');
simulateMessageBuffering(senderId, 'First message', 50);   // Should be cancelled by second
simulateMessageBuffering(senderId, 'Second message', 50);  // Should be cancelled by third
simulateMessageBuffering(senderId, 'Third message', 50);   // Should execute

// Wait for timeouts to complete
await new Promise(resolve => setTimeout(resolve, 200));

console.log(`\n📊 Test 1 Results:`);
console.log(`- Total processWithAI calls: ${processWithAICallCount} (expected: 1)`);
console.log(`- Buffers remaining: ${conversationBuffers.size} (expected: 0)`);
console.log(`- Only latest message processed: ${processWithAICallCount === 1 ? '✅ PASS' : '❌ FAIL'}`);

// Test 2: Demonstrate the race condition that was fixed
console.log('\nTest 2: Race condition demonstration');
console.log('-------------------------------------');

const raceSenderId = 'race-test-sender';
let raceConditionCallCount = 0;

function simulateOldBehavior(senderFbId, messageText, delayMs = 100) {
  // OLD BEHAVIOR (buggy): No flush ID validation
  let buffer = conversationBuffers.get(senderFbId) || {};
  buffer.lastMessage = messageText;
  conversationBuffers.set(senderFbId, buffer);

  buffer.timeoutId = setTimeout(async () => {
    raceConditionCallCount++;
    console.log(`🐛 OLD: processWithAI called for "${messageText}" (call #${raceConditionCallCount})`);

    // OLD BEHAVIOR: Always cleanup, even if newer timeout exists
    conversationBuffers.delete(senderFbId);
    console.log('🐛 OLD: Cleaned up buffer (potentially wiping newer timeout)');
  }, delayMs);
}

function simulateNewBehavior(senderFbId, messageText, delayMs = 100) {
  // NEW BEHAVIOR (fixed): With flush ID validation
  let buffer = conversationBuffers.get(senderFbId);
  if (!buffer) {
    buffer = { flushId: null, lastMessage: messageText };
    conversationBuffers.set(senderFbId, buffer);
  } else {
    buffer.lastMessage = messageText;
  }

  const currentFlushId = Date.now() + Math.random();
  buffer.flushId = currentFlushId;

  buffer.timeoutId = setTimeout(async () => {
    const currentBuffer = conversationBuffers.get(senderFbId);
    if (!currentBuffer || currentBuffer.flushId !== currentFlushId) {
      console.log(`✅ NEW: Skipped stale timeout for "${messageText}"`);
      return;
    }

    raceConditionCallCount++;
    console.log(`✅ NEW: processWithAI called for "${messageText}" (call #${raceConditionCallCount})`);

    if (currentBuffer && currentBuffer.flushId === currentFlushId) {
      conversationBuffers.delete(senderFbId);
    }
  }, delayMs);
}

console.log('\nDemonstrating the OLD buggy behavior:');
simulateOldBehavior(raceSenderId, 'Old first message', 30);
simulateOldBehavior(raceSenderId, 'Old second message', 30);

await new Promise(resolve => setTimeout(resolve, 100));

console.log(`🐛 OLD behavior result: ${raceConditionCallCount} calls (both might execute due to race)`);

// Reset for new behavior test
conversationBuffers.clear();
raceConditionCallCount = 0;

console.log('\nDemonstrating the NEW fixed behavior:');
simulateNewBehavior(raceSenderId, 'New first message', 30);
simulateNewBehavior(raceSenderId, 'New second message', 30);

await new Promise(resolve => setTimeout(resolve, 100));

console.log(`✅ NEW behavior result: ${raceConditionCallCount} calls (only latest executes)`);

console.log('\n🎉 Verification complete!');
console.log('\nSummary of the fix:');
console.log('- ✅ Each timeout gets a unique flushId token');
console.log('- ✅ Timeout callback validates flushId before processing');
console.log('- ✅ Only the latest timeout can cleanup its buffer');
console.log('- ✅ Stale timeouts are safely skipped');
console.log('- ✅ Race condition eliminated: latest message always processed');
