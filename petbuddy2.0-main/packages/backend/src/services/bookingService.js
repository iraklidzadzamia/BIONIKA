import mongoose from 'mongoose';
import moment from 'moment-timezone';
;
;
;
import Resource from '../models/Resource.js';
import ResourceReservation from '../models/ResourceReservation.js';
import BookingHold from '../models/BookingHold.js';
import StaffSchedule from '../models/StaffSchedule.js';
import TimeOff from '../models/TimeOff.js';
;
import { isWithinWorkingHours, isWithinBreakWindow } from '../utils/dates.js';
import logger from '../utils/logger.js';
import { Appointment, Company, ServiceCategory, ServiceItem } from '@petbuddy/shared';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lazy-loaded socket functions (only loaded when available and needed)
// Socket modules are optional - meta-bot doesn't have access to them
let socketModulesAttempted = false;
const socketModules = {
  getSocketInstance: null,
  emitAppointmentCreated: null,
  emitAppointmentUpdated: null,
};

async function loadSocketModules() {
  if (socketModulesAttempted) return socketModules;
  socketModulesAttempted = true;
  
  try {
    // Check if socket files exist before trying to import
    const socketPath = path.join(__dirname, '../socket/socketServer.js');
    
    if (fs.existsSync(socketPath)) {
      // Use dynamic import to load socket modules only when available
      // eslint-disable-next-line no-eval
      const socketModule = await eval('import("../socket/socketServer.js")');
      // eslint-disable-next-line no-eval
      const appointmentEventsModule = await eval('import("../socket/events/appointmentEvents.js")');
      socketModules.getSocketInstance = socketModule.getSocketInstance;
      socketModules.emitAppointmentCreated = appointmentEventsModule.emitAppointmentCreated;
      socketModules.emitAppointmentUpdated = appointmentEventsModule.emitAppointmentUpdated;
      logger.info('Socket functionality loaded successfully');
    } else {
      logger.info('Socket functionality not available (this is normal for meta-bot)');
    }
  } catch (error) {
    // Socket modules not available - this is OK for services like meta-bot
    logger.info('Socket functionality not available (this is normal for meta-bot)', { error: error.message });
  }
  
  return socketModules;
}

export class BookingService {
  /**
   * Validate appointment data with strict checks
   * Returns { valid: boolean, errors: string[] }
   */
  static validateAppointmentData(appointmentData) {
    const errors = [];
    const required = {
      companyId: 'Company ID is required',
      customerId: 'Customer ID is required',
      serviceId: 'Service ID is required',
      serviceItemId: 'Service item/variant ID is required',
      staffId: 'Staff member ID is required',
      locationId: 'Location ID is required',
      start: 'Appointment start time is required',
      end: 'Appointment end time is required',
    };

    // Check all required fields
    for (const [field, message] of Object.entries(required)) {
      if (!appointmentData[field]) {
        errors.push(message);
      }
    }

    // Validate date/time fields if present
    if (appointmentData.start) {
      const startDate = new Date(appointmentData.start);
      if (isNaN(startDate.getTime())) {
        errors.push('Invalid start time format. Must be a valid date.');
      }
    }

    if (appointmentData.end) {
      const endDate = new Date(appointmentData.end);
      if (isNaN(endDate.getTime())) {
        errors.push('Invalid end time format. Must be a valid date.');
      }
    }

    // Validate time logic
    if (appointmentData.start && appointmentData.end) {
      const startDate = new Date(appointmentData.start);
      const endDate = new Date(appointmentData.end);
      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        if (endDate <= startDate) {
          errors.push('End time must be after start time');
        }
      }
    }

