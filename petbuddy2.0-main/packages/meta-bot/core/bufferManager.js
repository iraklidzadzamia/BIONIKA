/**
 * Message Buffer Manager
 *
 * Purpose: When users send multiple messages in quick succession (like typing one sentence
 * across multiple messages), we buffer them and process once they finish typing.
 *
 * How it works:
 * 1. User sends first message -> Start timer (e.g., 4 seconds), accumulate text
 * 2. User sends second message -> Cancel old timer, start new timer, accumulate text
 * 3. User sends third message -> Cancel old timer, start new timer, accumulate text
 * 4. Timer completes -> Process all accumulated text and images together
 *
 * This ensures the LLM sees the complete thought as one message, not fragmented.
 *
 * Example:
 * - User types: "I want to" (saved to DB, added to buffer)
 * - User types: "book an" (saved to DB, added to buffer)
 * - User types: "appointment" (saved to DB, added to buffer)
 * - Timer expires -> LLM receives: "I want to book an appointment"
 */

import logger from "../utils/logger.js";
import { BUFFER_CLEANUP_INTERVAL, STALE_BUFFER_THRESHOLD } from "./constants.js";

export class ConversationBufferManager {
  constructor(platform) {
    this.platform = platform;
    this.buffers = new Map(); // senderId -> { timeoutId, messages[], lastActivity, customer, company }
    this.startCleanup();
  }

  /**
   * Add a message to the buffer for a sender
   * This automatically resets the timeout - bot will respond after user stops typing
   *
   * @param {string} senderId - The user's ID
   * @param {Object} options - Buffer options
   * @param {Object} options.customer - Customer data
   * @param {Object} options.company - Company data
   * @param {Function} options.onFlush - Function to call when buffer is ready to process
   * @param {number} options.delayMs - How long to wait after last message before processing (from company.bot.responseDelay)
   * @param {string} options.messageText - Message text to accumulate
   * @param {string} options.imageUrl - Optional image URL to accumulate
   */
  addMessage(senderId, { customer, company, onFlush, delayMs, messageText = "", imageUrl = null }) {
    // Get existing buffer or create new one
    let buffer = this.buffers.get(senderId);

    if (!buffer) {
      // First message from this user - create new buffer
      buffer = {
        timeoutId: null,
        lastActivity: Date.now(),
        customer,
        company,
        messageTexts: [], // Accumulate text messages
        imageUrls: [], // Accumulate image URLs
      };
      this.buffers.set(senderId, buffer);

      logger.messageFlow.processing(
        this.platform,
        null,
        senderId,
        "buffer-created",
        "Created new message buffer"
      );
    } else {
      // User sent another message - clear old timeout
      if (buffer.timeoutId) {
        clearTimeout(buffer.timeoutId);
        logger.messageFlow.processing(
          this.platform,
          null,
          senderId,
          "buffer-reset",
          "User still typing - reset timer"
        );
      }
    }

    // Update buffer state
    buffer.lastActivity = Date.now();
    buffer.customer = customer;
    buffer.company = company;

    // Accumulate text message
    if (messageText && messageText.trim()) {
      buffer.messageTexts.push(messageText.trim());
      logger.messageFlow.processing(
        this.platform,
        null,
        senderId,
        "buffer-text-added",
        `Added text to buffer (total messages: ${buffer.messageTexts.length})`
      );
    }

    // Accumulate image URLs
    if (imageUrl) {
      buffer.imageUrls.push(imageUrl);
      logger.messageFlow.processing(
        this.platform,
        null,
        senderId,
        "buffer-image-added",
        `Added image to buffer (total: ${buffer.imageUrls.length})`
      );
    }

    // Set new timeout - will fire when user stops typing
    buffer.timeoutId = setTimeout(() => {
      // Check buffer still exists (might have been cleaned up)
      const currentBuffer = this.buffers.get(senderId);
      if (!currentBuffer) {
        logger.messageFlow.processing(
          this.platform,
          null,
          senderId,
          "buffer-missing",
          "Buffer was removed before processing"
        );
        return;
      }

      // Combine all buffered text messages into one
      const combinedText = currentBuffer.messageTexts.join(" ");
      const messageCount = currentBuffer.messageTexts.length;

      logger.messageFlow.processing(
        this.platform,
        null,
        senderId,
        "buffer-flush",
        `Processing buffered messages after ${delayMs}ms delay (texts: ${messageCount}, images: ${currentBuffer.imageUrls.length})`,
        { combined_text_length: combinedText.length }
      );

      // Process the accumulated messages
      // Pass messageCount so the handler knows how many messages to pop from history
      onFlush(currentBuffer.customer, currentBuffer.company, combinedText, currentBuffer.imageUrls, messageCount);

      // Clean up buffer after processing
      this.buffers.delete(senderId);

      logger.messageFlow.processing(
        this.platform,
        null,
        senderId,
        "buffer-cleanup",
        "Buffer processed and cleaned up"
      );
    }, delayMs);

    logger.messageFlow.processing(
      this.platform,
      null,
      senderId,
      "buffer-waiting",
      `Waiting ${delayMs}ms for user to finish typing`
    );
  }

  /**
   * Cancel buffer for a sender (e.g., on error)
   */
  cancel(senderId) {
    const buffer = this.buffers.get(senderId);
    if (buffer?.timeoutId) {
      clearTimeout(buffer.timeoutId);
    }
    this.buffers.delete(senderId);

    logger.messageFlow.processing(
      this.platform,
      null,
      senderId,
      "buffer-cancelled",
      "Buffer cancelled and cleaned up"
    );
  }

  /**
   * Clean up stale buffers (housekeeping to prevent memory leaks)
   */
  cleanupStale() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [senderId, buffer] of this.buffers.entries()) {
      const idleTime = now - buffer.lastActivity;

      if (idleTime > STALE_BUFFER_THRESHOLD) {
        if (buffer.timeoutId) {
          clearTimeout(buffer.timeoutId);
        }
        this.buffers.delete(senderId);
        cleanedCount++;

        logger.messageFlow.processing(
          this.platform,
          null,
          senderId,
          "buffer-stale-cleanup",
          `Cleaned up stale buffer (idle for ${Math.round(idleTime / 1000)}s)`
        );
      }
    }

    if (cleanedCount > 0) {
      logger.messageFlow.processing(
        this.platform,
        null,
        null,
        "buffer-maintenance",
        `Cleaned up ${cleanedCount} stale buffers, ${this.buffers.size} remain`
      );
    }
  }

  /**
   * Start periodic cleanup
   */
  startCleanup() {
    setInterval(() => this.cleanupStale(), BUFFER_CLEANUP_INTERVAL);
  }

  /**
   * Get number of active buffers
   */
  size() {
    return this.buffers.size;
  }

  /**
   * Clear all buffers (for testing/shutdown)
   */
  clear() {
    for (const [senderId, buffer] of this.buffers.entries()) {
      if (buffer.timeoutId) {
        clearTimeout(buffer.timeoutId);
      }
    }
    this.buffers.clear();

    logger.messageFlow.processing(
      this.platform,
      null,
      null,
      "buffers-cleared",
      "All buffers cleared"
    );
  }
}
