"use client";
import React from "react";
import { Loader } from "@/shared/components/ui";
import { useSelector } from "react-redux";
import { getCurrencySymbol } from "@/shared/utils";

const ServiceStep = ({
  errors,
  bookingData,
  updateBookingData,
  isServicesLoading,
  filteredServices,
  isServiceItemsLoading,
  serviceItems,
  computeVariantDuration,
  selectedService,
  selectedServiceItem,
  newPet,
}) => {
  const company = useSelector((state) => state.auth.company);
  const currencySymbol = getCurrencySymbol(company?.mainCurrency);

  return (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Select Service & Item
      </h3>

      {/* Only show this message if pet fields are not filled */}
      {!(newPet.name?.trim() && newPet.breed && newPet.species) ? (
        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200 text-sm text-yellow-800">
          Please fill out pet details to see available services.
        </div>
      ) : (
        <>
          {/* Service Selection */}
          <div className="mb-6">
            <h4 className="text-md font-semibold text-gray-800 mb-4">
              Choose Service
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {isServicesLoading && (
                <div className="col-span-full text-sm text-gray-500 flex items-center gap-2">
                  <Loader type="spinner" size="sm" variant="muted" /> Loading
                  services…
                </div>
              )}
              {!isServicesLoading && filteredServices.length === 0 && (
                <div className="col-span-full p-4 bg-gray-50 rounded-lg border border-gray-200 text-sm text-gray-600 text-center">
                  No services found for {newPet.species || "selected species"}.
                  Please add services in settings or select a different pet
                  species.
                </div>
              )}
              {!isServicesLoading &&
                filteredServices.length > 0 &&
                filteredServices.map((service) => (
                  <button
                    key={service._id}
                    type="button"
                    onClick={() => {
                      updateBookingData("serviceId", service._id);
                      updateBookingData("serviceItemId", "");
                    }}
                    className={`p-4 rounded-xl border-2 transition-colors ${
                      bookingData.serviceId === service._id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <div className="text-left">
                      <div className="flex items-start justify-between mb-2">
                        <h5 className="font-semibold text-sm text-gray-900">
                          {service.name}
                        </h5>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                          {service.species}
                        </span>
                        {service.description && (
                          <span className="text-xs text-gray-600 truncate">
                            {service.description}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
            </div>

            {errors.serviceId && (
              <div className="mt-3 flex items-center space-x-2 text-red-600">
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm">{errors.serviceId}</span>
              </div>
            )}
          </div>

          {/* Service Variant Selection */}
          {bookingData.serviceId && (
            <div className="mb-6">
              <h4 className="text-md font-semibold text-gray-800 mb-4 flex items-center">
                <svg
                  className="w-5 h-5 text-gray-600 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                Select Service Item
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {isServiceItemsLoading && (
                  <div className="col-span-full text-sm text-gray-500 flex items-center gap-2">
                    <Loader type="spinner" size="sm" variant="muted" /> Loading
                    items…
                  </div>
                )}
                {!isServiceItemsLoading && serviceItems.length === 0 && (
                  <div className="col-span-full p-4 bg-yellow-50 rounded-lg border border-yellow-200 text-sm text-yellow-800 text-center">
                    No service items found for this service. Please add service
                    items in the company settings.
                  </div>
                )}
                {!isServiceItemsLoading &&
                  serviceItems.length > 0 &&
                  serviceItems.map((variant) => {
                    const isSelected =
                      bookingData.serviceItemId === variant._id;
                    const duration = computeVariantDuration(variant);
                    const displayLabel =
                      variant.label ||
                      `${variant.size} - ${variant.coatType}`;

                    return (
                      <button
                        key={variant._id}
                        type="button"
                        onClick={() =>
                          updateBookingData("serviceItemId", variant._id)
                        }
                        className={`group relative p-5 rounded-xl border-2 transition-all duration-200 ${
                          isSelected
                            ? "border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-md scale-[1.02]"
                            : "border-gray-200 hover:border-blue-300 hover:shadow-sm bg-white"
                        }`}
                      >
                        {/* Selection indicator */}
                        {isSelected && (
                          <div className="absolute top-3 right-3">
                            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                              <svg
                                className="w-4 h-4 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={3}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </div>
                          </div>
                        )}

                        <div className="text-left">
                          {/* Title */}
                          <div className="mb-4 pr-8">
                            <h5
                              className={`font-semibold text-base leading-tight ${
                                isSelected ? "text-blue-900" : "text-gray-900"
                              }`}
                            >
                              {displayLabel}
                            </h5>
                          </div>

                          {/* Badges for size and coat type */}
                          <div className="flex flex-wrap gap-2 mb-4">
                            {variant.size && variant.size !== "all" && (
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                                  isSelected
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {variant.size}
                              </span>
                            )}
                            {variant.coatType && variant.coatType !== "all" && (
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                                  isSelected
                                    ? "bg-purple-100 text-purple-800"
                                    : "bg-purple-50 text-purple-700"
                                }`}
                              >
                                {variant.coatType}
                              </span>
                            )}
                          </div>

                          {/* Duration and Price */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600 flex items-center gap-1.5">
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                                Duration
                              </span>
                              <span
                                className={`text-sm font-semibold ${
                                  isSelected
                                    ? "text-blue-900"
                                    : "text-gray-900"
                                }`}
                              >
                                {duration ? `${duration} min` : "—"}
                              </span>
                            </div>

                            <div
                              className={`flex items-center justify-between pt-2 border-t ${
                                isSelected
                                  ? "border-blue-200"
                                  : "border-gray-200"
                              }`}
                            >
                              <span className="text-sm text-gray-600 flex items-center gap-1.5">
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                                Price
                              </span>
                              <span className="text-xl font-bold text-green-600">
                                {currencySymbol}{variant.price}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
              </div>

              {errors.serviceItemId && (
                <div className="mt-3 flex items-center space-x-2 text-red-600">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm">{errors.serviceItemId}</span>
                </div>
              )}

              {bookingData.serviceId && !bookingData.serviceItemId && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <svg
                      className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div className="text-sm text-blue-800">
                      <p className="font-medium">
                        Select a service item to continue
                      </p>
                      <p className="text-blue-700 mt-1">
                        Choose the service item that matches your pet's needs.
                        This determines the duration and available time slots.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Service Summary Card */}
          {selectedService && selectedServiceItem && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                    <span className="text-sm font-medium text-gray-700">
                      Service:
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {selectedService.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                    <span className="text-sm font-medium text-gray-700">
                      Item:
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {selectedServiceItem.label ||
                        `${selectedServiceItem.size} - ${selectedServiceItem.coatType}`}
                    </span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                    <span className="text-sm font-medium text-gray-700">
                      Duration:
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {(() => {
                        const d =
                          computeVariantDuration(selectedServiceItem) || 60;
                        return `${d} minutes`;
                      })()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                    <span className="text-sm font-medium text-gray-700">
                      Price:
                    </span>
                    <span className="text-lg font-bold text-green-600">
                      {currencySymbol}{selectedServiceItem.price}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-600">
                Next: Staff & Time
              </div>
            </div>
          )}
        </>
      )}
    </div>
  </div>
  );
};

export default ServiceStep;

