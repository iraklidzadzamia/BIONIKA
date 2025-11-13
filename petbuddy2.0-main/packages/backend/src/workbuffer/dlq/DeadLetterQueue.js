import { MESSAGE_STATE } from '../config/bufferConfig.js';
import BufferMessage from '../models/BufferMessage.js';
import logger from '../../utils/logger.js';

export class DeadLetterQueue {
  constructor(options = {}) {
    this.logPrefix = '[DeadLetterQueue]';
    this.alertThreshold = options.alertThreshold || 10;
    this.lastAlertTime = null;
    this.alertCooldown = options.alertCooldown || 300000;
  }

  async getMessages(limit = 100) {
    return BufferMessage.find({ state: MESSAGE_STATE.DLQ })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean()
      .exec();
  }

  async getCount() {
    return BufferMessage.countDocuments({ state: MESSAGE_STATE.DLQ }).exec();
  }

  async replayMessage(messageId) {
    const message = await BufferMessage.findOne({ messageId }).exec();
    if (!message) throw new Error(`Message ${messageId} not found`);
    message.state = MESSAGE_STATE.PENDING;
    message.attemptCount = 0;
    message.visibleAt = new Date();
    message.errors = [];
    await message.save();
    return { messageId, replayed: true };
  }

  async deleteMessage(messageId) {
    const result = await BufferMessage.deleteOne({ messageId, state: MESSAGE_STATE.DLQ }).exec();
    return result.deletedCount > 0;
  }

  async checkAndAlert() {
    const count = await this.getCount();
    const now = Date.now();
    const shouldAlert = count >= this.alertThreshold &&
      (!this.lastAlertTime || now - this.lastAlertTime > this.alertCooldown);
    if (shouldAlert) {
      logger.error(`${this.logPrefix} DLQ threshold exceeded`, { count, threshold: this.alertThreshold });
      this.lastAlertTime = now;
      return { alert: true, count };
    }
    return { alert: false, count };
  }

  async getStats() {
    const messages = await this.getMessages(1000);
    const byType = {};
    for (const msg of messages) {
      byType[msg.type] = (byType[msg.type] || 0) + 1;
    }
    return {
      total: messages.length,
      byType,
      oldest: messages[messages.length - 1]?.createdAt,
      newest: messages[0]?.createdAt,
    };
  }
}

export default DeadLetterQueue;
