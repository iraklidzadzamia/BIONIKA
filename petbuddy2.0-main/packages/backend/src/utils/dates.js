import moment from 'moment-timezone';

/**
 * Convert a date from company timezone to UTC
 */
export const companyToUTC = (date, companyTimezone) => {
  return moment.tz(date, companyTimezone).utc().toDate();
};

/**
 * Convert a date from UTC to company timezone
 */
export const utcToCompany = (date, companyTimezone) => {
  return moment.utc(date).tz(companyTimezone).toDate();
};

/**
 * Generate 15-minute time slots for a given date range
 */
export const generateTimeSlots = (startTime, endTime, slotMinutes = 15) => {
  const slots = [];
  const start = moment(startTime, 'HH:mm');
  const end = moment(endTime, 'HH:mm');

  while (start.isBefore(end)) {
    slots.push(start.format('HH:mm'));
    start.add(slotMinutes, 'minutes');
  }

  return slots;
};

/**
 * Check if a time falls within working hours
 *
 * IMPORTANT: This function compares times (HH:mm) without timezone context.
 * The caller is responsible for converting times to the appropriate timezone
 * before calling this function.
 *
 * @param {string|Date|moment} time - Time to check (will be converted to HH:mm)
 * @param {Array} workHours - Array of schedule objects with startTime, endTime, and weekday
 * @returns {boolean} - True if time is within working hours
 */
export const isWithinWorkingHours = (time, workHours) => {
  // Handle moment objects, Date objects, and time strings (HH:mm format)
  let timeMoment;
  if (moment.isMoment(time)) {
    timeMoment = time.clone();
  } else if (typeof time === 'string' && /^\d{1,2}:\d{2}$/.test(time)) {
    // If it's already a time string in HH:mm format, use it directly
    timeMoment = moment(time, 'HH:mm');
  } else {
    timeMoment = moment(time);
  }

  // Normalize to HH:mm for comparison
  const timeStr = timeMoment.format('HH:mm');

  // If a single schedule is provided, do not rely on weekday matching
  const hasSingleSchedule =
    Array.isArray(workHours) && workHours.length === 1 && typeof workHours[0]?.weekday === 'number';

  let daySchedule = null;
  if (hasSingleSchedule) {
    daySchedule = workHours[0];
  } else {
    const weekday = timeMoment.day();
    daySchedule = workHours.find(schedule => schedule.weekday === weekday) || null;
  }

  if (!daySchedule) return false;

  // Convert all times to minutes since midnight for comparison
  // This avoids timezone issues with moment.js when comparing times
  const timeMinutes = timeToMinutes(timeStr);
  const startMinutes = timeToMinutes(daySchedule.startTime);
  const endMinutes = timeToMinutes(daySchedule.endTime);

  if (timeMinutes === null || startMinutes === null || endMinutes === null) {
    return false;
  }

  // Check if time is within the range (inclusive on both ends)
  const result = timeMinutes >= startMinutes && timeMinutes <= endMinutes;

  return result;
};

/**
 * Convert HH:mm time string to minutes since midnight
 * @private
 */
function timeToMinutes(timeStr) {
  if (typeof timeStr !== 'string') return null;
  const parts = timeStr.split(':');
  if (parts.length !== 2) return null;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

/**
 * Check if a time falls within a break window
 *
 * IMPORTANT: This function compares times (HH:mm) without timezone context.
 * The caller is responsible for converting times to the appropriate timezone
 * before calling this function.
 */
export const isWithinBreakWindow = (time, breakWindows) => {
  // Handle moment objects, Date objects, and time strings (HH:mm format)
  let timeMoment;
  if (moment.isMoment(time)) {
    timeMoment = time.clone();
  } else if (typeof time === 'string' && /^\d{1,2}:\d{2}$/.test(time)) {
    // If it's already a time string in HH:mm format, use it directly
    timeMoment = moment(time, 'HH:mm');
  } else {
    timeMoment = moment(time);
  }

  const timeStr = timeMoment.format('HH:mm');
  const timeMinutes = timeToMinutes(timeStr);

  if (timeMinutes === null) return false;

  return breakWindows.some(breakWindow => {
    const startMinutes = timeToMinutes(breakWindow.start);
    const endMinutes = timeToMinutes(breakWindow.end);

    if (startMinutes === null || endMinutes === null) return false;

    // Check if time is within break window (inclusive on both ends)
    return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
  });
};

/**
 * Get the start of day in company timezone
 */
export const getStartOfDay = (date, companyTimezone) => {
  return moment.tz(date, companyTimezone).startOf('day').toDate();
};

/**
 * Get the end of day in company timezone
 */
export const getEndOfDay = (date, companyTimezone) => {
  return moment.tz(date, companyTimezone).endOf('day').toDate();
};

/**
 * Format date for display in company timezone
 */
export const formatDate = (date, companyTimezone, format = 'YYYY-MM-DD HH:mm') => {
  return moment.utc(date).tz(companyTimezone).format(format);
};
