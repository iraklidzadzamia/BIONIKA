import { useState, useEffect } from "react";
import { useUpdateWorkingHoursMutation } from "@/core/api/companyApi";
import { useCompanySettings } from "./useCompanySettings";

// Default working hours (weekday: 0=Sunday, 1=Monday, ..., 6=Saturday)
const DEFAULT_WORKING_HOURS = [
  { weekday: 1, startTime: "09:00", endTime: "17:00" }, // Monday
  { weekday: 2, startTime: "09:00", endTime: "17:00" }, // Tuesday
  { weekday: 3, startTime: "09:00", endTime: "17:00" }, // Wednesday
  { weekday: 4, startTime: "09:00", endTime: "17:00" }, // Thursday
  { weekday: 5, startTime: "09:00", endTime: "17:00" }, // Friday
];

/**
 * Custom hook for managing working hours
 */
export function useWorkingHours() {
  const { company, companyId, refetch } = useCompanySettings();
  const [updateWorkingHours, { isLoading: isUpdating }] = useUpdateWorkingHoursMutation();

  const [workingHours, setWorkingHours] = useState(DEFAULT_WORKING_HOURS);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load working hours from company data
  useEffect(() => {
    const companyWorkHours = company?.settings?.workHours || company?.workingHours;
    if (companyWorkHours && Array.isArray(companyWorkHours) && companyWorkHours.length > 0) {
      setWorkingHours(companyWorkHours);
    }
  }, [company]);

  /**
   * Toggle a day open/closed
   */
  const toggleDay = (weekday, isOpen) => {
    if (isOpen) {
      // Add day if not already present
      if (!workingHours.find(wh => wh.weekday === weekday)) {
        setWorkingHours([...workingHours, { weekday, startTime: "09:00", endTime: "17:00" }]);
      }
    } else {
      // Remove day
      setWorkingHours(workingHours.filter(wh => wh.weekday !== weekday));
    }
  };

  /**
   * Update hours for a specific day
   */
  const updateDayHours = (weekday, updatedDay) => {
    const index = workingHours.findIndex(wh => wh.weekday === weekday);
    if (index !== -1) {
      const updated = [...workingHours];
      updated[index] = updatedDay;
      setWorkingHours(updated);
    }
  };

  /**
   * Save working hours to API
   */
  const handleSave = async () => {
    try {
      setSaveSuccess(false);
      await updateWorkingHours({ companyId, workHours: workingHours }).unwrap();
      await refetch();

      // Show success feedback
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to update working hours:", error);
      throw error;
    }
  };

  return {
    workingHours,
    toggleDay,
    updateDayHours,
    handleSave,
    isUpdating,
    saveSuccess,
  };
}
