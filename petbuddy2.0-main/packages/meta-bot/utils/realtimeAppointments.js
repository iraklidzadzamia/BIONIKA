/**
 * Realtime Appointments Helper for MetaBot
 *
 * Emits socket events for appointment changes by calling the internal backend API.
 * This approach avoids dynamic import issues with BookingService in MetaBot context.
 */

import fetch from 'node-fetch';
import { config } from '../config/env.js';
import logger from './logger.js';

/**
 * Base URL for the backend API
 */
const BACKEND_URL = config.backend?.apiUrl || process.env.BACKEND_API_URL || 'http://localhost:3001';

/**
 * Internal API key for authentication
 */
const INTERNAL_API_KEY = config.security?.internalApiKey || process.env.INTERNAL_SERVICE_API_KEY;

/**
 * Emit appointment:created socket event
 * @param {string} appointmentId - MongoDB ObjectId of the appointment
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
export async function emitAppointmentCreated(appointmentId) {
  try {
    if (!INTERNAL_API_KEY) {
      logger.messageFlow.warning('INTERNAL_SERVICE_API_KEY not configured - skipping socket emission', {
        appointmentId,
        eventType: 'appointment:created',
      });
      return false;
    }

    if (!appointmentId) {
      logger.messageFlow.error('appointmentId is required for socket emission', {
        eventType: 'appointment:created',
      });
      return false;
    }

    const url = `${BACKEND_URL}/api/v1/internal/socket/appointment-created`;

    logger.messageFlow.info('Emitting appointment:created socket event', {
      appointmentId,
      url,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': INTERNAL_API_KEY,
      },
      body: JSON.stringify({ appointmentId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      logger.messageFlow.error('Failed to emit appointment:created socket event', {
        appointmentId,
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      });
      return false;
    }

    const data = await response.json();
    logger.messageFlow.info('Successfully emitted appointment:created socket event', {
      appointmentId,
      response: data,
    });

    return true;
  } catch (error) {
    logger.messageFlow.error('Error emitting appointment:created socket event', {
      appointmentId,
      error: error.message,
      stack: error.stack,
    });
    return false;
  }
}

/**
 * Emit appointment:updated socket event
 * @param {string} appointmentId - MongoDB ObjectId of the appointment
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
export async function emitAppointmentUpdated(appointmentId) {
  try {
    if (!INTERNAL_API_KEY) {
      logger.messageFlow.warning('INTERNAL_SERVICE_API_KEY not configured - skipping socket emission', {
        appointmentId,
        eventType: 'appointment:updated',
      });
      return false;
    }

    if (!appointmentId) {
      logger.messageFlow.error('appointmentId is required for socket emission', {
        eventType: 'appointment:updated',
      });
      return false;
    }

    const url = `${BACKEND_URL}/api/v1/internal/socket/appointment-updated`;

    logger.messageFlow.info('Emitting appointment:updated socket event', {
      appointmentId,
      url,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': INTERNAL_API_KEY,
      },
      body: JSON.stringify({ appointmentId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      logger.messageFlow.error('Failed to emit appointment:updated socket event', {
        appointmentId,
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      });
      return false;
    }

    const data = await response.json();
    logger.messageFlow.info('Successfully emitted appointment:updated socket event', {
      appointmentId,
      response: data,
    });

    return true;
  } catch (error) {
    logger.messageFlow.error('Error emitting appointment:updated socket event', {
      appointmentId,
      error: error.message,
      stack: error.stack,
    });
    return false;
  }
}

/**
 * Emit appointment:canceled socket event
 * @param {string} appointmentId - MongoDB ObjectId of the appointment
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
export async function emitAppointmentCanceled(appointmentId) {
  try {
    if (!INTERNAL_API_KEY) {
      logger.messageFlow.warning('INTERNAL_SERVICE_API_KEY not configured - skipping socket emission', {
        appointmentId,
        eventType: 'appointment:canceled',
      });
      return false;
    }

    if (!appointmentId) {
      logger.messageFlow.error('appointmentId is required for socket emission', {
        eventType: 'appointment:canceled',
      });
      return false;
    }

    const url = `${BACKEND_URL}/api/v1/internal/socket/appointment-canceled`;

    logger.messageFlow.info('Emitting appointment:canceled socket event', {
      appointmentId,
      url,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': INTERNAL_API_KEY,
      },
      body: JSON.stringify({ appointmentId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      logger.messageFlow.error('Failed to emit appointment:canceled socket event', {
        appointmentId,
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      });
      return false;
    }

    const data = await response.json();
    logger.messageFlow.info('Successfully emitted appointment:canceled socket event', {
      appointmentId,
      response: data,
    });

    return true;
  } catch (error) {
    logger.messageFlow.error('Error emitting appointment:canceled socket event', {
      appointmentId,
      error: error.message,
      stack: error.stack,
    });
    return false;
  }
}
