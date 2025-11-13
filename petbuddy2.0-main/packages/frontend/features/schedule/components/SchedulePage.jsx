"use client";
import React, { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { openModal } from "@/core/store/slices/uiSlice";
import { useListLocationsQuery } from "@/core/api/locationsApi";
import {
  useListStaffQuery,
  useGetAppointmentsQuery,
} from "@/core/api/appointmentsApi";
import { PlusIcon, UserPlusIcon } from "@heroicons/react/24/solid";
import Toolbar from "./calendar/Toolbar";
import MiniCalendar from "./calendar/MiniCalendar";
import DayView from "./views/DayView";
import { useScheduleView } from "../hooks/useScheduleView";
import { getAppointmentCountsByDate } from "../utils/appointmentHelpers";

export default function SchedulePageUI() {
  const dispatch = useDispatch();
  const router = useRouter();
  const { user, company, accessToken } = useSelector((state) => state.auth);
  const companyId = company?._id || user?.companyId;
  // View state
  const {
    date,
    view,
    displayLabel,
    setDate,
    setView,
    goToPrevious,
    goToNext,
    goToToday,
  } = useScheduleView();

  // Filters - default to "all" (empty string means all)
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [selectedTrainerId, setSelectedTrainerId] = useState("");
  // Status filter - default to scheduled appointments only
  const [statusFilter, setStatusFilter] = useState("scheduled"); // scheduled, active, all, completed, canceled

  // Sidebar visibility state (calendar expand/collapse)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Fetch real data (skip only if unauthenticated; backend infers company from JWT)
  const { data: locationsData } = useListLocationsQuery(undefined, {
    skip: !accessToken,
  });
  const { data: staffData } = useListStaffQuery(
    { serviceProvider: true },
    {
      skip: !accessToken,
    }
  );

  // Format date range for appointments query
  const startOfDay = useMemo(() => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, [date]);

  const endOfDay = useMemo(() => {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d.toISOString();
  }, [date]);

  // Build status query parameter based on filter
  const statusQueryParam = useMemo(() => {
    if (statusFilter === "active") {
      return "scheduled,checked_in,in_progress";
    } else if (statusFilter === "scheduled") {
      return "scheduled"; // Only scheduled appointments
    } else if (statusFilter === "all") {
      return undefined; // Don't send status param to get all
    } else {
      return statusFilter; // completed, canceled, no_show
    }
  }, [statusFilter]);

  const { data: appointmentsData, isLoading: isLoadingAppointments } =
    useGetAppointmentsQuery(
      {
        startDate: startOfDay,
        endDate: endOfDay,
        ...(selectedLocationId ? { locationId: selectedLocationId } : {}),
        ...(selectedTrainerId ? { staffId: selectedTrainerId } : {}),
        ...(statusQueryParam ? { status: statusQueryParam } : {}),
      },
      { skip: !accessToken }
    );

  // Extract data from API responses
  const locations = useMemo(() => {
    return (locationsData?.items || []).map((loc) => ({
      _id: loc._id,
      label: loc.name || loc.label || "Location",
      name: loc.name,
    }));
  }, [locationsData]);

  const staff = useMemo(() => {
    const list = (staffData?.items || []).map((s) => {
      let locationIds = [];
      if (Array.isArray(s.locationIds)) {
        locationIds = s.locationIds.map((id) => id?._id || id);
      } else if (Array.isArray(s.locations)) {
        locationIds = s.locations.map((l) => l?._id || l);
      } else if (s.locationId) {
        const id = s.locationId?._id || s.locationId;
        if (id) locationIds = [id];
      }

      const primaryLocationId = locationIds[0] || "";

      return {
        _id: s._id,
        fullName: s.fullName || s.name || "Staff Member",
        color: s.color || "#3b82f6",
        locationId: primaryLocationId,
        locationIds,
        profileImage: s.profileImage || "",
        schedules: s.schedules || [],
      };
    });

    // Fallback: if user is a groomer and API did not return staff (role restriction),
    // show at least current user as one staff column
    if (list.length === 0 && user?.role === "groomer") {
      const userLocationIds = Array.isArray(user?.locationIds)
        ? user.locationIds.map((id) => id?._id || id)
        : [];
      const primaryLocationId =
        user?.primaryLocationId || userLocationIds[0] || "";
      return [
        {
          _id: user._id,
          fullName: user.fullName || "Me",
          color: user.color || "#3b82f6",
          locationId: primaryLocationId,
          locationIds: userLocationIds,
          profileImage: user.profileImage || "",
          schedules: [],
        },
      ];
    }

    return list;
  }, [staffData, user]);

  const appointments = useMemo(() => {
    return (appointmentsData?.items || []).map((apt) => ({
      ...apt,
      start: new Date(apt.start),
      end: new Date(apt.end),
    }));
  }, [appointmentsData]);

  const visibleStaff = useMemo(() => {
    const filteredByLocation = selectedLocationId
      ? staff.filter((s) =>
          Array.isArray(s.locationIds)
            ? s.locationIds.includes(selectedLocationId)
            : s.locationId === selectedLocationId
        )
      : staff;
    return filteredByLocation;
  }, [staff, selectedLocationId]);

  const displayStaff = useMemo(() => {
    if (!selectedTrainerId) return visibleStaff;
    return visibleStaff.filter((s) => s._id === selectedTrainerId);
  }, [visibleStaff, selectedTrainerId]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      // Handle both populated (object) and non-populated (string) locationId
      const aptLocationId = apt?.locationId?._id || apt?.locationId;
      const matchLocation = selectedLocationId
        ? aptLocationId === selectedLocationId
        : true;

      // Handle both populated (object) and non-populated (string) staffId
      const aptStaffId = apt?.staffId?._id || apt?.staffId;
      const matchStaff = selectedTrainerId
        ? aptStaffId === selectedTrainerId
        : true;

      return matchLocation && matchStaff;
    });
  }, [appointments, selectedLocationId, selectedTrainerId]);

  const marks = useMemo(
    () => getAppointmentCountsByDate(appointments),
    [appointments]
  );

  const handleTimeSlotClick = (hour, trainer, minute = 0) => {
    // Open booking wizard with preset time
    const presetDate = new Date(date);
    presetDate.setHours(hour, minute, 0, 0);
    openBookingWizard({
      start: presetDate,
      staffId: trainer?._id,
    });
  };

  const handleAppointmentClick = (appointment) => {
    // Open appointment details or edit modal
    dispatch(
      openModal({
        id: "VIEW_APPT",
        props: {
          appointmentId: appointment?._id,
          appointment,
        },
        ui: {
          title: "Appointment Details",
          showClose: true,
          size: "3xl",
          mobileFullscreen: true,
        },
      })
    );
  };

  const openBookingWizard = (preset) => {
    dispatch(
      openModal({
        id: "BOOK_APPT",
        props: {
          initialDate: date,
          initialStaffId: selectedTrainerId || displayStaff[0]?._id || "",
          initialLocationId: selectedLocationId || "",
          preset,
        },
        ui: {
          title: "New Appointment",
          showClose: true,
          size: "4xl",
          mobileFullscreen: true,
          backdropBlur: true,
        },
      })
    );
  };

  const handleAddStaffClick = () => {
    // Navigate to staff page with query parameter to auto-open add staff modal
    router.push("/settings/staff?addStaff=true");
  };

  // Check if there are no staff members in the system
  const hasNoStaff = staff.length === 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-2 py-2">
        {/* Toolbar */}
        <div className="mb-4">
          <Toolbar
            view={view}
            onViewChange={undefined}
            displayLabel={displayLabel}
            onPrev={goToPrevious}
            onToday={goToToday}
            onNext={goToNext}
            isLoading={isLoadingAppointments}
            showViewToggle={false}
            locations={locations}
            selectedLocationId={selectedLocationId}
            onLocationChange={(id) => setSelectedLocationId(id || "")}
            trainers={visibleStaff}
            selectedTrainerId={selectedTrainerId}
            onTrainerChange={(id) => setSelectedTrainerId(id || "")}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            isSidebarOpen={isSidebarOpen}
          />
        </div>

        {/* Main */}
        <div className={`grid gap-4 ${isSidebarOpen ? 'lg:grid-cols-[1fr_18rem]' : 'lg:grid-cols-1'}`}>
          <div className="min-w-0">
            {hasNoStaff ? (
              /* Empty state when no staff members exist */
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                <UserPlusIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No Staff Members
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  You need to add staff members to your system before you can schedule appointments.
                </p>
                <button
                  type="button"
                  onClick={handleAddStaffClick}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-medium transition-colors shadow-sm"
                >
                  <UserPlusIcon className="w-5 h-5" />
                  Add Staff Member
                </button>
              </div>
            ) : (
              <>
                <DayView
                  appointments={filteredAppointments}
                  staff={displayStaff}
                  date={date}
                  onAppointmentClick={handleAppointmentClick}
                  onTimeSlotClick={handleTimeSlotClick}
                  colorStyle="background"
                  zoom="standard"
                />
                {/* Floating Add Appointment Button */}
                <button
                  type="button"
                  onClick={() => openBookingWizard()}
                  className="fixed bottom-5 right-5 z-40 flex items-center gap-2 px-4 py-3 rounded-full shadow-luxury bg-primary-600 hover:bg-primary-700 text-white transition-colors"
                  aria-label="Add appointment"
                >
                  <PlusIcon className="w-5 h-5" />
                  <span className="hidden sm:inline text-sm font-medium">
                    Add appointment
                  </span>
                </button>
              </>
            )}
          </div>

          {isSidebarOpen && (
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
      </div>
    </div>
  );
}
