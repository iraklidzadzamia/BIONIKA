/**
 * Duplicate Message Detector
 * Prevents processing the same message multiple times
 */

import logger from "../utils/logger.js";
import { MAX_PROCESSED_IDS } from "./constants.js";

export class DuplicateDetector {
  constructor(platform, maxSize = MAX_PROCESSED_IDS) {
    this.platform = platform;
    this.processedMessageIds = new Set();
    this.maxSize = maxSize;
  }

  /**
   * Check if message was already processed
   * FIXED: Issue #7 - Don't automatically add to set, let caller decide
   * This prevents marking messages as processed before they're actually handled
   *
   * @param {string} messageId - Message ID to check
   * @returns {boolean} - True if duplicate, false if new
   */
  isDuplicate(messageId) {
    if (!messageId) {
      return false;
    }

    if (this.processedMessageIds.has(messageId)) {
      logger.messageFlow.processing(
        this.platform,
        messageId,
        null,
        "duplicate-detected",
        "Message already processed",
        { cache_size: this.processedMessageIds.size }
      );
      return true;
    }

    // FIXED: Don't automatically add - let caller add after successful processing
    return false;
  }

  /**
   * Add message ID to processed set
   * @param {string} messageId - Message ID to add
   */
  add(messageId) {
    if (!messageId) return;

    this.processedMessageIds.add(messageId);

    // Prevent memory leak by trimming set when it gets too large
    if (this.processedMessageIds.size > this.maxSize) {
      this.trim();
    }
  }

  /**
   * Trim the set to prevent memory leaks
   * Removes oldest 100 entries
   */
  trim() {
    const values = Array.from(this.processedMessageIds);
    const toRemove = values.slice(0, 100);

    toRemove.forEach((id) => this.processedMessageIds.delete(id));

    logger.messageFlow.processing(
      this.platform,
      null,
      null,
      "duplicate-cache-trimmed",
      "Trimmed duplicate message cache",
      {
        old_size: this.maxSize,
        new_size: this.processedMessageIds.size,
        removed_count: toRemove.length
      }
    );
  }

  /**
   * Clear all processed message IDs
   */
  clear() {
    this.processedMessageIds.clear();
    logger.messageFlow.processing(
      this.platform,
      null,
      null,
      "duplicate-cache-cleared",
      "Cleared duplicate message cache"
    );
  }

  /**
   * Get current cache size
   * @returns {number}
   */
  size() {
    return this.processedMessageIds.size;
  }
}
