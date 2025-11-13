"use client";
import React, { useMemo } from "react";
import { addDays, startOfWeek, format } from "date-fns";
import { GRID_CONFIG } from "../constants/gridConfig";

/**
 * Minimal WeekGrid to satisfy Scheduler usage
 * Props: appointments (array), date (Date), onAppointmentClick (fn), onDayClick (fn)
 */
export default function WeekGrid({
  appointments = [],
  date = new Date(),
  onAppointmentClick,
  onDayClick,
}) {
  const days = useMemo(() => {
    const start = startOfWeek(date, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [date]);

  const apptsByDay = useMemo(() => {
    const map = new Map();
    days.forEach((d) => map.set(format(d, "yyyy-MM-dd"), []));
    appointments.forEach((apt) => {
      try {
        const key = format(new Date(apt.start), "yyyy-MM-dd");
        if (map.has(key)) map.get(key).push(apt);
      } catch {}
    });
    return map;
  }, [appointments, days]);

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      <div className="grid grid-cols-7 border-b">
        {days.map((d) => (
          <button
            key={d.toISOString()}
            type="button"
            className="p-3 text-center hover:bg-gray-50"
            onClick={() => onDayClick && onDayClick(d)}
          >
            <div className="text-xs text-gray-500">{format(d, "EEE")}</div>
            <div className="text-lg font-semibold">{format(d, "d")}</div>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const key = format(d, "yyyy-MM-dd");
          const list = apptsByDay.get(key) || [];
          return (
            <div
              key={key}
              className="min-h-[240px] border-r last:border-r-0 p-2"
            >
              {list.length === 0 ? (
                <div className="h-8 text-xs text-gray-400 flex items-center">
                  No appointments
                </div>
              ) : (
                <div className="space-y-2">
                  {list.slice(0, 6).map((apt) => (
                    <button
                      key={apt._id}
                      type="button"
                      className="w-full text-left px-2 py-1 rounded-md border bg-gray-50 hover:bg-gray-100 text-xs"
                      onClick={() =>
                        onAppointmentClick && onAppointmentClick(apt)
                      }
                    >
                      <div className="font-medium truncate">
                        {apt?.customerId?.fullName || "Customer"}
                      </div>
                      <div className="text-gray-600 truncate">
                        {apt?.serviceId?.name || apt?.serviceName || "Service"}
                      </div>
                    </button>
                  ))}
                  {list.length > 6 && (
                    <div className="text-[11px] text-gray-500">
                      +{list.length - 6} more
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
