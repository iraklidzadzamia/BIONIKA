/**
 * Date Helper Functions for Schedule
 * Clean, focused date utilities
 */

import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  addDays,
  subDays,
  isSameDay,
  parseISO,
  isValid
} from 'date-fns';

/**
 * Parse date safely - handles Date objects, ISO strings, timestamps
 */
export function parseDateSafe(value) {
  if (!value) return null;

  if (value instanceof Date) {
    return isValid(value) ? value : null;
  }

  if (typeof value === 'string') {
    try {
      const parsed = parseISO(value);
      return isValid(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  if (typeof value === 'number') {
    const parsed = new Date(value);
    return isValid(parsed) ? parsed : null;
  }

  return null;
}

/**
 * Get date range for day view
 */
export function getDayRange(date) {
  const safeDate = parseDateSafe(date) || new Date();
  return {
    from: startOfDay(safeDate),
    to: endOfDay(safeDate),
  };
}

/**
 * Get date range for week view
 */
export function getWeekRange(date) {
  const safeDate = parseDateSafe(date) || new Date();
  return {
    from: startOfWeek(safeDate, { weekStartsOn: 0 }), // Sunday
    to: endOfWeek(safeDate, { weekStartsOn: 0 }),
  };
}

/**
 * Navigate to previous day/week
 */
export function navigatePrevious(date, view) {
  const safeDate = parseDateSafe(date) || new Date();
  return view === 'week' ? subDays(safeDate, 7) : subDays(safeDate, 1);
}

/**
 * Navigate to next day/week
 */
export function navigateNext(date, view) {
  const safeDate = parseDateSafe(date) || new Date();
  return view === 'week' ? addDays(safeDate, 7) : addDays(safeDate, 1);
}

/**
 * Check if date is today
 */
export function isToday(date) {
  const safeDate = parseDateSafe(date);
  if (!safeDate) return false;
  return isSameDay(safeDate, new Date());
}

/**
 * Format date for display
 */
export function formatDisplayDate(date, view) {
  const safeDate = parseDateSafe(date) || new Date();

  if (view === 'week') {
    const start = startOfWeek(safeDate, { weekStartsOn: 0 });
    const end = endOfWeek(safeDate, { weekStartsOn: 0 });
    return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
  }

  return format(safeDate, 'EEEE, MMM d');
}

/**
 * Format time for display
 */
export function formatTime(date, formatStr = 'h:mm a') {
  const safeDate = parseDateSafe(date);
  if (!safeDate) return '';
  return format(safeDate, formatStr);
}

/**
 * Format date range for API calls
 */
export function formatDateRangeForAPI(from, to) {
  const safeFrom = parseDateSafe(from);
  const safeTo = parseDateSafe(to);

  if (!safeFrom || !safeTo) return null;

  return {
    startDate: safeFrom.toISOString(),
    endDate: safeTo.toISOString(),
  };
}

/**
 * Get week days array
 */
export function getWeekDays(date) {
  const safeDate = parseDateSafe(date) || new Date();
  const start = startOfWeek(safeDate, { weekStartsOn: 0 });

  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/**
 * Check if two dates are the same day
 */
export function isSameDaySafe(date1, date2) {
  const d1 = parseDateSafe(date1);
  const d2 = parseDateSafe(date2);

  if (!d1 || !d2) return false;
  return isSameDay(d1, d2);
}
