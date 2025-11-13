import moment from "moment-timezone";

/**
 * Get current time in specified timezone in "HH:mm" format (24-hour).
 * @param {string} region - Timezone string (e.g., "Asia/Tbilisi")
 * @returns {string} - Formatted time "HH:mm"
 */
export function getCurrentTimeInRegion(region) {
  const now = moment.tz(region);
  return now.format("HH:mm");
}

/**
 * Check if the current time is within an interval, supporting overnight intervals.
 * @param {moment.Moment} currentTime
 * @param {moment.Moment} start
 * @param {moment.Moment} end
 * @returns {boolean}
 */
export function isWithinActiveInterval(currentTime, start, end) {
  if (end.isBefore(start)) {
    return (
      currentTime.isBetween(start, moment("23:59", "HH:mm"), null, "[]") ||
      currentTime.isBetween(moment("00:00", "HH:mm"), end, null, "[]")
    );
  }
  return currentTime.isBetween(start, end, null, "[]");
}
