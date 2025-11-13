/**
 * Booking Hold Manager
 * 
 * Prevents race conditions in concurrent booking requests by implementing
 * a temporary hold mechanism. When checking staff availability, a hold is
 * placed to prevent other concurrent requests from booking the same slot.
 * 
 * USAGE:
 * ```javascript
 * const holdId = await createBookingHold(staffId, startTime, endTime, companyId);
 * try {
 *   const appointment = await BookingService.createAppointment(...);
 *   await releaseBookingHold(holdId);
 *   return appointment;
 * } catch (error) {
 *   await releaseBookingHold(holdId);
 *   throw error;
 * }
 * ```
 */

import BookingHold from '../../backend/src/models/BookingHold.js';
import logger from '../utils/logger.js';
import { executeDatabaseOperation } from './databaseWrapper.js';

/**
 * Create a temporary booking hold to prevent concurrent bookings
 *
 * @param {string} staffId - Staff member ID
 * @param {Date} startTime - Appointment start time
 * @param {Date} endTime - Appointment end time
 * @param {string} companyId - Company ID
 * @param {Object} metadata - Additional metadata (chatId, platform, locationId, customerId, resourceTypeId)
 * @returns {Promise<string>} Hold ID
 * @throws {Error} If hold cannot be created (slot already held)
 */
export async function createBookingHold(staffId, startTime, endTime, companyId, metadata = {}) {
  const { chatId, platform, locationId, customerId, resourceTypeId } = metadata;

  // Validate required fields for the schema
  if (!locationId) {
    throw new Error('locationId is required for booking hold');
  }
  if (!customerId) {
    throw new Error('customerId is required for booking hold');
  }
  if (!resourceTypeId) {
    throw new Error('resourceTypeId is required for booking hold');
  }

  try {
    // Check if there's already a hold for this slot
    // Query the tentative array for overlapping holds with the same resource
    const existingHold = await executeDatabaseOperation(
      'checkExistingBookingHold',
      async () => {
        return await BookingHold.findOne({
          companyId,
          locationId,
          expiresAt: { $gt: new Date() }, // Not expired
          tentative: {
            $elemMatch: {
              staffId: staffId,
              resourceTypeId: resourceTypeId,
              start: { $lt: endTime },
              end: { $gt: startTime },
            },
          },
        }).lean();
      },
      { platform, chatId, companyId }
    );

    if (existingHold) {
      const error = new Error(
        `Time slot already held by another request. Hold expires at ${existingHold.expiresAt.toISOString()}`
      );
      error.code = 'BOOKING_HOLD_EXISTS';
      error.existingHoldId = existingHold._id;
      throw error;
    }

    // Create new hold (expires in 30 seconds)
    // Use the new schema with tentative array
    const hold = await executeDatabaseOperation(
      'createBookingHold',
      async () => {
        return await BookingHold.create({
          companyId,
          locationId,
          customerId,
          tentative: [
            {
              staffId: staffId,
              resourceTypeId: resourceTypeId,
              start: startTime,
              end: endTime,
            },
          ],
          createdBy: 'assistant', // Mark as created by AI assistant
          expiresAt: new Date(Date.now() + 30000), // 30 seconds
        });
      },
      { platform, chatId, companyId }
    );

    logger.messageFlow.info(
      platform || 'system',
      chatId || 'unknown',
      'booking-hold-created',
      `Booking hold created for staff ${staffId} from ${startTime.toISOString()} to ${endTime.toISOString()}`,
      { holdId: hold._id, expiresAt: hold.expiresAt }
    );

    return String(hold._id);

  } catch (error) {
    logger.messageFlow.error(
      platform || 'system',
      chatId || 'unknown',
      'booking-hold-error',
      error
    );
    throw error;
  }
}

/**
 * Release a booking hold
 * Should be called after appointment is created or if booking fails
 * 
 * @param {string} holdId - Hold ID to release
 * @param {Object} metadata - Additional metadata for logging
 * @returns {Promise<void>}
 */
