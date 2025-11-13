"use client";
import React from "react";
import { format } from "date-fns";
import { Textarea } from "@/shared/components/ui/inputs";
import { useSelector } from "react-redux";
import { getCurrencySymbol } from "@/shared/utils";

const ConfirmStep = ({
  errors,
  bookingData,
  selectedCustomer,
  selectedPet,
  newCustomer,
  newPet,
  selectedService,
  selectedServiceItem,
  selectedStaff,
  computeVariantDuration,
  setStep,
  updateBookingData,
  showGoogleToggle = false,
  googleSyncEnabled = false,
  onToggleGoogleSync,
}) => {
  const company = useSelector((state) => state.auth.company);
  const currencySymbol = getCurrencySymbol(company?.mainCurrency);

  // Use existing customer data or new customer data
  const customerName =
    selectedCustomer?.fullName || newCustomer?.fullName || "New Customer";
  const petName = selectedPet?.name || newPet?.name || "New Pet";
  const petBreed = selectedPet?.breed || newPet?.breed || "";

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Review & Confirm Appointment
        </h3>

        <div className="bg-gray-50 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Customer:</span>
            <span className="font-medium">{customerName}</span>
            <button
              type="button"
              className="text-blue-600 text-xs ml-3"
              onClick={() => setStep(1)}
            >
              Edit
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Pet:</span>
            <span className="font-medium">
              {petName} {petBreed && `(${petBreed})`}
            </span>
            <button
              type="button"
              className="text-blue-600 text-xs ml-3"
              onClick={() => setStep(1)}
            >
              Edit
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Service:</span>
            <span className="font-medium">
              {selectedService?.name} - {selectedServiceItem?.label}
            </span>
            <button
              type="button"
              className="text-blue-600 text-xs ml-3"
              onClick={() => setStep(2)}
            >
              Edit
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Staff:</span>
            <span className="font-medium">{selectedStaff?.fullName}</span>
            <button
              type="button"
              className="text-blue-600 text-xs ml-3"
              onClick={() => setStep(3)}
            >
              Edit
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Date:</span>
            <span className="font-medium">
              {format(new Date(bookingData.date), "EEEE, MMMM d, yyyy")}
            </span>
            <button
              type="button"
              className="text-blue-600 text-xs ml-3"
              onClick={() => setStep(3)}
            >
              Edit
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Time:</span>
            <span className="font-medium">{bookingData.time}</span>
            <button
              type="button"
              className="text-blue-600 text-xs ml-3"
              onClick={() => setStep(3)}
            >
              Edit
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Duration:</span>
            <span className="ml-2 font-medium">
              {(() => {
                const d = computeVariantDuration(selectedServiceItem) || 60;
                return `${d} minutes`;
              })()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Price:</span>
            <span className="font-medium">{currencySymbol}{selectedServiceItem?.price}</span>
          </div>

          {/* Notes Field */}
          <div className="pt-4 border-t border-gray-200">
            <Textarea
              label="Notes (Optional)"
              value={bookingData.notes || ""}
              onChange={(e) => updateBookingData("notes", e.target.value)}
              placeholder="Add any special instructions or notes..."
              rows={3}
            />
          </div>

          {showGoogleToggle && (
            <div className="pt-4 border-t border-gray-200 flex items-center justify-between">
              <span className="text-gray-700">
                Sync this appointment to Google
              </span>
              <button
                className={`w-12 h-6 rounded-full transition relative ${
                  googleSyncEnabled ? "bg-green-500" : "bg-gray-300"
                }`}
                onClick={onToggleGoogleSync}
                type="button"
                aria-label={`Google sync ${
                  googleSyncEnabled ? "enabled" : "disabled"
                }`}
              >
                <span
                  className={`absolute top-0.5 ${
                    googleSyncEnabled ? "left-6" : "left-0.5"
                  } w-5 h-5 bg-white rounded-full shadow`}
                />
              </button>
            </div>
          )}
        </div>

        {errors.submit && (
          <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
            <p className="text-red-800 text-sm">{errors.submit}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfirmStep;
