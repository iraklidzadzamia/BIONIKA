/**
 * Fixed Grid Configuration for Perfect Alignment
 * All schedule views use these constants for consistent positioning
 */

export const GRID_CONFIG = {
  // Slot configuration
  SLOT_MINUTES: 30, // 30-minute increments
  SLOT_HEIGHT_DAY_VIEW: 60, // px per 30min in day view
  SLOT_WIDTH_WEEK_VIEW: 120, // px per 30min in week view (horizontal lanes)
  SLOT_HEIGHT_WEEK_VIEW: 80, // px per staff row in week view

  // Time range
  DEFAULT_START_HOUR: 8, // 8 AM
  DEFAULT_END_HOUR: 18, // 6 PM

  // Layout
  TIME_COLUMN_WIDTH: 80, // px for time labels
  STAFF_LABEL_WIDTH: 140, // px for staff names in week view

  // Colors
  GRID_LINE_COLOR: '#e5e7eb', // gray-200
  GRID_BG_COLOR: '#ffffff',
};

/**
 * Calculate slot index from time
 * @param {Date|string} datetime - Date/time
 * @param {number} startHour - Start hour of grid
 * @returns {number} Slot index (0-based)
 */
export function getSlotIndex(datetime, startHour = GRID_CONFIG.DEFAULT_START_HOUR) {
  const date = datetime instanceof Date ? datetime : new Date(datetime);
  const hours = date.getHours();
  const minutes = date.getMinutes();

  const totalMinutes = (hours - startHour) * 60 + minutes;
  return Math.floor(totalMinutes / GRID_CONFIG.SLOT_MINUTES);
}

/**
 * Calculate duration in slots
 * @param {Date|string} start
 * @param {Date|string} end
 * @returns {number} Number of slots
 */
export function getDurationInSlots(start, end) {
  const startDate = start instanceof Date ? start : new Date(start);
  const endDate = end instanceof Date ? end : new Date(end);

  const durationMinutes = (endDate - startDate) / 60000;
  return Math.ceil(durationMinutes / GRID_CONFIG.SLOT_MINUTES);
}

/**
 * Generate time slots for a day
 * @param {number} startHour
 * @param {number} endHour
 * @returns {Array<{hour: number, minute: number, label: string}>}
 */
export function generateTimeSlots(
  startHour = GRID_CONFIG.DEFAULT_START_HOUR,
  endHour = GRID_CONFIG.DEFAULT_END_HOUR
) {
  const slots = [];

  for (let hour = startHour; hour <= endHour; hour++) {
    for (let minute = 0; minute < 60; minute += GRID_CONFIG.SLOT_MINUTES) {
      // Don't include slot at endHour
      if (hour === endHour && minute > 0) break;

      slots.push({
        hour,
        minute,
        label: formatTimeLabel(hour, minute),
      });
    }
  }

  return slots;
}

/**
 * Format time label (e.g., "9:00 AM")
 */
function formatTimeLabel(hour, minute) {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  const displayMinute = minute.toString().padStart(2, '0');

  return `${displayHour}:${displayMinute} ${period}`;
}

/**
 * Calculate pixel position for day view (vertical)
 * @param {Date|string} datetime
 * @param {number} startHour
 * @returns {number} Y position in pixels
 */
export function getVerticalPosition(datetime, startHour = GRID_CONFIG.DEFAULT_START_HOUR) {
  const slotIndex = getSlotIndex(datetime, startHour);
  return slotIndex * GRID_CONFIG.SLOT_HEIGHT_DAY_VIEW;
}

/**
 * Calculate pixel height for day view
 * @param {Date|string} start
 * @param {Date|string} end
 * @returns {number} Height in pixels
 */
export function getVerticalHeight(start, end) {
  const slots = getDurationInSlots(start, end);
  return slots * GRID_CONFIG.SLOT_HEIGHT_DAY_VIEW;
}

/**
 * Calculate pixel position for week view (horizontal)
 * @param {Date|string} datetime
 * @param {number} startHour
 * @returns {number} X position in pixels
 */
export function getHorizontalPosition(datetime, startHour = GRID_CONFIG.DEFAULT_START_HOUR) {
  const slotIndex = getSlotIndex(datetime, startHour);
  return slotIndex * GRID_CONFIG.SLOT_WIDTH_WEEK_VIEW;
}

/**
 * Calculate pixel width for week view
 * @param {Date|string} start
 * @param {Date|string} end
 * @returns {number} Width in pixels
 */
export function getHorizontalWidth(start, end) {
  const slots = getDurationInSlots(start, end);
  return slots * GRID_CONFIG.SLOT_WIDTH_WEEK_VIEW;
}

/**
 * Check if appointment overlaps with time range
 */
export function isOverlapping(apt1Start, apt1End, apt2Start, apt2End) {
  const start1 = apt1Start instanceof Date ? apt1Start : new Date(apt1Start);
  const end1 = apt1End instanceof Date ? apt1End : new Date(apt1End);
  const start2 = apt2Start instanceof Date ? apt2Start : new Date(apt2Start);
  const end2 = apt2End instanceof Date ? apt2End : new Date(apt2End);

  return start1 < end2 && end1 > start2;
}

/**
 * Snap minutes to nearest slot
 * @param {number} minutes
 * @returns {number} Snapped minutes
 */
export function snapToSlot(minutes) {
  return Math.round(minutes / GRID_CONFIG.SLOT_MINUTES) * GRID_CONFIG.SLOT_MINUTES;
}

/**
 * Get working hours from staff schedules
 * @param {Array} trainers - Staff array
 * @param {number} weekday - Day of week (0-6)
 * @returns {{startHour: number, endHour: number}}
 */
export function getWorkingHours(trainers, weekday) {
  if (!Array.isArray(trainers) || trainers.length === 0) {
    return {
      startHour: GRID_CONFIG.DEFAULT_START_HOUR,
      endHour: GRID_CONFIG.DEFAULT_END_HOUR,
    };
  }

  const schedules = trainers
    .map(trainer => trainer.schedules?.find(s => s.weekday === weekday))
    .filter(Boolean);

  if (schedules.length === 0) {
    return {
      startHour: GRID_CONFIG.DEFAULT_START_HOUR,
      endHour: GRID_CONFIG.DEFAULT_END_HOUR,
    };
  }

  const startHours = schedules.map(s => parseInt(s.startTime.split(':')[0]));
  const endHours = schedules.map(s => {
    const [hour, minute] = s.endTime.split(':').map(Number);
    return hour + (minute > 0 ? 1 : 0); // Round up if has minutes
  });

  return {
    startHour: Math.min(...startHours),
    endHour: Math.max(...endHours),
  };
}
