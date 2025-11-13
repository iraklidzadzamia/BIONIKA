/**
 * Appointment Helper Functions
 * Business logic for appointments
 */

import { parseDateSafe, isSameDaySafe } from "./dateHelpers";

/**
 * Filter appointments by date
 */
export function filterAppointmentsByDate(appointments, date) {
  if (!Array.isArray(appointments)) return [];

  return appointments.filter((apt) => {
    const aptDate = parseDateSafe(apt.start);
    return aptDate && isSameDaySafe(aptDate, date);
  });
}

/**
 * Filter appointments by staff
 */
export function filterAppointmentsByStaff(appointments, staffId) {
  if (!Array.isArray(appointments)) return [];
  if (!staffId) return appointments;

  return appointments.filter((apt) => {
    // Handle both populated (object) and non-populated (string) staffId
    const aptStaffId = apt?.staffId?._id || apt?.staffId;
    return aptStaffId === staffId;
  });
}

/**
 * Group appointments by staff
 */
export function groupAppointmentsByStaff(appointments, staffList) {
  const map = new Map();

  staffList.forEach((staff) => {
    const staffAppts = appointments.filter((apt) => {
      // Handle both populated (object) and non-populated (string) staffId
      const aptStaffId = apt?.staffId?._id || apt?.staffId;
      return aptStaffId === staff._id;
    });
    map.set(staff._id, staffAppts);
  });

  return map;
}

/**
 * Group appointments by date
 */
export function groupAppointmentsByDate(appointments, dates) {
  const map = new Map();

  dates.forEach((date) => {
    const dateAppts = filterAppointmentsByDate(appointments, date);
    map.set(date.toISOString(), dateAppts);
  });

  return map;
}

/**
 * Sort appointments by start time
 */
export function sortAppointmentsByTime(appointments) {
  if (!Array.isArray(appointments)) return [];

  return [...appointments].sort((a, b) => {
    const aDate = parseDateSafe(a.start);
    const bDate = parseDateSafe(b.start);

    if (!aDate || !bDate) return 0;
    return aDate - bDate;
  });
}

/**
 * Check if appointment overlaps with time range
 */
export function isAppointmentOverlapping(appointment, rangeStart, rangeEnd) {
  const aptStart = parseDateSafe(appointment.start);
  const aptEnd = parseDateSafe(appointment.end);
  const rs = parseDateSafe(rangeStart);
  const re = parseDateSafe(rangeEnd);

  if (!aptStart || !aptEnd || !rs || !re) return false;

  return aptStart < re && aptEnd > rs;
}

/**
 * Check if time slot is available for staff
 */
export function isSlotAvailable(staffAppointments, slotStart, slotEnd) {
  if (!Array.isArray(staffAppointments)) return true;

  return !staffAppointments.some((apt) =>
    isAppointmentOverlapping(apt, slotStart, slotEnd)
  );
}

/**
 * Get appointment duration in minutes
 */
export function getAppointmentDuration(appointment) {
  const start = parseDateSafe(appointment.start);
  const end = parseDateSafe(appointment.end);

  if (!start || !end) return 0;

  return Math.round((end - start) / 60000);
}

/**
 * Count appointments for staff
 */
export function countStaffAppointments(appointments, staffId) {
  return filterAppointmentsByStaff(appointments, staffId).length;
}

/**
 * Get appointment counts by date
 */
export function getAppointmentCountsByDate(appointments) {
  const counts = {};

  appointments.forEach((apt) => {
    const date = parseDateSafe(apt.start);
    if (date) {
      const key = date.toISOString().split("T")[0];
      counts[key] = (counts[key] || 0) + 1;
    }
  });

  return counts;
}

/**
 * Check if user can edit appointment (role-based)
 */
export function canEditAppointment(appointment, user) {
  if (!user || !appointment) return false;

  // Owner/admin can edit all
  if (user.role === "owner" || user.role === "admin") return true;

  // Groomer can only view, not edit
  if (user.role === "groomer") return false;

  return false;
}

/**
 * Check if user can create appointments
 */
export function canCreateAppointment(user) {
  if (!user) return false;

  // Only owners and admins can create
  return user.role === "owner" || user.role === "admin";
}

/**
 * Validate appointment data
 */
export function validateAppointmentData(data) {
  const errors = [];

  if (!data.start) errors.push("Start time is required");
  if (!data.end) errors.push("End time is required");
  if (!data.customerId) errors.push("Customer is required");
  if (!data.staffId) errors.push("Staff is required");
  if (!data.serviceId) errors.push("Service is required");

  const start = parseDateSafe(data.start);
  const end = parseDateSafe(data.end);

  if (start && end && end <= start) {
    errors.push("End time must be after start time");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
