import { Appointment } from '@petbuddy/shared';
import logger from '../utils/logger.js';
import {
  emitAppointmentCreated,
  emitAppointmentUpdated,
  emitAppointmentCanceled,
} from '../socket/events/appointmentEvents.js';

/**
 * Controller for internal socket emissions
 * Used by MetaBot to emit socket events when BookingService imports fail
 */
export class InternalSocketController {
  /**
   * Emit appointment:created event
   * POST /api/v1/internal/socket/appointment-created
   */
  static async emitAppointmentCreated(req, res) {
    try {
      const { appointmentId } = req.body;

      if (!appointmentId) {
        return res.status(400).json({
          error: {
            code: 'MISSING_APPOINTMENT_ID',
            message: 'appointmentId is required',
          },
        });
      }

      // Fetch the appointment with full population
      const appointment = await Appointment.findById(appointmentId)
        .populate('customerId', 'fullName email phone')
        .populate('petId', 'name species breed size coatType')
        .populate('serviceId', 'name')
        .populate('serviceItemId', 'size coatType price')
        .populate('staffId', 'fullName role')
        .lean();

      if (!appointment) {
        return res.status(404).json({
          error: {
            code: 'APPOINTMENT_NOT_FOUND',
            message: `Appointment ${appointmentId} not found`,
          },
        });
      }

      // Emit the socket event
      emitAppointmentCreated(appointment);

      logger.info(`[InternalSocket] Emitted appointment:created for ${appointmentId}`, {
        companyId: appointment.companyId,
        customerId: appointment.customerId?._id,
      });

      res.json({
        success: true,
        message: 'Socket event emitted successfully',
        eventType: 'appointment:created',
      });
    } catch (error) {
      logger.error('[InternalSocket] Error emitting appointment:created:', error);
      res.status(500).json({
        error: {
          code: 'SOCKET_EMISSION_FAILED',
          message: 'Failed to emit socket event',
          details: error.message,
        },
      });
    }
  }

  /**
   * Emit appointment:updated event
   * POST /api/v1/internal/socket/appointment-updated
   */
  static async emitAppointmentUpdated(req, res) {
    try {
      const { appointmentId } = req.body;

      if (!appointmentId) {
        return res.status(400).json({
          error: {
            code: 'MISSING_APPOINTMENT_ID',
            message: 'appointmentId is required',
          },
        });
      }

      // Fetch the appointment with full population
      const appointment = await Appointment.findById(appointmentId)
        .populate('customerId', 'fullName email phone')
        .populate('petId', 'name species breed size coatType')
        .populate('serviceId', 'name')
        .populate('serviceItemId', 'size coatType price')
        .populate('staffId', 'fullName role')
        .lean();

      if (!appointment) {
        return res.status(404).json({
          error: {
            code: 'APPOINTMENT_NOT_FOUND',
            message: `Appointment ${appointmentId} not found`,
          },
        });
      }

      // Emit the socket event
      emitAppointmentUpdated(appointment);

      logger.info(`[InternalSocket] Emitted appointment:updated for ${appointmentId}`, {
        companyId: appointment.companyId,
        customerId: appointment.customerId?._id,
      });

      res.json({
        success: true,
        message: 'Socket event emitted successfully',
        eventType: 'appointment:updated',
      });
    } catch (error) {
      logger.error('[InternalSocket] Error emitting appointment:updated:', error);
      res.status(500).json({
        error: {
          code: 'SOCKET_EMISSION_FAILED',
          message: 'Failed to emit socket event',
          details: error.message,
        },
      });
    }
  }

  /**
   * Emit appointment:canceled event
   * POST /api/v1/internal/socket/appointment-canceled
   */
  static async emitAppointmentCanceled(req, res) {
    try {
      const { appointmentId } = req.body;

      if (!appointmentId) {
        return res.status(400).json({
          error: {
            code: 'MISSING_APPOINTMENT_ID',
            message: 'appointmentId is required',
          },
        });
      }

      // Fetch the appointment with full population
      const appointment = await Appointment.findById(appointmentId)
        .populate('customerId', 'fullName email phone')
        .populate('petId', 'name species breed size coatType')
        .populate('serviceId', 'name')
        .populate('serviceItemId', 'size coatType price')
        .populate('staffId', 'fullName role')
        .lean();

      if (!appointment) {
        return res.status(404).json({
          error: {
            code: 'APPOINTMENT_NOT_FOUND',
            message: `Appointment ${appointmentId} not found`,
          },
        });
      }

      // Emit the socket event
      emitAppointmentCanceled(appointment);

      logger.info(`[InternalSocket] Emitted appointment:canceled for ${appointmentId}`, {
        companyId: appointment.companyId,
        customerId: appointment.customerId?._id,
      });

      res.json({
        success: true,
        message: 'Socket event emitted successfully',
        eventType: 'appointment:canceled',
      });
    } catch (error) {
      logger.error('[InternalSocket] Error emitting appointment:canceled:', error);
      res.status(500).json({
        error: {
          code: 'SOCKET_EMISSION_FAILED',
          message: 'Failed to emit socket event',
          details: error.message,
        },
      });
    }
  }
}