    // Validate ObjectId fields
    const objectIdFields = ['companyId', 'customerId', 'serviceId', 'serviceItemId', 'staffId', 'locationId'];
    for (const field of objectIdFields) {
      if (appointmentData[field] && !mongoose.Types.ObjectId.isValid(appointmentData[field])) {
        errors.push(`Invalid ${field}: must be a valid ID`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if a booking time slot is available
   */
  static async checkAvailability(
    staffId,
    start,
    end,
    companyId,
    excludeAppointmentId = null,
    locationId = null
  ) {
    try {
      // Staff is optional; if provided, enforce staff availability; otherwise skip staff checks
      if (staffId) {
        // Fetch company for timezone and work hours validation
        const company = await Company.findById(companyId).select('timezone settings').lean();
        if (!company) {
          return {
            available: false,
            reason: 'Company not found',
          };
        }

        // Check for overlapping appointments for the staff across all locations
        const overlappingAppointment = await Appointment.findOne({
          staffId,
          companyId,
          _id: { $ne: excludeAppointmentId },
          status: { $nin: ['canceled', 'no_show'] },
          $or: [
            { start: { $lt: end }, end: { $gt: start } },
          ],
        });

        if (overlappingAppointment) {
          return {
            available: false,
            reason: 'Overlapping appointment',
            conflictingAppointment: overlappingAppointment._id,
          };
        }

        // Check for time off
        const timeOff = await TimeOff.findOne({
          userId: staffId,
          companyId,
          start: { $lt: end },
          end: { $gt: start },
        });

        if (timeOff) {
          return {
            available: false,
            reason: 'Staff time off',
            timeOffId: timeOff._id,
          };
        }

        // TIMEZONE HANDLING: Convert UTC dates back to company timezone for validation
        // 1. start/end are JavaScript Date objects (stored as UTC)
        // 2. moment.tz(date, timezone) interprets the UTC date in the company's timezone
        // 3. .day() gets the weekday in company timezone (critical for working hours)
        // 4. .format('HH:mm') gets the time in company timezone for validation
        // This ensures validation uses local business hours, not UTC time
        const weekday = moment.tz(start, company.timezone).day();

        logger.info(`[checkAvailability] Timezone validation debug:`, {
          staffId,
          companyTimezone: company.timezone,
          requestedStart: start,
          requestedEnd: end,
          weekday,
          localStart: moment.tz(start, company.timezone).format('YYYY-MM-DD HH:mm:ss'),
          localEnd: moment.tz(end, company.timezone).format('YYYY-MM-DD HH:mm:ss'),
        });

        let schedule = await StaffSchedule.findOne({
          userId: staffId,
          companyId,
          ...(locationId ? { locationId } : {}),
          weekday,
        });

        logger.info(`[checkAvailability] Staff schedule query:`, {
          staffId,
          weekday,
          locationId,
          foundSchedule: !!schedule,
          scheduleData: schedule ? {
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            breakWindows: schedule.breakWindows,
          } : null,
        });

        // Fallback to company-wide work hours if personal schedule is missing
        if (!schedule && Array.isArray(company.settings?.workHours)) {
          logger.info(`[checkAvailability] No staff schedule found, checking company work hours`, {
            companyWorkHours: company.settings.workHours,
          });

          const companyDay = company.settings.workHours.find(w => w.weekday === weekday);
          if (companyDay) {
            logger.info(`[checkAvailability] Using company work hours for weekday ${weekday}`, companyDay);
            schedule = {
              weekday,
              startTime: companyDay.startTime,
              endTime: companyDay.endTime,
              breakWindows: [],
            };
          }
        }

        if (!schedule) {
          logger.warn(`[checkAvailability] No schedule found for weekday ${weekday}`, {
            staffId,
            companyWorkHours: company.settings?.workHours,
          });
          return {
            available: false,
            reason: 'No schedule for this day',
          };
        }

        // Convert appointment times to company timezone for comparison
        const companyTimezone = company.timezone;
        // Use moment to properly convert to company timezone and format as HH:mm
        const startTime = moment.tz(start, companyTimezone).format('HH:mm');
        const endTime = moment.tz(end, companyTimezone).format('HH:mm');

        logger.info(`[checkAvailability] Validating times against schedule:`, {
          startTime,
          endTime,
          scheduleStartTime: schedule.startTime,
          scheduleEndTime: schedule.endTime,
        });

        if (!isWithinWorkingHours(startTime, [schedule])) {
          logger.warn(`[checkAvailability] Start time ${startTime} is outside working hours`, {
            schedule: { startTime: schedule.startTime, endTime: schedule.endTime },
          });
          return {
            available: false,
            reason: 'Outside working hours',
          };
        }

        if (!isWithinWorkingHours(endTime, [schedule])) {
          logger.warn(`[checkAvailability] End time ${endTime} is outside working hours`, {
            schedule: { startTime: schedule.startTime, endTime: schedule.endTime },
          });
          return {
            available: false,
            reason: 'Outside working hours',
          };
        }

        // Check break windows
        if (schedule.breakWindows && schedule.breakWindows.length > 0) {
          for (const breakWindow of schedule.breakWindows) {
            if (
              isWithinBreakWindow(startTime, [breakWindow]) ||
              isWithinBreakWindow(endTime, [breakWindow])
            ) {
              return {
                available: false,
                reason: 'Overlaps with break time',
              };
            }
          }
        }
      }

      return { available: true };
    } catch (error) {
      logger.error('Error checking availability:', error);
      throw error;
    }
  }

  /**
   * Create a new appointment
   */
  static async createAppointment(appointmentData) {
    try {
      // Strict validation first
      const validation = this.validateAppointmentData(appointmentData);
      if (!validation.valid) {
        const error = new Error(
          `Appointment validation failed: ${validation.errors.join('; ')}`
        );
        error.statusCode = 400;
        error.code = 'VALIDATION_FAILED';
        error.validationErrors = validation.errors;
        throw error;
      }

      const { staffId, start, end, companyId, serviceId, serviceItemId, locationId } =
        appointmentData;

      // Validate staff is qualified for the service category
      if (staffId && serviceId) {
        const User = mongoose.model('User');
        const staff = await User.findOne({ _id: staffId, companyId }).select('serviceCategoryIds').lean();

        if (staff && Array.isArray(staff.serviceCategoryIds) && staff.serviceCategoryIds.length > 0) {
          const isQualified = staff.serviceCategoryIds.some(
            catId => catId.toString() === serviceId.toString()
          );

          if (!isQualified) {
            const error = new Error('Staff member is not qualified for this service category');
            error.statusCode = 400;
            error.code = 'STAFF_NOT_QUALIFIED';
            throw error;
          }
        }
        // If serviceCategoryIds is empty or undefined, staff can serve all services (backward compatible)
      }

      // Check staff availability if staff provided
      const staffAvailability = await this.checkAvailability(
        staffId,
        start,
        end,
        companyId,
        null,
        locationId || null
      );
      if (!staffAvailability.available) {
        const error = new Error(`Booking not available: ${staffAvailability.reason}`);
        error.statusCode = 409;
        error.code = 'BOOKING_CONFLICT';
        throw error;
      }

      // Resolve service and variant
      const service = await ServiceCategory.findById(serviceId);
      if (!service) {
        throw new Error('Service not found');
      }

      let variant = null;
      if (serviceItemId) {
        variant = await ServiceItem.findById(serviceItemId);
        if (!variant) {
          throw new Error('Service item not found');
        }
      }

      // Validate resource capacity for the requested window
      if (variant && Array.isArray(variant.requiredResources)) {
        for (const req of variant.requiredResources) {
          const ok = await BookingService.#checkResourceCapacity(
            companyId,
            req.resourceTypeId,
            req.quantity || 1,
            new Date(start),
            new Date(end)
          );
          if (!ok.available) {
            const error = new Error(`Resource unavailable: ${ok.reason}`);
            error.statusCode = 409;
            error.code = 'RESOURCE_CONFLICT';
            throw error;
          }
        }
      }

      // Use MongoDB transaction to ensure atomicity
      const session = await mongoose.startSession();
      let createdAppointment = null;

      try {
        await session.withTransaction(async () => {
          // Create appointment
          const appointment = new Appointment({
            ...appointmentData,
          });
          await appointment.save({ session });

          // Create resource reservations for the appointment
          const reservations = [];
          if (variant && Array.isArray(variant.requiredResources)) {
            for (const req of variant.requiredResources) {
              for (let i = 0; i < (req.quantity || 1); i += 1) {
                reservations.push({
                  companyId,
                  locationId,
                  appointmentId: appointment._id,
                  appointmentItemId: appointment._id, // flat model: use appointment id
                  resourceTypeId: req.resourceTypeId,
                  start: new Date(appointment.start),
                  end: new Date(appointment.end),
                });
              }
            }
          }

          if (reservations.length > 0) {
            await ResourceReservation.insertMany(reservations, { session });
          }

          createdAppointment = appointment;
        });

        // Populate related data for socket emission
        await createdAppointment.populate([
          { path: 'customerId', select: 'fullName email phone' },
          { path: 'petId', select: 'name species breed size coatType' },
          { path: 'serviceId', select: 'name' },
          {
            path: 'serviceItemId',
            select: 'size coatType price',
          },
          { path: 'staffId', select: 'fullName role' },
        ]);

        // Emit socket event for real-time updates (best-effort)
        try {
          const { getSocketInstance, emitAppointmentCreated } = await loadSocketModules();
          if (getSocketInstance && emitAppointmentCreated) {
            const io = getSocketInstance();
            emitAppointmentCreated(io, appointmentData.companyId.toString(), { appointment: createdAppointment });
          }
        } catch {
          // Silently ignore socket emission errors - this is best-effort and shouldn't fail the creation
        }

        logger.info(`Appointment created: ${createdAppointment._id}`);
        return createdAppointment;
      } finally {
        await session.endSession();
      }
    } catch (error) {
      logger.error('Error creating appointment:', error);
      throw error;
    }
  }

  /**
   * Update appointment (reschedule)
   */
  static async updateAppointment(appointmentId, updateData, companyId) {
    try {
      const { start, end, staffId, serviceId, serviceItemId, locationId } = updateData;

      // Fetch the current appointment to get original values
      const currentAppointment = await Appointment.findById(appointmentId).select('staffId serviceId start end').lean();
      if (!currentAppointment) {
        throw new Error('Appointment not found');
      }

      // Determine final values (new values override current values)
      const finalStaffId = staffId !== undefined ? staffId : currentAppointment.staffId;
      const finalServiceId = serviceId !== undefined ? serviceId : currentAppointment.serviceId;
      const finalStart = start !== undefined ? start : currentAppointment.start;
      const finalEnd = end !== undefined ? end : currentAppointment.end;

      // Validate staff qualification when changing staff or service
      if (finalStaffId && finalServiceId) {
        const User = mongoose.model('User');
        const staff = await User.findOne({ _id: finalStaffId, companyId }).select('serviceCategoryIds').lean();

        if (staff && Array.isArray(staff.serviceCategoryIds) && staff.serviceCategoryIds.length > 0) {
          const isQualified = staff.serviceCategoryIds.some(
            catId => catId.toString() === finalServiceId.toString()
          );

          if (!isQualified) {
            const error = new Error('Staff member is not qualified for this service category');
            error.statusCode = 400;
            error.code = 'STAFF_NOT_QUALIFIED';
            throw error;
          }
        }
      }

      // Check availability with the final (new or current) values
      if (start !== undefined || end !== undefined || staffId !== undefined) {
        const availability = await this.checkAvailability(
          finalStaffId,
          finalStart,
          finalEnd,
          companyId,
          appointmentId,
          locationId !== undefined ? locationId : null
        );

        if (!availability.available) {
          const error = new Error(`Reschedule not available: ${availability.reason}`);
          error.statusCode = 409;
          error.code = 'BOOKING_CONFLICT';
          throw error;
        }
      }

      const appointment = await Appointment.findByIdAndUpdate(appointmentId, updateData, {
        new: true,
        runValidators: true,
      });

      if (!appointment) {
        throw new Error('Appointment not found');
      }

      // Rebuild resource reservations if time or variant changed
      if (start || end || serviceItemId) {
        // Validate capacity with latest variant
        const variantIdToUse = serviceItemId || appointment.serviceItemId;
        if (variantIdToUse) {
          const variant = await ServiceItem.findById(variantIdToUse);
          if (variant) {
            for (const req of variant.requiredResources || []) {
              const ok = await BookingService.#checkResourceCapacity(
                companyId,
                req.resourceTypeId,
                req.quantity || 1,
                new Date(appointment.start),
                new Date(appointment.end)
              );
              if (!ok.available) {
                const error = new Error(`Resource became unavailable: ${ok.reason}`);
                error.statusCode = 409;
                error.code = 'RESOURCE_CONFLICT';
                throw error;
              }
            }
          }
        }

        const session = await mongoose.startSession();
        try {
          await session.withTransaction(async () => {
            await ResourceReservation.deleteMany({ appointmentId }, { session });

            const reservations = [];
            if (variantIdToUse) {
              const variant = await ServiceItem.findById(variantIdToUse);
              for (const req of variant?.requiredResources || []) {
                for (let i = 0; i < (req.quantity || 1); i += 1) {
                  reservations.push({
                    companyId,
                    appointmentId: appointment._id,
                    appointmentItemId: appointment._id,
                    resourceTypeId: req.resourceTypeId,
                    start: new Date(appointment.start),
                    end: new Date(appointment.end),
                  });
                }
              }
            }

            if (reservations.length > 0) {
              await ResourceReservation.insertMany(reservations, { session });
            }
          });
        } finally {
          await session.endSession();
        }
      }

      // Populate related data for socket emission
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

      // Emit socket event for real-time updates (best-effort)
      try {
        const { getSocketInstance, emitAppointmentUpdated } = await loadSocketModules();
        if (getSocketInstance && emitAppointmentUpdated) {
          const io = getSocketInstance();
          emitAppointmentUpdated(io, companyId.toString(), { appointment });
        }
      } catch {
        // Silently ignore socket emission errors - this is best-effort and shouldn't fail the update
      }

      logger.info(`Appointment updated: ${appointmentId}`);
      return appointment;
    } catch (error) {
      logger.error('Error updating appointment:', error);
      throw error;
    }
  }

  // Private helper to check resource capacity
  static async #checkResourceCapacity(companyId, resourceTypeId, requiredQuantity, start, end) {
    // Total capacity by resource type
    const resources = await Resource.find({ companyId, resourceTypeId, active: true });
    const totalCapacity = resources.reduce((sum, r) => sum + (r.capacity || 1), 0);
    if (totalCapacity <= 0) {
      return { available: false, reason: `No resources of this type available` };
    }

    // Count overlapping reservations for the window
    const overlap = {
      start: { $lt: end },
      end: { $gt: start },
    };
    const concurrentReservations = await ResourceReservation.countDocuments({
      companyId,
      resourceTypeId,
      ...overlap,
    });

    // Count overlapping booking holds (tentatives)
    const concurrentHolds = await BookingHold.aggregate([
      { $match: { companyId } },
      { $unwind: '$tentative' },
      {
        $match: {
          'tentative.resourceTypeId': resourceTypeId,
          'tentative.start': { $lt: end },
          'tentative.end': { $gt: start },
          expiresAt: { $gt: new Date() },
        },
      },
      { $count: 'count' },
    ]);

    const holdCount = concurrentHolds?.[0]?.count || 0;
    const used = concurrentReservations + holdCount;
    const availableCapacity = totalCapacity - used;
    if (availableCapacity < requiredQuantity) {
      return { available: false, reason: `Insufficient resource capacity` };
    }
    return { available: true };
  }
}
