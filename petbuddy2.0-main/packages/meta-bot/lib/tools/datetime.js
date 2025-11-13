/**
 * DateTime Tool Handlers
 *
 * Tools for getting current datetime information with timezone support.
 */

import moment from "moment-timezone";

/**
 * Get current datetime in various formats
 * @param {Object} _params - No parameters required
 * @param {Object} context - Context with timezone
 * @returns {Object} DateTime information in multiple formats
 */
export async function getCurrentDatetime(_params, context = {}) {
  const timezone = context.timezone || "UTC";
  const now = moment.tz(timezone);
  return {
    timezone,
    local_text: now.format("YYYY-MM-DD HH:mm:ss"),
    iso_local: now.format("YYYY-MM-DD[T]HH:mm:ss"),
    utc_iso: now.clone().utc().toISOString(),
    ymd: now.format("YYYY-MM-DD"),
    spelled: now.format("MMMM DD, YYYY"),
    weekday: now.format("dddd"),
  };
}
