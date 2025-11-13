"use client";
import React from "react";
import { CheckmarkIcon, ClockIcon } from "../icons/ScheduleIcons";
import { useSelector } from "react-redux";
import { getCurrencySymbol } from "@/shared/utils";

/**
 * Preview card shown for pre-selected appointment slots
 * Displays service details, duration, and price in the schedule grid
 */

// Constants
const MIN_CARD_HEIGHT = 60; // Minimum height in pixels
const SLOTS_PER_HOUR = 2; // Number of 30-min slots per hour

/**
 * Calculate card position and height
 */
export const calculateCardDimensions = (
  time,
  duration,
  slotHeight,
  date,
  startHour,
  getVerticalPosition,
  gridConfig
) => {
  // Parse time
  const [hours, minutes] = time.split(":").map(Number);
  const slotDate = new Date(date);
  slotDate.setHours(hours, minutes, 0, 0);

  // Calculate position
  const top =
    getVerticalPosition(slotDate, startHour) *
    (slotHeight / gridConfig.SLOT_HEIGHT_DAY_VIEW);

  // Calculate height based on duration
  const height = (duration / 60) * slotHeight * SLOTS_PER_HOUR;

  return {
    top,
    height: Math.max(height, MIN_CARD_HEIGHT),
  };
};

/**
 * PreviewCard Component
 */
const PreviewCard = ({ selectedSlot, top, height }) => {
  const company = useSelector((state) => state.auth.company);
  const currencySymbol = getCurrencySymbol(company?.mainCurrency);

  const serviceName = selectedSlot.service?.name || "Service";
  const serviceItemLabel =
    selectedSlot.serviceItem?.label || selectedSlot.serviceItem?.size || "";
  const price = selectedSlot.serviceItem?.price || 0;

  return (
    <div
      className="absolute left-1 right-1 z-30 pointer-events-none"
      style={{
        top: `${top}px`,
        height: `${height}px`,
      }}
      role="presentation"
      aria-label={`Preview appointment: ${serviceName} at ${selectedSlot.time} for ${selectedSlot.duration} minutes`}
    >
      <div className="h-full rounded-lg border-2 border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg p-2 flex flex-col relative overflow-hidden">
        {/* Preview Badge */}
        <div className="absolute top-1 right-1" role="status">
          <div className="bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
            <CheckmarkIcon className="w-2.5 h-2.5" />
            <span>PREVIEW</span>
          </div>
        </div>

        {/* Service Name */}
        <div
          className="font-semibold text-green-900 text-xs leading-tight pr-16"
          title={serviceName}
        >
          {serviceName}
        </div>

        {/* Service Item */}
        {serviceItemLabel && (
          <div
            className="text-[10px] text-green-700 font-medium mt-0.5"
            title={serviceItemLabel}
          >
            {serviceItemLabel}
          </div>
        )}

        {/* Time & Duration */}
        <div className="text-[10px] text-green-600 mt-1 flex items-center gap-1">
          <ClockIcon className="w-3 h-3" />
          <span>{selectedSlot.time}</span>
          <span className="mx-1" aria-hidden="true">
            •
          </span>
          <span>
            {selectedSlot.duration} min
            <span className="sr-only">minutes</span>
          </span>
        </div>

        {/* Price */}
        {price > 0 && (
          <div className="text-xs font-bold text-green-700 mt-auto">
            {currencySymbol}{price.toFixed(2)}
          </div>
        )}

        {/* Animated border */}
        <div
          className="absolute inset-0 rounded-lg border-2 border-green-400 animate-pulse pointer-events-none"
          aria-hidden="true"
        ></div>
      </div>
    </div>
  );
};

export default PreviewCard;
