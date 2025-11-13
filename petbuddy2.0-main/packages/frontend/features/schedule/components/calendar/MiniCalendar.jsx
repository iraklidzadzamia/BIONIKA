import React, { useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

const MiniCalendar = ({ selectedDate, onSelect, marks = {} }) => {
  const [displayMonth, setDisplayMonth] = useState(selectedDate || new Date());

  const monthStart = startOfMonth(displayMonth);
  const monthEnd = endOfMonth(displayMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const nextMonth = () => setDisplayMonth(addMonths(displayMonth, 1));
  const prevMonth = () => setDisplayMonth(subMonths(displayMonth, 1));

  const handleDateClick = (date) => {
    if (onSelect) onSelect(date);
  };

  const isToday = (date) => isSameDay(date, new Date());
  const isCurrentMonth = (date) => isSameMonth(date, displayMonth);
  const isSelected = (date) => selectedDate && isSameDay(date, selectedDate);
  const hasAppointments = (date) => {
    const dateKey = format(date, "yyyy-MM-dd");
    return marks[dateKey] && marks[dateKey] > 0;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <ChevronLeftIcon className="w-4 h-4 text-gray-600" />
        </button>
        <h3 className="text-sm font-semibold text-gray-900">
          {format(displayMonth, "MMMM yyyy")}
        </h3>
        <button
          onClick={nextMonth}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <ChevronRightIcon className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-xs">
        {/* Day headers */}
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((day) => (
          <div key={day} className="text-center text-gray-500 font-medium py-1">
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {days.map((date) => (
          <button
            key={date.toISOString()}
            onClick={() => handleDateClick(date)}
            className={`
              relative text-center py-1 rounded-lg cursor-pointer transition-colors
              ${isToday(date) ? "bg-blue-100 text-blue-900 font-semibold" : ""}
              ${isSelected(date) ? "bg-blue-600 text-white font-semibold" : ""}
              ${
                !isCurrentMonth(date)
                  ? "text-gray-300"
                  : "text-gray-900 hover:bg-gray-100"
              }
            `}
          >
            {format(date, "d")}
            {hasAppointments(date) && !isSelected(date) && (
              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default MiniCalendar;
