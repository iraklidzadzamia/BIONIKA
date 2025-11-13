"use client";
import React, { useState, useMemo, useEffect } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
import { UserCircleIcon } from "@heroicons/react/24/solid";
import { useSelector } from "react-redux";
import {
  GRID_CONFIG,
  generateTimeSlots,
  getWorkingHours,
  getVerticalPosition,
  getVerticalHeight,
} from "../../constants/gridConfig";
import { groupAppointmentsByStaff } from "../../utils/appointmentHelpers";
import {
  getServiceBgColor,
  getPetEmoji,
} from "../../constants/scheduleStyles";
import {
  getServiceName,
  getCustomerName,
  getPetInfo,
  getPrice,
} from "../../utils/scheduleUtils";
import PreviewCard, { calculateCardDimensions } from "../calendar/PreviewCard";

// Status configuration (shared across cards)
const STATUS_MAP = {
  scheduled: { dot: "bg-blue-500", label: "Scheduled" },
  checked_in: { dot: "bg-green-500", label: "Checked In" },
  in_progress: { dot: "bg-yellow-500", label: "In Progress" },
  completed: { dot: "bg-gray-400", label: "Completed" },
  canceled: { dot: "bg-red-400", label: "Canceled" },
  no_show: { dot: "bg-orange-400", label: "No Show" },
};

// Format time to 12-hour clock, e.g., 9:00 AM
function formatTime(date) {
  const d = new Date(date);
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, "0");
  return `${displayHours}:${displayMinutes} ${period}`;
}

/**
 * DayScheduleView - Clean vertical calendar day view with staff columns
 */
