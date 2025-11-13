import fetch from 'node-fetch';
import {
  emitAppointmentCreated,
  emitAppointmentUpdated,
  emitAppointmentCanceled,
} from '../utils/realtimeAppointments.js';
import logger from '../utils/logger.js';

// Mock dependencies
jest.mock('node-fetch');
jest.mock('../utils/logger.js', () => ({
  messageFlow: {
    info: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock config
jest.mock('../config/env.js', () => ({
  default: {
    backend: { url: 'http://localhost:3001' },
    security: { internalApiKey: 'test-internal-api-key-12345678901234567890' },
  },
}));

describe('realtimeAppointments', () => {
  const mockAppointmentId = '507f1f77bcf86cd799439011';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('emitAppointmentCreated', () => {
    it('should successfully emit appointment:created event', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          message: 'Socket event emitted successfully',
          eventType: 'appointment:created',
        }),
      };

      fetch.mockResolvedValue(mockResponse);

      const result = await emitAppointmentCreated(mockAppointmentId);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/v1/internal/socket/appointment-created',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': 'test-internal-api-key-12345678901234567890',
          },
          body: JSON.stringify({ appointmentId: mockAppointmentId }),
        }
      );

      expect(result).toBe(true);
      expect(logger.messageFlow.info).toHaveBeenCalledWith(
        'Emitting appointment:created socket event',
        expect.any(Object)
      );
      expect(logger.messageFlow.info).toHaveBeenCalledWith(
        'Successfully emitted appointment:created socket event',
        expect.any(Object)
      );
    });

    it('should return false if appointmentId is missing', async () => {
      const result = await emitAppointmentCreated(null);

      expect(result).toBe(false);
      expect(fetch).not.toHaveBeenCalled();
      expect(logger.messageFlow.error).toHaveBeenCalledWith(
        'appointmentId is required for socket emission',
        expect.any(Object)
      );
    });

    it('should return false on HTTP error', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: jest.fn().mockResolvedValue({
          error: { code: 'SOCKET_EMISSION_FAILED', message: 'Failed' },
        }),
      };

      fetch.mockResolvedValue(mockResponse);

      const result = await emitAppointmentCreated(mockAppointmentId);

      expect(result).toBe(false);
      expect(logger.messageFlow.error).toHaveBeenCalledWith(
        'Failed to emit appointment:created socket event',
        expect.objectContaining({
          appointmentId: mockAppointmentId,
          status: 500,
        })
      );
    });

    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network request failed');
      fetch.mockRejectedValue(networkError);

      const result = await emitAppointmentCreated(mockAppointmentId);

      expect(result).toBe(false);
      expect(logger.messageFlow.error).toHaveBeenCalledWith(
        'Error emitting appointment:created socket event',
        expect.objectContaining({
          appointmentId: mockAppointmentId,
          error: 'Network request failed',
        })
      );
    });
  });

  describe('emitAppointmentUpdated', () => {
    it('should successfully emit appointment:updated event', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          message: 'Socket event emitted successfully',
          eventType: 'appointment:updated',
        }),
      };

      fetch.mockResolvedValue(mockResponse);

      const result = await emitAppointmentUpdated(mockAppointmentId);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/v1/internal/socket/appointment-updated',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ appointmentId: mockAppointmentId }),
        })
      );

      expect(result).toBe(true);
    });

    it('should return false if appointmentId is missing', async () => {
      const result = await emitAppointmentUpdated(undefined);

      expect(result).toBe(false);
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('emitAppointmentCanceled', () => {
    it('should successfully emit appointment:canceled event', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          message: 'Socket event emitted successfully',
          eventType: 'appointment:canceled',
        }),
      };

      fetch.mockResolvedValue(mockResponse);

      const result = await emitAppointmentCanceled(mockAppointmentId);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/v1/internal/socket/appointment-canceled',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ appointmentId: mockAppointmentId }),
        })
      );

      expect(result).toBe(true);
    });

    it('should return false if appointmentId is missing', async () => {
      const result = await emitAppointmentCanceled('');

      expect(result).toBe(false);
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('missing API key', () => {
    beforeEach(() => {
      // Re-mock config with missing API key
      jest.resetModules();
      jest.doMock('../config/env.js', () => ({
        default: {
          backend: { url: 'http://localhost:3001' },
          security: { internalApiKey: null },
        },
      }));
    });

    it('should log warning and return false if API key is missing', async () => {
      // Re-import with new mock
      const { emitAppointmentCreated: emitWithoutKey } = await import(
        '../utils/realtimeAppointments.js'
      );

      const result = await emitWithoutKey(mockAppointmentId);

      expect(result).toBe(false);
      expect(fetch).not.toHaveBeenCalled();
    });
  });
});