export async function releaseBookingHold(holdId, metadata = {}) {
  const { chatId, platform } = metadata;
  
  if (!holdId) {
    logger.messageFlow.warn(
      platform || 'system',
      chatId || 'unknown',
      'booking-hold-release',
      'Attempted to release booking hold with no holdId'
    );
    return;
  }
  
  try {
    await executeDatabaseOperation(
      'releaseBookingHold',
      async () => {
        return await BookingHold.deleteOne({ _id: holdId });
      },
      { platform, chatId }
    );
    
    logger.messageFlow.info(
      platform || 'system',
      chatId || 'unknown',
      'booking-hold-released',
      `Booking hold ${holdId} released`
    );
    
  } catch (error) {
    logger.messageFlow.error(
      platform || 'system',
      chatId || 'unknown',
      'booking-hold-release-error',
      error,
      { holdId }
    );
    // Don't throw - release failures should not break the booking flow
  }
}

/**
 * Check if a time slot is held by another request
 *
 * @param {string} staffId - Staff member ID
 * @param {Date} startTime - Appointment start time
 * @param {Date} endTime - Appointment end time
 * @param {string} companyId - Company ID
 * @param {string} locationId - Location ID
 * @param {string} resourceTypeId - Resource type ID
 * @returns {Promise<boolean>} True if slot is held
 */
export async function isSlotHeld(staffId, startTime, endTime, companyId, locationId, resourceTypeId) {
  try {
    const hold = await executeDatabaseOperation(
      'checkBookingHold',
      async () => {
        return await BookingHold.findOne({
          companyId,
          locationId,
          expiresAt: { $gt: new Date() },
          tentative: {
            $elemMatch: {
              staffId: staffId,
              resourceTypeId: resourceTypeId,
              start: { $lt: endTime },
              end: { $gt: startTime },
            },
          },
        }).lean();
      },
      { platform: 'system' }
    );

    return !!hold;

  } catch (error) {
    logger.messageFlow.error(
      'system',
      'unknown',
      'check-booking-hold-error',
      error
    );
    // On error, assume not held (fail open to allow booking)
    return false;
  }
}

/**
 * Clean up expired booking holds
 * Should be called periodically (e.g., every minute)
 *
 * @returns {Promise<number>} Number of holds cleaned up
 */
export async function cleanupExpiredHolds() {
  try {
    const result = await executeDatabaseOperation(
      'cleanupExpiredBookingHolds',
      async () => {
        return await BookingHold.deleteMany({
          expiresAt: { $lt: new Date() },
        });
      },
      { platform: 'system' },
      { throwOnConnectionError: false }  // CLEANUP FIX: Don't fail during shutdown
    );
    
    const deletedCount = result.deletedCount || 0;
    
    if (deletedCount > 0) {
      logger.messageFlow.info(
        'system',
        'cleanup',
        'booking-holds-cleanup',
        `Cleaned up ${deletedCount} expired booking holds`
      );
    }
    
    return deletedCount;
    
  } catch (error) {
    logger.messageFlow.error(
      'system',
      'cleanup',
      'booking-holds-cleanup-error',
      error
    );
    return 0;
  }
}

// Start periodic cleanup of expired holds (every minute)
setInterval(async () => {
  await cleanupExpiredHolds();
}, 60000); // 60 seconds

/**
 * Get all active holds for debugging
 * 
 * @param {string} companyId - Optional company ID filter
 * @returns {Promise<Array>} Active holds
 */
export async function getActiveHolds(companyId = null) {
  try {
    const query = { expiresAt: { $gt: new Date() } };
    if (companyId) {
      query.companyId = companyId;
    }
    
    const holds = await executeDatabaseOperation(
      'getActiveBookingHolds',
      async () => {
        return await BookingHold.find(query)
          .sort({ createdAt: -1 })
          .limit(100)
          .lean();
      },
      { platform: 'system' }
    );
    
    return holds;
    
  } catch (error) {
    logger.messageFlow.error(
      'system',
      'holds',
      'get-active-holds-error',
      error
    );
    return [];
  }
}

export default {
  createBookingHold,
  releaseBookingHold,
  isSlotHeld,
  cleanupExpiredHolds,
  getActiveHolds,
};

