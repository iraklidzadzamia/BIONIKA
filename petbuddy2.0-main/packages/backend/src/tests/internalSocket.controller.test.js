import { InternalSocketController } from '../controllers/internalSocketController.js';
import { Appointment } from '@petbuddy/shared';
import {
  emitAppointmentCreated,
  emitAppointmentUpdated,
  emitAppointmentCanceled,
} from '../socket/events/appointmentEvents.js';

// Mock dependencies
jest.mock('@petbuddy/shared');
jest.mock('../socket/events/appointmentEvents.js');
jest.mock('../utils/logger.js', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

describe('InternalSocketController', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      body: {},
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('emitAppointmentCreated', () => {
    const mockAppointmentId = '507f1f77bcf86cd799439011';
    const mockAppointment = {
      _id: mockAppointmentId,
      companyId: 'company123',
      customerId: {
        _id: 'customer123',
        fullName: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
      },
      petId: {
        _id: 'pet123',
        name: 'Fluffy',
        species: 'dog',
      },
      serviceId: {
        _id: 'service123',
        name: 'Full Groom',
      },
      serviceItemId: {
        _id: 'item123',
        price: 75,
      },
      staffId: {
        _id: 'staff123',
        fullName: 'Jane Smith',
        role: 'groomer',
      },
      start: new Date('2025-11-05T14:00:00Z'),
      end: new Date('2025-11-05T15:30:00Z'),
      status: 'scheduled',
    };

    it('should successfully emit appointment:created event', async () => {
      mockReq.body = { appointmentId: mockAppointmentId };

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockAppointment),
      };

      Appointment.findById = jest.fn().mockReturnValue(mockQuery);
      emitAppointmentCreated.mockImplementation(() => {});

      await InternalSocketController.emitAppointmentCreated(mockReq, mockRes);

      expect(Appointment.findById).toHaveBeenCalledWith(mockAppointmentId);
      expect(mockQuery.populate).toHaveBeenCalledTimes(5);
      expect(emitAppointmentCreated).toHaveBeenCalledWith(mockAppointment);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Socket event emitted successfully',
        eventType: 'appointment:created',
      });
    });

    it('should return 400 if appointmentId is missing', async () => {
      mockReq.body = {};

      await InternalSocketController.emitAppointmentCreated(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: 'MISSING_APPOINTMENT_ID',
          message: 'appointmentId is required',
        },
      });
    });

    it('should return 404 if appointment not found', async () => {
      mockReq.body = { appointmentId: mockAppointmentId };

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      };

      Appointment.findById = jest.fn().mockReturnValue(mockQuery);

      await InternalSocketController.emitAppointmentCreated(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: 'APPOINTMENT_NOT_FOUND',
          message: `Appointment ${mockAppointmentId} not found`,
        },
      });
    });

    it('should return 500 on database error', async () => {
      mockReq.body = { appointmentId: mockAppointmentId };

      const dbError = new Error('Database connection failed');
      Appointment.findById = jest.fn().mockImplementation(() => {
        throw dbError;
      });

      await InternalSocketController.emitAppointmentCreated(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: 'SOCKET_EMISSION_FAILED',
          message: 'Failed to emit socket event',
          details: 'Database connection failed',
        },
      });
    });
  });

  describe('emitAppointmentUpdated', () => {
    const mockAppointmentId = '507f1f77bcf86cd799439011';
    const mockAppointment = {
      _id: mockAppointmentId,
      companyId: 'company123',
      customerId: { _id: 'customer123' },
      status: 'scheduled',
    };

    it('should successfully emit appointment:updated event', async () => {
      mockReq.body = { appointmentId: mockAppointmentId };

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockAppointment),
      };

      Appointment.findById = jest.fn().mockReturnValue(mockQuery);
      emitAppointmentUpdated.mockImplementation(() => {});

      await InternalSocketController.emitAppointmentUpdated(mockReq, mockRes);

      expect(emitAppointmentUpdated).toHaveBeenCalledWith(mockAppointment);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Socket event emitted successfully',
        eventType: 'appointment:updated',
      });
    });

    it('should return 400 if appointmentId is missing', async () => {
      mockReq.body = {};

      await InternalSocketController.emitAppointmentUpdated(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: 'MISSING_APPOINTMENT_ID',
          message: 'appointmentId is required',
        },
      });
    });
  });

  describe('emitAppointmentCanceled', () => {
    const mockAppointmentId = '507f1f77bcf86cd799439011';
    const mockAppointment = {
      _id: mockAppointmentId,
      companyId: 'company123',
      customerId: { _id: 'customer123' },
      status: 'canceled',
    };

    it('should successfully emit appointment:canceled event', async () => {
      mockReq.body = { appointmentId: mockAppointmentId };

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockAppointment),
      };

      Appointment.findById = jest.fn().mockReturnValue(mockQuery);
      emitAppointmentCanceled.mockImplementation(() => {});

      await InternalSocketController.emitAppointmentCanceled(mockReq, mockRes);

      expect(emitAppointmentCanceled).toHaveBeenCalledWith(mockAppointment);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Socket event emitted successfully',
        eventType: 'appointment:canceled',
      });
    });

    it('should return 400 if appointmentId is missing', async () => {
      mockReq.body = {};

      await InternalSocketController.emitAppointmentCanceled(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: 'MISSING_APPOINTMENT_ID',
          message: 'appointmentId is required',
        },
      });
    });
  });
});
