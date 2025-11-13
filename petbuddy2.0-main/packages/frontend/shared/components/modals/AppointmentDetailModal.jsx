"use client";
import React, { useState, useMemo } from "react";
import { useDispatch } from "react-redux";
import {
  useUpdateAppointmentMutation,
  useDeleteAppointmentMutation,
} from "@/core/api/baseApi";
import { closeModal, openModal } from "@/core/store/slices/uiSlice";
import {
  CalendarIcon,
  UserIcon,
  MapPinIcon,
  PhoneIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { Button, Select } from "@/ui";
import { useListLocationsQuery } from "@/core/api/locationsApi";

const CANCEL_REASONS = [
  { value: "customer_requested", label: "Customer Requested" },
  { value: "staff_unavailable", label: "Staff Unavailable" },
  { value: "resource_unavailable", label: "Resource Unavailable" },
  { value: "weather_conditions", label: "Weather Conditions" },
  { value: "pet_health_issue", label: "Pet Health Issue" },
  { value: "business_closed", label: "Business Closed" },
  { value: "double_booking_error", label: "Double Booking Error" },
  { value: "system_error", label: "System Error" },
  { value: "other", label: "Other" },
];

const STATUS_CONFIG = {
  scheduled: {
    color: "bg-blue-100 text-blue-800 border-blue-200",
    label: "Scheduled",
    nextAction: { status: "checked_in", label: "Check In", icon: CheckCircleIcon },
  },
  checked_in: {
    color: "bg-green-100 text-green-800 border-green-200",
    label: "Checked In",
    nextAction: { status: "in_progress", label: "Start Service", icon: ClockIcon },
  },
  in_progress: {
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    label: "In Progress",
    nextAction: { status: "completed", label: "Complete", icon: CheckCircleIcon },
  },
  completed: { color: "bg-gray-100 text-gray-800 border-gray-200", label: "Completed" },
  canceled: { color: "bg-red-100 text-red-800 border-red-200", label: "Canceled" },
  no_show: { color: "bg-orange-100 text-orange-800 border-orange-200", label: "No Show" },
};

const InfoRow = ({ icon: Icon, label, value, subtext, alwaysShow = false }) => {
  if (!value && !alwaysShow) return null;

  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-200 last:border-0">
      {Icon && <Icon className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-700 mb-0.5">{label}</p>
        <p className="text-base text-gray-900">{value || "—"}</p>
        {subtext && (
          <div className="text-sm text-gray-600 mt-0.5 space-y-1">
            {subtext}
          </div>
        )}
      </div>
    </div>
  );
};

export default function AppointmentDetailModal({ appointment }) {
  const dispatch = useDispatch();
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelNotes, setCancelNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { data: locationsRes } = useListLocationsQuery();

  const [updateAppointment] = useUpdateAppointmentMutation();
  const [deleteAppointment] = useDeleteAppointmentMutation();

  if (!appointment) return null;

  const {
    _id,
    start,
    end,
    status = "scheduled",
    notes,
    customerId,
    petId,
    serviceId,
    staffId,
    locationId,
  } = appointment;

  const startDate = start ? new Date(start) : null;
  const endDate = end ? new Date(end) : null;
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.scheduled;

  const formatDate = (date) =>
    date?.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const formatTime = (date) =>
    date?.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

  const extractValue = (obj) => (typeof obj === "string" ? obj : obj?._id || obj);

  const resolvedLocation = useMemo(() => {
    if (!locationId) return null;
    const hasDetails =
      typeof locationId === "object" &&
      (locationId.name || locationId.label || locationId.address || locationId.phone);
    if (hasDetails) return locationId;

    const id = extractValue(locationId);
    if (!id) return null;

    const items = locationsRes?.items || locationsRes || [];
    return items.find((loc) => extractValue(loc) === id) || null;
  }, [locationId, locationsRes]);

  const handleReschedule = () => {
    dispatch(closeModal());
    dispatch(
      openModal({
        id: "BOOK_APPT",
        props: {
          appointmentId: _id,
          editMode: true,
          initialDate: startDate,
          initialStaffId: extractValue(staffId),
          initialLocationId: extractValue(locationId),
          initialCustomerId: extractValue(customerId),
          initialPetId: extractValue(petId),
          initialServiceId: extractValue(serviceId),
        },
        ui: {
          title: "Reschedule Appointment",
          showClose: true,
          size: "4xl",
          mobileFullscreen: true,
          backdropBlur: true,
        },
      })
    );
  };

  const handleCancel = async () => {
    if (!cancelReason) {
      alert("Please select a cancellation reason");
      return;
    }

    setIsProcessing(true);
    try {
      await deleteAppointment({ id: _id, reason: cancelReason, notes: cancelNotes }).unwrap();
      dispatch(closeModal());
    } catch (error) {
      console.error("Failed to cancel appointment:", error);
      alert("Failed to cancel appointment. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    setIsProcessing(true);
    try {
      await updateAppointment({ id: _id, status: newStatus }).unwrap();
      dispatch(closeModal());
    } catch (error) {
      console.error("Failed to update status:", error);
      alert("Failed to update status. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const canReschedule = ["scheduled", "checked_in"].includes(status);
  const canCancel = ["scheduled", "checked_in", "in_progress"].includes(status);
  const nextAction = statusConfig.nextAction;
  const ActionIcon = nextAction?.icon;

  return (
    <div className="flex flex-col min-h-0">
      <div className="space-y-6 flex-1">
        {/* Status Badge */}
        <div className="flex justify-start">
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}
          >
            {statusConfig.label}
          </span>
        </div>

        {/* Date & Time */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CalendarIcon className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-base font-semibold text-gray-900">
                {formatDate(startDate)}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {formatTime(startDate)} - {formatTime(endDate)}
              </p>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-0">
          <InfoRow
            label="Service"
            value={serviceId?.name || serviceId?.label || "N/A"}
            subtext={serviceId?.duration && `Duration: ${serviceId.duration} minutes`}
          />

          <InfoRow
            icon={UserIcon}
            label="Customer"
            value={customerId?.fullName || customerId?.name || "N/A"}
            subtext={
              customerId?.phone && (
                <span className="flex items-center gap-1">
                  <PhoneIcon className="w-4 h-4" /> {customerId.phone}
                </span>
              )
            }
          />

          <InfoRow
            label="Pet"
            value={petId?.name}
            subtext={petId?.breed && `Breed: ${petId.breed}`}
          />

          <InfoRow
            icon={UserIcon}
            label="Staff Member"
            value={staffId?.fullName || staffId?.name || "N/A"}
          />

          <InfoRow
            icon={MapPinIcon}
            label="Location"
            alwaysShow={true}
            value={
              resolvedLocation?.name ||
              resolvedLocation?.label ||
              (typeof locationId === "string" ? "Location" : null) ||
              (locationId ? "Location" : "No location specified")
            }
            subtext={
              resolvedLocation && (
                <>
                  {resolvedLocation.address && (
                    <span className="block">{resolvedLocation.address}</span>
                  )}
                  {resolvedLocation.phone && (
                    <span className="flex items-center gap-1">
                      <PhoneIcon className="w-4 h-4" /> {resolvedLocation.phone}
                    </span>
                  )}
                </>
              )
            }
          />

          {notes && (
            <div className="pt-3 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-1">Notes</p>
              <p className="text-sm text-gray-600">{notes}</p>
            </div>
          )}
        </div>

        {/* Cancel Form */}
        {showCancelForm && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-4">
            <h3 className="text-sm font-semibold text-red-900">Cancel Appointment</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for cancellation *
              </label>
              <Select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                options={[{ value: "", label: "Select a reason..." }, ...CANCEL_REASONS]}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional notes (optional)
              </label>
              <textarea
                value={cancelNotes}
                onChange={(e) => setCancelNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                rows={3}
                placeholder="Add any additional details..."
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowCancelForm(false)}
                disabled={isProcessing}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                variant="danger"
                onClick={handleCancel}
                disabled={isProcessing || !cancelReason}
                className="flex-1"
              >
                {isProcessing ? "Canceling..." : "Confirm Cancellation"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {!showCancelForm && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex flex-wrap gap-3">
            {nextAction && ActionIcon && (
              <Button
                variant="primary"
                onClick={() => handleStatusUpdate(nextAction.status)}
                disabled={isProcessing}
                className="flex items-center gap-2"
              >
                <ActionIcon className="w-5 h-5" />
                {nextAction.label}
              </Button>
            )}

            {canReschedule && (
              <Button
                variant="outline"
                onClick={handleReschedule}
                disabled={isProcessing}
                className="flex items-center gap-2"
              >
                <PencilIcon className="w-5 h-5" />
                Reschedule
              </Button>
            )}

            {canCancel && (
              <Button
                variant="danger"
                onClick={() => setShowCancelForm(true)}
                disabled={isProcessing}
                className="flex items-center gap-2 ml-auto"
              >
                <XCircleIcon className="w-5 h-5" />
                Cancel Appointment
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
