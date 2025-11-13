// Shared utility functions (future use)
// Export shared utilities here

/**
 * Example utility - convert time string to minutes
 * @param {string} timeStr - Time in HH:mm format
 * @returns {number|null} Minutes since midnight
 */
export function timeToMinutes(timeStr) {
  if (typeof timeStr !== 'string') return null;
  const [h, m] = timeStr.split(':');
  const hours = Number(h);
  const minutes = Number(m);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
}
