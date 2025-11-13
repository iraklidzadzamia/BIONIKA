import { BookingService } from '../services/bookingService.js';
import { Appointment, Location } from '@petbuddy/shared';
import { parsePagination, createPaginationResponse } from '../utils/pagination.js';
import logger from '../utils/logger.js';
import { upsertGoogleEvent, deleteGoogleEvent } from '../services/googleCalendarEventService.js';
import { getSocketInstance } from '../socket/socketServer.js';
import {
  emitAppointmentCreated,
  emitAppointmentUpdated,
  emitAppointmentCanceled,
} from '../socket/events/appointmentEvents.js';

export class AppointmentController {
  /**
   * Get appointments with filtering and pagination
   */
  static async getAppointments(req, res) {
    try {
      const { companyId } = req.user;
      const pagination = parsePagination(req.query);

      // Build filter based on user role and query params
      const filter = { companyId };
      if (req.query.locationId) filter.locationId = req.query.locationId;

      // Role-based filtering
      if (req.user.role === 'groomer') {
        filter.staffId = req.user.id;
      }

      // Query filters
      if (req.query.staffId) filter.staffId = req.query.staffId;
      if (req.query.customerId) filter.customerId = req.query.customerId;
      if (req.query.status) filter.status = req.query.status;

      // Date range filtering - if no date filters provided, show upcoming appointments by default
      if (req.query.startDate || req.query.endDate) {
        filter.start = {};
        if (req.query.startDate) filter.start.$gte = new Date(req.query.startDate);
        if (req.query.endDate) filter.start.$lte = new Date(req.query.endDate);
      } else {
        // Default: show appointments from today onwards (including future appointments)
        filter.start = { $gte: new Date(new Date().setHours(0, 0, 0, 0)) };
      }

      // Get appointments with pagination
      const [appointments, totalResult] = await Promise.all([
        Appointment.find(filter)
          .populate('customerId', 'fullName email phone')
          .populate('petId', 'name species breed size coatType')
          .populate('serviceId', 'name')
          .populate('serviceItemId', 'size coatType price')
          .populate('staffId', 'fullName role')
          .populate('locationId', 'name label address phone')
          .sort(pagination.sort)
          .skip(pagination.skip)
          .limit(pagination.size)
          .lean(),
        Appointment.countDocuments(filter),
      ]);

      const response = createPaginationResponse(
        appointments,
        totalResult,
        pagination.page,
        pagination.size
      );

      res.json(response);
    } catch (error) {
      logger.error('Error getting appointments:', error);
      res.status(500).json({
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch appointments',
        },
      });
    }
  }

  /**
   * Get appointments for a specific customer
   */
  static async getCustomerAppointments(req, res) {
    try {
      const { companyId } = req.user;
      const { customerId } = req.params;
      const { status, upcoming } = req.query;

      const filter = { companyId, customerId };

      // Filter by status if provided
      if (status) {
        filter.status = status;
      }

      // Filter upcoming appointments (future only)
      if (upcoming === 'true') {
        filter.start = { $gte: new Date() };
        filter.status = { $in: ['scheduled', 'checked_in', 'in_progress'] };
      }

      const appointments = await Appointment.find(filter)
        .populate('petId', 'name species breed size coatType')
        .populate('serviceId', 'name')
        .populate('serviceItemId', 'size coatType price bufferBeforeMinutes bufferAfterMinutes')
        .populate('staffId', 'fullName role')
        .populate('locationId', 'name address')
        .sort({ start: 1 })
        .lean();

      res.json({
        success: true,
        appointments,
        count: appointments.length,
      });
    } catch (error) {
      logger.error('Error getting customer appointments:', error);
      res.status(500).json({
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch customer appointments',
        },
      });
    }
  }

  /**
   * Create new appointment
   */
  static async createAppointment(req, res) {
    try {
      const { companyId } = req.user;
      const { locationId } = req.body || {};
      if (!locationId) {
        return res.status(400).json({
          error: { code: 'MISSING_LOCATION', message: 'locationId is required' },
        });
      }
      // Optional: ensure location belongs to company
      const loc = await Location.findOne({ _id: locationId, companyId }).select('_id').lean();
      if (!loc) {
        return res.status(400).json({
          error: { code: 'INVALID_LOCATION', message: 'Invalid locationId for this company' },
        });
      }
      const appointmentData = {
        ...req.body,
        companyId,
        locationId,
      };

      const appointment = await BookingService.createAppointment(appointmentData);

      // Populate related data (nested items)
      await appointment.populate([
        { path: 'customerId', select: 'fullName email phone' },
        { path: 'petId', select: 'name species breed size coatType' },
        { path: 'serviceId', select: 'name' },
        {
          path: 'serviceItemId',
          select: 'size coatType price',
        },
        { path: 'staffId', select: 'fullName role' },
      ]);

      // Google Calendar sync (best-effort; do not block response)
      try {
        const eventId = await upsertGoogleEvent(companyId, appointment._id);
        if (eventId && !appointment.googleCalendarEventId) {
          appointment.googleCalendarEventId = eventId;
          await appointment.save();
        }
      } catch (syncErr) {
        logger.warn('Google Calendar sync after create failed:', syncErr?.message || syncErr);
      }

      res.status(201).json({
        message: 'Appointment created successfully',
        appointment,
      });
      // Emit after response (best-effort)
      try {
        const io = getSocketInstance();
        emitAppointmentCreated(io, companyId.toString(), { appointment });
      } catch {
        // Silently ignore socket emission errors - this is best-effort and shouldn't fail the request
      }
    } catch (error) {
      logger.error('Error creating appointment:', error);

      if (error.code === 'BOOKING_CONFLICT') {
        return res.status(409).json({
          error: {
            code: 'BOOKING_CONFLICT',
            message: error.message,
          },
        });
      }

      res.status(500).json({
        error: {
          code: 'CREATION_FAILED',
          message: 'Failed to create appointment',
        },
      });
    }
  }

  /**
   * Get single appointment by ID
   */
  static async getAppointment(req, res) {
    try {
      const { id } = req.params;
      const { companyId } = req.user;

      const appointment = await Appointment.findOne({ _id: id, companyId })
        .populate('customerId', 'fullName email phone')
        .populate('petId', 'name species breed size coatType')
        .populate('serviceId', 'name')
        .populate('serviceItemId', 'size coatType price bufferBeforeMinutes bufferAfterMinutes')
        .populate('staffId', 'fullName role')
        .populate('locationId', 'name label address phone');

      if (!appointment) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Appointment not found',
          },
        });
      }

      res.json(appointment);
    } catch (error) {
      logger.error('Error getting appointment:', error);
      res.status(500).json({
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch appointment',
        },
      });
    }
  }

  /**
   * Update appointment
   */
  static async updateAppointment(req, res) {
    try {
      const { id } = req.params;
      const { companyId } = req.user;
      const updateData = req.body;

      const appointment = await BookingService.updateAppointment(id, updateData, companyId);

      // Populate related data (nested items)
      await appointment.populate([
        { path: 'customerId', select: 'fullName email phone' },
        { path: 'petId', select: 'name species breed size coatType' },
        { path: 'serviceId', select: 'name' },
        {
          path: 'serviceItemId',
          select: 'size coatType price',
        },
        { path: 'staffId', select: 'fullName role' },
      ]);

      // Google Calendar sync (best-effort)
      try {
        const eventId = await upsertGoogleEvent(companyId, appointment._id);
        if (eventId && eventId !== appointment.googleCalendarEventId) {
          appointment.googleCalendarEventId = eventId;
          await appointment.save();
        }
      } catch (syncErr) {
        logger.warn('Google Calendar sync after update failed:', syncErr?.message || syncErr);
      }

      res.json({
        message: 'Appointment updated successfully',
        appointment,
      });
      // Emit after response (best-effort)
      try {
        const io = getSocketInstance();
        emitAppointmentUpdated(io, companyId.toString(), { appointment });
      } catch {
        // Silently ignore socket emission errors - this is best-effort and shouldn't fail the request
      }
    } catch (error) {
      logger.error('Error updating appointment:', error);

      if (error.code === 'BOOKING_CONFLICT') {
        return res.status(409).json({
          error: {
            code: 'BOOKING_CONFLICT',
            message: error.message,
          },
        });
      }

      if (error.message === 'Appointment not found') {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Appointment not found',
          },
        });
      }

      res.status(500).json({
        error: {
          code: 'UPDATE_FAILED',
          message: 'Failed to update appointment',
        },
      });
    }
  }

  /**
   * Update appointment status
   */
  static async updateAppointmentStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;
      const { companyId, id: userId } = req.user;

      // Validate status transition
      const validTransitions = {
        scheduled: ['checked_in', 'canceled', 'no_show'],
        checked_in: ['in_progress', 'canceled', 'no_show'],
        in_progress: ['completed', 'canceled', 'no_show'],
        completed: [],
        canceled: [],
        no_show: [],
      };

      const currentAppointment = await Appointment.findOne({ _id: id, companyId });
      if (!currentAppointment) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Appointment not found',
          },
        });
      }

      if (!validTransitions[currentAppointment.status].includes(status)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_STATUS_TRANSITION',
            message: `Cannot transition from ${currentAppointment.status} to ${status}`,
          },
        });
      }

      // Prepare update data with audit fields
      const updateData = { status };

      if (status === 'canceled') {
        if (!reason) {
          return res.status(400).json({
            error: {
              code: 'MISSING_REASON',
              message: 'Cancel reason is required when canceling an appointment',
            },
          });
        }
        updateData['audit.cancelReason'] = reason;
        updateData['audit.canceledByUserId'] = userId;
        updateData.canceledAt = new Date();
      } else if (status === 'no_show') {
        if (!reason) {
          return res.status(400).json({
            error: {
              code: 'MISSING_REASON',
              message: 'No-show reason is required when marking appointment as no-show',
            },
          });
        }
        updateData['audit.noShowReason'] = reason;
        updateData['audit.canceledByUserId'] = userId;
        updateData.canceledAt = new Date();
      } else if (status === 'checked_in') {
        updateData.checkedInAt = new Date();
      } else if (status === 'in_progress') {
        updateData.startedAt = new Date();
      } else if (status === 'completed') {
        updateData.completedAt = new Date();
      }

      const appointment = await Appointment.findOneAndUpdate({ _id: id, companyId }, updateData, {
        new: true,
        runValidators: true,
      }).populate([
        { path: 'customerId', select: 'fullName email phone' },
        { path: 'petId', select: 'name species breed size coatType' },
        { path: 'serviceId', select: 'name' },
        {
          path: 'serviceItemId',
          select: 'size coatType price',
        },
        { path: 'staffId', select: 'fullName role' },
      ]);

      // Google Calendar sync (best-effort)
      try {
        if (status === 'canceled') {
          await deleteGoogleEvent(companyId, appointment._id);
        } else {
          const eventId = await upsertGoogleEvent(companyId, appointment._id);
          if (eventId && eventId !== appointment.googleCalendarEventId) {
            appointment.googleCalendarEventId = eventId;
            await appointment.save();
          }
        }
      } catch (syncErr) {
        logger.warn(
          'Google Calendar sync after status update failed:',
          syncErr?.message || syncErr
        );
      }

      res.json({
        message: 'Appointment status updated successfully',
        appointment,
      });
      // Emit after response (best-effort)
      try {
        const io = getSocketInstance();
        emitAppointmentUpdated(io, companyId.toString(), { appointment });
      } catch {
        // Silently ignore socket emission errors - this is best-effort and shouldn't fail the request
      }
    } catch (error) {
      logger.error('Error updating appointment status:', error);
      res.status(500).json({
        error: {
          code: 'STATUS_UPDATE_FAILED',
          message: 'Failed to update appointment status',
        },
      });
    }
  }

  /**
   * Cancel appointment
   */
  static async cancelAppointment(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const { companyId, id: userId } = req.user;

      if (!reason) {
        return res.status(400).json({
          error: {
            code: 'MISSING_REASON',
            message: 'Cancel reason is required when canceling an appointment',
          },
        });
      }

      const appointment = await Appointment.findOneAndUpdate(
        { _id: id, companyId },
        {
          status: 'canceled',
          canceledAt: new Date(),
          'audit.cancelReason': reason,
          'audit.canceledByUserId': userId,
        },
        { new: true, runValidators: true }
      ).populate([
        { path: 'customerId', select: 'fullName email phone' },
        { path: 'petId', select: 'name species breed size coatType' },
        { path: 'serviceId', select: 'name' },
        {
          path: 'serviceItemId',
          select: 'size coatType price',
        },
        { path: 'staffId', select: 'fullName role' },
      ]);

      if (!appointment) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Appointment not found',
          },
        });
      }

      // Google Calendar sync (best-effort)
      try {
        await deleteGoogleEvent(companyId, appointment._id);
      } catch (syncErr) {
        logger.warn('Google Calendar delete after cancel failed:', syncErr?.message || syncErr);
      }

      res.json({
        message: 'Appointment canceled successfully',
        appointment,
      });
      // Emit after response (best-effort)
      try {
        const io = getSocketInstance();
        emitAppointmentCanceled(io, companyId.toString(), { appointment });
      } catch {
        // Silently ignore socket emission errors - this is best-effort and shouldn't fail the request
      }
    } catch (error) {
      logger.error('Error canceling appointment:', error);
      res.status(500).json({
        error: {
          code: 'CANCEL_FAILED',
          message: 'Failed to cancel appointment',
        },
      });
    }
  }
}