const DayScheduleView = ({
  appointments = [],
  staff = [],
  date,
  onAppointmentClick,
  onTimeSlotClick,
  colorStyle = "background",
  zoom = "standard",
  selectedSlot = null, // { staffId, time, date }
}) => {
  const company = useSelector((state) => state.auth.company);
  const weekday = new Date(date).getDay();

  // Working hours
  const { startHour, endHour } = useMemo(
    () => getWorkingHours(staff, weekday),
    [staff, weekday]
  );

  // Time slots
  const timeSlots = useMemo(
    () => generateTimeSlots(startHour, endHour),
    [startHour, endHour]
  );

  // Group appointments
  const staffAppointments = useMemo(
    () => groupAppointmentsByStaff(appointments, staff),
    [appointments, staff]
  );

  // Zoom sizing (compact by default)
  const slotHeight = zoom === "extra-large" ? 90 : zoom === "large" ? 75 : 48;
  const totalHeight = timeSlots.length * slotHeight;

  // Current time
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

  const currentLineTop = isToday
    ? getVerticalPosition(now, startHour) *
      (slotHeight / GRID_CONFIG.SLOT_HEIGHT_DAY_VIEW)
    : -1;

  // Hover state
  const [hoverCell, setHoverCell] = useState(null);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div
        className="grid border-b border-gray-200 bg-gray-50"
        style={{
          gridTemplateColumns: `72px repeat(${staff.length}, minmax(0, 1fr))`,
        }}
      >
        <div className="flex items-center justify-center py-2 border-r border-gray-200">
          <span className="text-[10px] font-semibold text-gray-500">TIME</span>
        </div>
        {staff.map((member) => {
          const appts = staffAppointments.get(member._id) || [];
          return (
            <div
              key={member._id}
              className="flex flex-col items-center justify-center py-1.5 px-2 border-r border-gray-100 last:border-r-0"
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                {member.profileImage ? (
                  <img
                    src={member.profileImage}
                    alt={member.fullName}
                    className="w-6 h-6 rounded-full object-cover border-2"
                    style={{ borderColor: member.color || "#93c5fd" }}
                  />
                ) : (
                  <UserCircleIcon className="w-6 h-6 text-gray-400" />
                )}
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: member.color || "#3b82f6" }}
                  />
                  <span className="text-xs sm:text-sm font-semibold text-gray-900 truncate">
                    {member.fullName}
                  </span>
                </div>
                <div className="text-[10px] text-gray-500">
                  {appts.length} appointments
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Body */}
      <div className="max-h-[calc(100vh-250px)] overflow-y-auto relative">
        {/* Current Time Line */}
        {currentLineTop >= 0 && (
          <div
            className="absolute left-0 right-0 z-30 pointer-events-none"
            style={{ top: `${currentLineTop}px` }}
          >
            <div className="h-0.5 bg-red-500 shadow-sm" />
            <div className="absolute" style={{ left: "74px", top: "-10px" }}>
              <div className="w-5 h-5 rounded-full bg-red-500 border-2 border-white shadow-md flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>
            </div>
          </div>
        )}

        <div
          className="grid"
          style={{
            gridTemplateColumns: `72px repeat(${staff.length}, minmax(0, 1fr))`,
          }}
        >
          {/* Time Column */}
          <div className="border-r border-gray-200 bg-gray-50 relative">
            <div style={{ height: `${totalHeight}px` }} className="relative">
              {timeSlots.map((slot, index) => (
                <div
                  key={index}
                  className={`absolute left-0 right-0 border-b ${
                    slot.minute === 0 ? "border-gray-200" : "border-gray-100"
                  }`}
                  style={{
                    top: `${index * slotHeight}px`,
                    height: `${slotHeight}px`,
                  }}
                >
                  {slot.minute === 0 && (
                    <div className="absolute right-1.5 top-0.5 text-[10px] font-medium text-gray-600">
                      {slot.label}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Staff Columns */}
          {staff.map((member, staffIndex) => {
            const appts = staffAppointments.get(member._id) || [];

            return (
              <div
                key={member._id}
                className="border-r border-gray-100 last:border-r-0 relative bg-white"
              >
                {/* Grid Background */}
                <div
                  style={{ height: `${totalHeight}px` }}
                  className="relative"
                >
                  {timeSlots.map((slot, slotIndex) => {
                    const cellKey = `${staffIndex}-${slotIndex}`;
                    const isHovering = hoverCell === cellKey;

                    // Check if this slot is the selected one
                    const slotTime = `${String(slot.hour).padStart(
                      2,
                      "0"
                    )}:${String(slot.minute).padStart(2, "0")}`;
                    const isSelected =
                      selectedSlot &&
                      selectedSlot.staffId === member._id &&
                      selectedSlot.time === slotTime;

                    return (
                      <div
                        key={slotIndex}
                        className={`absolute left-0 right-0 border-b ${
                          slot.minute === 0
                            ? "border-gray-200"
                            : "border-gray-100"
                        } transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? "bg-green-50/50 border-green-300"
                            : isHovering
                            ? "bg-blue-50"
                            : "hover:bg-gray-50"
                        }`}
                        style={{
                          top: `${slotIndex * slotHeight}px`,
                          height: `${slotHeight}px`,
                        }}
                        onMouseEnter={() => setHoverCell(cellKey)}
                        onMouseLeave={() => setHoverCell(null)}
                        onClick={() => {
                          if (onTimeSlotClick) {
                            onTimeSlotClick(slot.hour, member, slot.minute);
                          }
                        }}
                      >
                        {isHovering && !isSelected && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center shadow-md">
                              <PlusIcon className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Preview/Selected Slot Card */}
                  {selectedSlot &&
                    selectedSlot.staffId === member._id &&
                    selectedSlot.service &&
                    selectedSlot.duration && (
                      <PreviewCard
                        key="preview-slot"
                        selectedSlot={selectedSlot}
                        {...calculateCardDimensions(
                          selectedSlot.time,
                          selectedSlot.duration,
                          slotHeight,
                          date,
                          startHour,
                          getVerticalPosition,
                          GRID_CONFIG
                        )}
                      />
                    )}

                  {/* Appointments */}
                  {appts.map((apt) => {
                    const top =
                      getVerticalPosition(apt.start, startHour) *
                      (slotHeight / GRID_CONFIG.SLOT_HEIGHT_DAY_VIEW);
                    const height =
                      getVerticalHeight(apt.start, apt.end) *
                      (slotHeight / GRID_CONFIG.SLOT_HEIGHT_DAY_VIEW);

                    const serviceName = getServiceName(apt);
                    const customerName = getCustomerName(apt);
                    const petInfo = getPetInfo(apt);
                    const price = getPrice(apt, company?.mainCurrency);
                    const petEmoji = getPetEmoji(apt.petId?.species || "");
                    const borderBgColorClass = getServiceBgColor(serviceName);

                    const startTime = formatTime(apt.start);
                    const endTime = formatTime(apt.end);

                    // Customer details
                    const customerPhone = apt?.customerId?.phone || "";
                    const customerEmail = apt?.customerId?.email || "";

                    // Status styling
                    const status = apt.status || "scheduled";
                    const isInactive = ["completed", "canceled", "no_show"].includes(status);
                    const statusInfo = STATUS_MAP[status] || STATUS_MAP.scheduled;

                    return (
                      <div
                        key={apt._id}
                        className={`absolute left-1 right-1 z-20 cursor-pointer ${isInactive ? 'opacity-60' : ''}`}
                        style={{
                          top: `${top}px`,
                          height: `${Math.max(height, 60)}px`,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onAppointmentClick && onAppointmentClick(apt);
                        }}
                      >
                        <div className={`h-full bg-white rounded shadow-sm overflow-visible border border-gray-200 relative ${
                          status === "canceled" ? "border-red-300" :
                          status === "completed" ? "border-gray-300" :
                          status === "no_show" ? "border-orange-300" :
                          ""
                        }`}>
                          <div className="p-2 h-full flex flex-col relative">
                            {/* Top Row */}
                            <div className="flex items-center justify-between mb-1.5">
                              {/* Left: Time and Service Category */}
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                                <span className="text-[10px] font-semibold text-gray-700 whitespace-nowrap">
                                  {startTime} - {endTime}
                                </span>
                                <span className="text-[9px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded font-medium truncate max-w-[80px]">
                                  {serviceName}
                                </span>
                              </div>

                              {/* Center: Contact Info and Name */}
                              <div className="flex-1 flex items-center justify-center gap-2 px-2 min-w-0">
                                <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-center">
                                  <UserCircleIcon className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                                  <span className="text-[9px] font-semibold text-gray-900 truncate">
                                    {customerName}
                                  </span>
                                  {(customerPhone || customerEmail) && (
                                    <span className="text-[9px] text-gray-500 truncate">
                                      • {customerPhone || customerEmail}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Right: Price */}
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                {price && (
                                  <span className="text-[10px] font-semibold text-gray-900 bg-gray-100 px-1.5 py-0.5 rounded whitespace-nowrap">
                                    {price}
                                  </span>
                                )}
                                {isInactive && (
                                  <span className="text-[9px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full font-medium whitespace-nowrap">
                                    {statusInfo.label}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Bottom Row */}
                            <div className="flex items-center gap-1.5 mt-auto">
                              {petInfo && (
                                <>
                                  <span className="text-xs">{petEmoji}</span>
                                  <div className="text-[10px] font-medium text-gray-700 truncate flex-1">
                                    {petInfo}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Colored bottom border */}
                          <div className={`absolute bottom-0 left-0 right-0 h-1 ${
                            status === "canceled" ? "bg-red-500" :
                            status === "completed" ? "bg-gray-500" :
                            status === "no_show" ? "bg-orange-500" :
                            borderBgColorClass
                          }`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DayScheduleView;
