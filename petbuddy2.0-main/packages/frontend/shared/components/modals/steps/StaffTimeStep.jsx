"use client";
import React, { useMemo, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { format, formatISO, startOfDay, endOfDay } from "date-fns";
import {
  MiniCalendar,
  DayScheduleView,
  Toolbar,
} from "@/features/schedule/components";
import { useGetAppointmentsQuery } from "@/core/api/appointmentsApi";
import { useListLocationsQuery } from "@/core/api/locationsApi";
import { setSelectedLocation } from "@/core/store/slices/authSlice";
import {
  hasTimeSlotOverlap,
  formatAppointmentTime,
} from "@/shared/utils/appointmentUtils";
import { CheckmarkIcon } from "@/features/schedule/components/icons/ScheduleIcons";
import {
  CalendarIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";

const StaffTimeStep = ({
  errors,
  bookingData,
  updateBookingData,
  groomers = [],
  selectedService,
  selectedServiceItem,
  computeVariantDuration,
}) => {
  const initialDate = (() => {
    try {
      if (bookingData.date) {
        const parsed = new Date(bookingData.date);
        return isNaN(parsed.getTime()) ? new Date() : parsed;
      }
      return new Date();
    } catch (error) {
      console.error("Error parsing initial date:", error);
      return new Date();
    }
  })();
  const [date, setDate] = useState(initialDate);

  // Calendar sidebar visibility state (collapsed by default)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const range = useMemo(() => {
    return { from: startOfDay(date), to: endOfDay(date) };
  }, [date]);

  const dispatch = useDispatch();
  const globalSelectedLocationId = useSelector(
    (s) => s.auth.selectedLocationId
  );
  const selectedLocationId =
    bookingData.locationId !== undefined
      ? bookingData.locationId
      : globalSelectedLocationId;

  // Load locations for location selector in toolbar
  const { data: locationsRes } = useListLocationsQuery();
  const locations = (locationsRes && locationsRes.items) || [];

  const params = useMemo(
    () => ({
      startDate: formatISO(range.from),
      endDate: formatISO(range.to),
      limit: 500,
      ...(selectedLocationId ? { locationId: selectedLocationId } : {}),
    }),
    [range, selectedLocationId]
  );

  const { data: apptsRes, isFetching: loadingAppointments } =
    useGetAppointmentsQuery(params);
  const appointments = useMemo(() => {
    const items = apptsRes?.items || [];
    return items.map((apt) => ({
      ...apt,
      start: new Date(apt.start),
      end: new Date(apt.end),
    }));
  }, [apptsRes?.items]);

  // Use bookingData.staffId directly instead of local state to avoid sync issues
  const selectedTrainerId = bookingData.staffId || "";

  const filteredAppointments = useMemo(() => {
    return selectedTrainerId
      ? appointments.filter((apt) => {
          const aptStaffId = apt?.staffId?._id || apt?.staffId;
          return aptStaffId === selectedTrainerId;
        })
      : appointments;
  }, [appointments, selectedTrainerId]);

  const displayStaff = useMemo(() => {
    return selectedTrainerId
      ? groomers.filter((g) => g?._id === selectedTrainerId)
      : groomers;
  }, [groomers, selectedTrainerId]);

  const marks = useMemo(() => {
    const counts = {};
    appointments.forEach((a) => {
      const key = format(a.start, "yyyy-MM-dd");
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [appointments]);

  const effectiveMinutes = useMemo(() => {
    return (
      (computeVariantDuration && selectedServiceItem
        ? computeVariantDuration(selectedServiceItem)
        : null) || 60
    );
  }, [computeVariantDuration, selectedServiceItem]);

  const handleTimeSlotClick = (hour, trainer, minute = 0) => {
    try {
      const start = new Date(date);
      start.setHours(hour, minute, 0, 0);
      const end = new Date(start.getTime() + effectiveMinutes * 60000);

      // Check for overlaps using utility function
      const hasOverlap = hasTimeSlotOverlap(
        start,
        end,
        appointments,
        trainer?._id
      );
      if (hasOverlap) {
        console.log("Time slot overlaps with existing appointment");
        return; // ignore clicks that would overlap
      }

      updateBookingData("staffId", trainer?._id || "");
      updateBookingData("date", format(start, "yyyy-MM-dd"));
      updateBookingData("time", formatAppointmentTime(start));
    } catch (error) {
      console.error("Error handling time slot click:", error);
    }
  };

  const goToPreviousDay = () => {
    const prev = new Date(date);
    prev.setDate(prev.getDate() - 1);
    setDate(prev);
  };

  const goToNextDay = () => {
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    setDate(next);
  };

  const goToToday = () => {
    setDate(new Date());
  };

  const selectedStaff = groomers.find((g) => g._id === bookingData.staffId);

  // Prepare selected slot info for visual highlighting with full details
  const selectedSlot = useMemo(() => {
    if (bookingData.staffId && bookingData.time && bookingData.date) {
      return {
        staffId: bookingData.staffId,
        time: bookingData.time,
        date: bookingData.date,
        // Add service and duration details for preview card
        service: selectedService,
        serviceItem: selectedServiceItem,
        duration: effectiveMinutes,
        staff: selectedStaff,
      };
    }
    return null;
  }, [
    bookingData.staffId,
    bookingData.time,
    bookingData.date,
    selectedService,
    selectedServiceItem,
    effectiveMinutes,
    selectedStaff,
  ]);

  return (
    <div className="space-y-3">
      {/* Pre-selected Slot Banner */}
      {selectedSlot && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-3">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                <CheckmarkIcon className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-green-900 mb-1">
                Time Slot Pre-selected from Schedule
              </h4>
              <p className="text-sm text-green-700">
                <strong>{selectedStaff?.fullName}</strong> on{" "}
                <strong>
                  {format(new Date(bookingData.date), "MMMM d, yyyy")}
                </strong>{" "}
                at <strong>{bookingData.time}</strong>
              </p>
              <p className="text-xs text-green-600 mt-1">
                The highlighted slot below is your pre-selected time. You can
                click a different slot to change it.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Service Summary */}
      <div className="bg-white border border-gray-200 rounded-xl p-3">
        <div className="text-sm text-gray-700">
          {selectedService ? (
            <>
              <span className="font-medium">{selectedService.name}</span>
              {selectedServiceItem && (
                <span className="text-gray-500">
                  {" "}
                  • {selectedServiceItem.label || selectedServiceItem.size}
                </span>
              )}
              <span className="text-gray-500"> • {effectiveMinutes} min</span>
            </>
          ) : (
            <span className="text-gray-500">Select a service in Step 2</span>
          )}
        </div>
        {bookingData.staffId && bookingData.date && bookingData.time && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex items-center gap-1 text-sm text-green-700 font-medium">
              <CheckmarkIcon className="w-4 h-4" />
              <span>
                Selected: {selectedStaff?.fullName || "Staff"} on{" "}
                {format(new Date(bookingData.date), "MMM d")} at{" "}
                {bookingData.time}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Toolbar with Calendar Toggle */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Toolbar
            view="day"
            displayLabel={format(date, "EEEE, MMMM d, yyyy")}
            onPrev={goToPreviousDay}
            onToday={goToToday}
            onNext={goToNextDay}
            isLoading={loadingAppointments}
            showViewToggle={false}
            locations={locations}
            selectedLocationId={selectedLocationId}
            onLocationChange={(id) => {
              const next = id || null;
              updateBookingData("locationId", next);
              dispatch(setSelectedLocation(next));
            }}
            trainers={groomers}
            selectedTrainerId={selectedTrainerId}
            onTrainerChange={(id) => {
              updateBookingData("staffId", id || "");
            }}
          />
        </div>

        {/* Calendar Toggle Button */}
        <button
          type="button"
          onClick={() => setIsCalendarOpen(!isCalendarOpen)}
          className="hidden lg:flex items-center justify-center px-3 py-2 rounded-lg border-2 border-gray-200 bg-white hover:bg-gray-50 hover:border-blue-300 transition-all"
          title={isCalendarOpen ? "Hide calendar" : "Show calendar"}
        >
          {isCalendarOpen ? (
            <CalendarDaysIcon className="w-5 h-5 text-gray-700" />
          ) : (
            <CalendarIcon className="w-5 h-5 text-gray-700" />
          )}
        </button>
      </div>

      {/* Schedule Grid with Sidebar */}
      <div className={`grid gap-4 ${isCalendarOpen ? 'lg:grid-cols-[1fr_18rem]' : 'lg:grid-cols-1'}`}>
        <div className="min-w-0">
          {displayStaff.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
              <p className="text-gray-500">
                No staff available. Please select a location or clear filters.
              </p>
            </div>
          ) : (
            <DayScheduleView
              appointments={filteredAppointments}
              staff={displayStaff}
              date={date}
              onAppointmentClick={() => {}}
              onTimeSlotClick={handleTimeSlotClick}
              colorStyle="background"
              zoom="standard"
              selectedSlot={selectedSlot}
            />
          )}
        </div>

        {/* Mini Calendar Sidebar - Collapsible */}
        {isCalendarOpen && (
          <div className="hidden lg:block">
            <div className="sticky top-4">
              <MiniCalendar
                selectedDate={date}
                onSelect={setDate}
                marks={marks}
              />
            </div>
          </div>
        )}
      </div>

      {errors?.submit && (
        <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-sm text-red-800">
          {errors.submit}
        </div>
      )}
    </div>
  );
};

export default StaffTimeStep;
