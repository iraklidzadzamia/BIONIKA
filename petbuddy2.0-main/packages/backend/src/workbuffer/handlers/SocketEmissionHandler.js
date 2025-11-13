/**
 * SocketEmissionHandler - Handler for socket event emissions
 *
 * Processes messages that need to be emitted via Socket.io.
 * Integrates with the existing socket event system.
 *
 * @module workbuffer/handlers/SocketEmissionHandler
 */

import { MessageHandler } from './MessageHandler.js';
import {
  emitAppointmentCreated,
  emitAppointmentUpdated,
  emitAppointmentCanceled,
} from '../../socket/events/appointmentEvents.js';
import {
  emitMessageReceived,
  emitMessageSent,
  emitMessageStatusUpdate,
} from '../../socket/events/messageEvents.js';
import logger from '../../utils/logger.js';

/**
 * Handler for socket event emissions
 *
 * Payload structure:
 * {
 *   eventType: 'appointment:created' | 'appointment:updated' | 'appointment:canceled' |
 *              'message:received' | 'message:sent' | 'message:status',
 *   data: {...} // Event-specific data
 * }
 */
export class SocketEmissionHandler extends MessageHandler {
  constructor() {
    super('socket-emission', {
      timeout: 5000, // Socket emissions should be fast
      idempotent: true, // Socket emissions are idempotent (clients handle duplicates)
      maxRetries: 3, // Only retry a few times
    });
  }

  /**
   * Validate socket emission payload
   * @param {Object} payload
   * @returns {Promise<boolean>}
   */
  async validate(payload) {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Payload must be an object');
    }

    if (!payload.eventType) {
      throw new Error('Payload must include eventType');
    }

    if (!payload.data) {
      throw new Error('Payload must include data');
    }

    const validEventTypes = [
      'appointment:created',
      'appointment:updated',
      'appointment:canceled',
      'message:received',
      'message:sent',
      'message:status',
    ];

    if (!validEventTypes.includes(payload.eventType)) {
      throw new Error(`Invalid eventType: ${payload.eventType}`);
    }

    return true;
  }

  /**
   * Process socket emission
   * @param {Object} message
   * @param {Object} context
   * @returns {Promise<Object>}
   */
  async process(message, context) {
    const { eventType, data } = message.payload;

    try {
      // Emit the appropriate event
      switch (eventType) {
        case 'appointment:created':
          emitAppointmentCreated(data);
          break;

        case 'appointment:updated':
          emitAppointmentUpdated(data);
          break;

        case 'appointment:canceled':
          emitAppointmentCanceled(data);
          break;

        case 'message:received':
          emitMessageReceived(data);
          break;

        case 'message:sent':
          emitMessageSent(data);
          break;

        case 'message:status':
          emitMessageStatusUpdate(data);
          break;

        default:
          throw new Error(`Unsupported eventType: ${eventType}`);
      }

      return {
        emitted: true,
        eventType,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error(`${this.logPrefix} Failed to emit socket event`, {
        messageId: message.messageId,
        eventType,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Socket emission failures are usually transient (e.g., socket server restart)
   * Always retry unless it's a validation error
   */
  async onError(error, message) {
    // Don't retry validation errors
    if (error.message.includes('Invalid') || error.message.includes('must')) {
      return false;
    }
    // Retry all other errors
    return true;
  }
}

export default SocketEmissionHandler;
