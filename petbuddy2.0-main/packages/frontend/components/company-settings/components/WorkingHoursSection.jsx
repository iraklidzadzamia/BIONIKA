"use client";
import { Button } from "@/shared/components/ui";
import { SettingsSection } from "@/components/settings";
import { useWorkingHours } from "../hooks/useWorkingHours";
import WorkingHoursCard from "./working-hours/WorkingHoursCard";
import { ClockIcon, CheckCircleIcon } from "@heroicons/react/24/outline";

// Map weekday numbers to labels (0=Sunday, 1=Monday, ..., 6=Saturday)
const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/**
 * WorkingHoursSection Component
 * Manages company working hours for each day of the week
 */
export default function WorkingHoursSection() {
  const { workingHours, toggleDay, updateDayHours, handleSave, isUpdating, saveSuccess } =
    useWorkingHours();

  // Create array of all days with their open/closed status
  const allDays = [1, 2, 3, 4, 5, 6, 0].map((weekday) => {
    const existingDay = workingHours.find(wh => wh.weekday === weekday);
    return existingDay || { weekday, startTime: "09:00", endTime: "17:00", isOpen: false };
  });

  return (
    <SettingsSection
      title="Working Hours"
      description="Set your business hours for each day of the week"
      icon={ClockIcon}
    >
      <div className="space-y-2">
        {allDays.map((day) => (
          <WorkingHoursCard
            key={day.weekday}
            day={day}
            dayLabel={WEEKDAY_LABELS[day.weekday]}
            onToggle={(isOpen) => toggleDay(day.weekday, isOpen)}
            onUpdate={(updatedDay) => updateDayHours(day.weekday, updatedDay)}
          />
        ))}
      </div>
      <div className="mt-6 flex items-center justify-between">
        <div className="min-h-[40px] flex items-center">
          {saveSuccess && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircleIcon className="h-5 w-5" />
              <span className="text-sm font-medium">Saved successfully!</span>
            </div>
          )}
        </div>
        <Button
          onClick={handleSave}
          disabled={isUpdating}
          className={
            saveSuccess
              ? "bg-green-600 hover:bg-green-700"
              : "bg-indigo-600 hover:bg-indigo-700"
          }
        >
          {isUpdating ? "Saving..." : saveSuccess ? "Saved!" : "Save Working Hours"}
        </Button>
      </div>
    </SettingsSection>
  );
}
