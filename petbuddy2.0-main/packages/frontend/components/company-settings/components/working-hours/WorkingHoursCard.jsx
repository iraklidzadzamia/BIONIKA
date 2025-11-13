import { TimeInput } from "@/shared/components/ui";

/**
 * WorkingHoursCard Component
 * Displays a single day's working hours with checkbox and time inputs
 */
export default function WorkingHoursCard({ day, dayLabel, onToggle, onUpdate }) {
  const isOpen = day.isOpen !== false;

  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
      <div className="flex items-center gap-3 w-40">
        <input
          type="checkbox"
          checked={isOpen}
          onChange={(e) => onToggle(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
        />
        <span className="text-sm font-medium text-gray-900">{dayLabel}</span>
      </div>

      {isOpen ? (
        <div className="flex items-center gap-3 flex-1">
          <TimeInput
            value={day.startTime}
            onChange={(e) => onUpdate({ ...day, startTime: e.target.value })}
            className="w-32"
            aria-label={`${dayLabel} start time`}
          />
          <span className="text-gray-500 text-sm">to</span>
          <TimeInput
            value={day.endTime}
            onChange={(e) => onUpdate({ ...day, endTime: e.target.value })}
            className="w-32"
            aria-label={`${dayLabel} end time`}
          />
        </div>
      ) : (
        <span className="text-gray-400 text-sm italic">Closed</span>
      )}
    </div>
  );
}
