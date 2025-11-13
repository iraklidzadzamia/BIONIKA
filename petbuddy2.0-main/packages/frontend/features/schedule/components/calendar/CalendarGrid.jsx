"use client";
import React, { useEffect, useState, useMemo } from "react";
import { format } from "date-fns";
import { UserCircleIcon } from "@heroicons/react/24/solid";
import {
  GRID_CONFIG,
  generateTimeSlots,
  getVerticalPosition,
  getVerticalHeight,
  getWorkingHours,
} from "../../constants/gridConfig";

/**
 * Perfect Calendar Grid - Day view with fixed grid alignment
 * Traditional vertical time slots with perfect alignment
 */
const CalendarGridPerfect = ({
  appointments = [],
  date,
  trainers = [],
  onAppointmentClick,
  onTimeSlotClick,
}) => {
  const weekday = new Date(date).getDay();

  // Get working hours
  const { startHour, endHour } = useMemo(
    () => getWorkingHours(trainers, weekday),
    [trainers, weekday]
  );

  // Generate time slots
  const timeSlots = useMemo(
    () => generateTimeSlots(startHour, endHour),
    [startHour, endHour]
  );

  const totalHeight = timeSlots.length * GRID_CONFIG.SLOT_HEIGHT_DAY_VIEW;

  // Current time line
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  const isToday = (() => {
    try {
      const d = date instanceof Date ? date : new Date(date);
      return d.toDateString() === new Date().toDateString();
    } catch {
      return false;
    }
  })();

  const currentLineTop = isToday ? getVerticalPosition(now, startHour) : -1;

  // Group appointments by staff
  const getStaffAppointments = (staffId) =>
    appointments.filter((apt) => {
      // Handle both populated (object) and non-populated (string) staffId
      const aptStaffId = apt?.staffId?._id || apt?.staffId;
      return aptStaffId === staffId;
    });

  // Grid layout
  const gridTemplateColumns = `${GRID_CONFIG.TIME_COLUMN_WIDTH}px repeat(${trainers.length}, minmax(0, 1fr))`;

  // Trainer Column Component
  const TrainerColumn = ({ trainer }) => {
    const [hoverSlot, setHoverSlot] = useState(null);
    const staffAppts = getStaffAppointments(trainer._id);

    // Check if a time slot is available
    const isSlotAvailable = (slotHour, slotMinute) => {
      const slotStart = new Date(date);
      slotStart.setHours(slotHour, slotMinute, 0, 0);
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + GRID_CONFIG.SLOT_MINUTES);

      return !staffAppts.some((apt) => {
        const aptStart =
          apt.start instanceof Date ? apt.start : new Date(apt.start);
        const aptEnd = apt.end instanceof Date ? apt.end : new Date(apt.end);
        return aptStart < slotEnd && aptEnd > slotStart;
      });
    };

    return (
      <div className="bg-white relative border-r border-gray-200 last:border-r-0">
        {/* Grid background */}
        <div className="absolute inset-0">
          {timeSlots.map((slot, index) => (
            <div
              key={index}
              className={`
                border-b transition-colors
                ${
                  slot.minute === 0
                    ? "border-gray-300"
                    : "border-gray-100 border-dashed"
                }
                ${
                  hoverSlot === index && isSlotAvailable(slot.hour, slot.minute)
                    ? "bg-blue-100"
                    : "hover:bg-gray-50"
                }
              `}
              style={{
                height: `${GRID_CONFIG.SLOT_HEIGHT_DAY_VIEW}px`,
                top: `${index * GRID_CONFIG.SLOT_HEIGHT_DAY_VIEW}px`,
              }}
              onMouseEnter={() => setHoverSlot(index)}
              onMouseLeave={() => setHoverSlot(null)}
              onClick={() => {
                if (
                  onTimeSlotClick &&
                  isSlotAvailable(slot.hour, slot.minute)
                ) {
                  onTimeSlotClick(slot.hour, trainer, slot.minute);
                }
              }}
            />
          ))}
        </div>

        {/* Hover indicator */}
        {hoverSlot !== null &&
          isSlotAvailable(
            timeSlots[hoverSlot].hour,
            timeSlots[hoverSlot].minute
          ) && (
            <div
              className="absolute left-2 right-2 pointer-events-none z-10"
              style={{
                top: `${hoverSlot * GRID_CONFIG.SLOT_HEIGHT_DAY_VIEW + 4}px`,
                height: `${GRID_CONFIG.SLOT_HEIGHT_DAY_VIEW - 8}px`,
              }}
            >
              <div className="h-full border-2 border-blue-400 border-dashed rounded-lg bg-blue-50 flex items-center justify-center">
                <span className="text-sm font-semibold text-blue-600">
                  + Book
                </span>
              </div>
            </div>
          )}

        {/* Appointments */}
        <div className="relative" style={{ height: `${totalHeight}px` }}>
          {staffAppts.map((apt) => {
            const top = getVerticalPosition(apt.start, startHour);
            const height = getVerticalHeight(apt.start, apt.end);

            // Determine card variant based on height
            const variant =
              height > 180 ? "expanded" : height > 120 ? "normal" : "compact";

            return (
              <div
                key={apt._id}
                className="absolute left-2 right-2 z-20"
                style={{
                  top: `${top}px`,
                  height: `${Math.max(height, 80)}px`,
                }}
              >
                <RichAppointmentCard
                  appointment={apt}
                  variant={variant}
                  onClick={() => onAppointmentClick && onAppointmentClick(apt)}
                  showGroomer={false}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div
        className="grid gap-px bg-gray-300 border-b-2 border-gray-300"
        style={{ gridTemplateColumns }}
      >
        {/* Time column header */}
        <div className="bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center py-3">
          <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
            Time
          </span>
        </div>

        {/* Staff headers */}
        {trainers.map((trainer) => {
          const apptCount = getStaffAppointments(trainer._id).length;

          return (
            <div
              key={trainer._id}
              className="bg-white py-3 px-4 flex flex-col items-center gap-2"
            >
              {trainer.profileImage ? (
                <img
                  src={trainer.profileImage}
                  alt={trainer.fullName}
                  className="w-12 h-12 rounded-full object-cover border-2 shadow-sm"
                  style={{ borderColor: trainer.color || "#93c5fd" }}
                />
              ) : (
                <UserCircleIcon className="w-12 h-12 text-gray-400" />
              )}
              <div className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: trainer.color || "#3b82f6" }}
                  />
                  <span className="text-sm font-bold text-gray-900 truncate">
                    {trainer.fullName}
                  </span>
                </div>
                <div className="text-xs text-gray-600">
                  {apptCount} appointment{apptCount !== 1 ? "s" : ""}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Body - Scrollable */}
      <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
        <div className="relative">
          {/* Current time line */}
          {currentLineTop >= 0 && (
            <div
              className="absolute left-0 right-0 z-30 pointer-events-none"
              style={{ top: `${currentLineTop}px` }}
            >
              <div className="h-0.5 bg-red-500 shadow-lg" />
              <div
                className="absolute flex items-center gap-2"
                style={{
                  left: `${GRID_CONFIG.TIME_COLUMN_WIDTH - 10}px`,
                  top: "-12px",
                }}
              >
                <div className="w-6 h-6 rounded-full bg-red-500 shadow-lg border-4 border-white flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
                <span className="text-xs font-bold text-red-500 bg-white px-2 py-1 rounded-md shadow-sm">
                  {format(now, "h:mm a")}
                </span>
              </div>
            </div>
          )}

          {/* Grid */}
          <div
            className="grid gap-px bg-gray-200"
            style={{ gridTemplateColumns }}
          >
            {/* Time column */}
            <div className="bg-gradient-to-br from-gray-100 to-gray-50 relative">
              <div style={{ height: `${totalHeight}px` }} className="relative">
                {timeSlots.map((slot, index) => (
                  <div
                    key={index}
                    className={`
                      absolute left-0 right-0
                      ${slot.minute === 0 ? "border-b border-gray-300" : ""}
                    `}
                    style={{
                      top: `${index * GRID_CONFIG.SLOT_HEIGHT_DAY_VIEW}px`,
                      height: `${GRID_CONFIG.SLOT_HEIGHT_DAY_VIEW}px`,
                    }}
                  >
                    {slot.minute === 0 && (
                      <div className="absolute right-2 top-2 text-xs font-bold text-gray-700">
                        {slot.label}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Trainer columns */}
            {trainers.length === 0 ? (
              <div className="col-span-full p-12 text-center text-gray-500">
                <p className="text-lg font-semibold">No staff available</p>
                <p className="text-sm mt-2">Add groomers to start scheduling</p>
              </div>
            ) : (
              trainers.map((trainer) => (
                <TrainerColumn key={trainer._id} trainer={trainer} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarGridPerfect;
