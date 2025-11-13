/**
 * Appointment utility functions
 */

// Default duration in minutes if no service item duration is specified
export const DEFAULT_APPOINTMENT_DURATION = 60;

/**
 * Compute the total duration of a service item based on required resources
 * @param {Object} serviceItem - The service item/variant object
 * @returns {number|null} - Total duration in minutes, or null if cannot be computed
 */
export const computeServiceItemDuration = (serviceItem) => {
  if (!serviceItem) {
    return null;
  }

  // First, check if there's a direct durationMinutes field
  const directDuration = Number(serviceItem.durationMinutes);
  if (Number.isFinite(directDuration) && directDuration > 0) {
    return directDuration;
  }

  // Fallback: sum up durations from requiredResources
  if (Array.isArray(serviceItem.requiredResources)) {
    const total = serviceItem.requiredResources.reduce(
      (sum, resource) => sum + (Number(resource?.durationMinutes) || 0),
      0
    );

    return total > 0 ? total : null;
  }

  return null;
};

/**
 * Check if a time slot overlaps with existing appointments
 * @param {Date} startTime - Proposed start time
 * @param {Date} endTime - Proposed end time
 * @param {Array} appointments - Array of existing appointments
 * @param {string} staffId - Staff ID to check appointments for
 * @returns {boolean} - True if there's an overlap, false otherwise
 */
export const hasTimeSlotOverlap = (
  startTime,
  endTime,
  appointments,
  staffId
) => {
  if (!startTime || !endTime || !appointments || !staffId) {
    return false;
  }

  return appointments.some((apt) => {
    const aptStaffId = apt?.staffId?._id || apt?.staffId;
    if (aptStaffId !== staffId) return false;

    // Check if intervals overlap: apt.start < endTime && apt.end > startTime
    return apt.start < endTime && apt.end > startTime;
  });
};

/**
 * Format appointment time for display
 * @param {Date} date - The appointment date/time
 * @returns {string} - Formatted time string (HH:MM)
 */
export const formatAppointmentTime = (date) => {
  if (!date) return "";

  try {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  } catch (error) {
    console.error("Error formatting appointment time:", error);
    return "";
  }
};

/**
 * Create a Date object from date string and time string
 * @param {string} dateStr - Date in format YYYY-MM-DD
 * @param {string} timeStr - Time in format HH:MM
 * @returns {Date|null} - Combined Date object or null if invalid
 */
export const createDateTimeFromStrings = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return null;

  try {
    const [hours, minutes] = timeStr.split(":").map(Number);
    const date = new Date(dateStr);
    date.setHours(hours, minutes, 0, 0);

    return isNaN(date.getTime()) ? null : date;
  } catch (error) {
    console.error("Error creating datetime:", error);
    return null;
  }
};
