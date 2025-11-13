/**
 * Schedule View State Management
 * Handles date, view mode, and persistence
 */

import { useState, useEffect, useCallback } from 'react';
import { navigatePrevious, navigateNext, formatDisplayDate } from '../utils/dateHelpers';

const STORAGE_KEYS = {
  DATE: 'pb_schedule_date',
  VIEW: 'pb_schedule_view',
};

export function useScheduleView() {
  // State
  const [date, setDate] = useState(() => {
    // Try to hydrate from localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DATE);
      if (saved) {
        const parsed = new Date(saved);
        if (!isNaN(parsed.getTime())) return parsed;
      }
    } catch {}
    return new Date();
  });

  const [view, setView] = useState(() => {
    // Try to hydrate from localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.VIEW);
      if (saved === 'day' || saved === 'week') return saved;
    } catch {}
    return 'day';
  });

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.DATE, date.toISOString());
    } catch {}
  }, [date]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.VIEW, view);
    } catch {}
  }, [view]);

  // Navigation
  const goToPrevious = useCallback(() => {
    setDate((current) => navigatePrevious(current, view));
  }, [view]);

  const goToNext = useCallback(() => {
    setDate((current) => navigateNext(current, view));
  }, [view]);

  const goToToday = useCallback(() => {
    setDate(new Date());
  }, []);

  const goToDate = useCallback((newDate) => {
    setDate(newDate);
  }, []);

  // Display label
  const displayLabel = formatDisplayDate(date, view);

  return {
    // State
    date,
    view,
    displayLabel,

    // Setters
    setDate,
    setView,

    // Navigation
    goToPrevious,
    goToNext,
    goToToday,
    goToDate,
  };
}
