"use client";
import React, { useState } from "react";
import { Button } from "@/ui";
import { Loader } from "@/ui";
import { Select } from "@/ui";
import {
  CalendarIcon,
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  AdjustmentsHorizontalIcon,
  XMarkIcon,
  MapPinIcon,
  UserIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";

const Toolbar = ({
  view,
  onViewChange,
  displayLabel,
  onPrev,
  onToday,
  onNext,
  canCreateBooking,
  onNewBooking,
  isLoading,
  // Optional selects
  locations,
  selectedLocationId,
  onLocationChange,
  trainers,
  selectedTrainerId,
  onTrainerChange,
  // Status filter
  statusFilter,
  onStatusFilterChange,
  // Sidebar toggle
  onToggleSidebar,
  isSidebarOpen,
  // Google status (optional)
  isGoogleConnected,
  lastGoogleSync,
  // Controls
  showViewToggle = false,
}) => {
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const lastSyncText = lastGoogleSync
    ? new Date(lastGoogleSync).toLocaleTimeString()
    : null;

  const hasFilters =
    (Array.isArray(locations) && locations.length > 0) ||
    (Array.isArray(trainers) && trainers.length > 0) ||
    typeof onStatusFilterChange === "function";

  const activeFilterCount = [
    selectedLocationId,
    selectedTrainerId,
    statusFilter !== "scheduled" ? statusFilter : null // Count status filter if not default
  ].filter(Boolean).length;

  return (
    <>
      {/* Desktop Toolbar - Hidden on mobile */}
      <div className="hidden lg:flex items-center justify-between bg-white/90 supports-[backdrop-filter]:bg-white/70 backdrop-blur border border-neutral-200 rounded-xl px-3 py-2 sticky top-0 z-30">
        {/* Left: Navigation */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            aria-label="Previous"
            onClick={onPrev}
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={onToday}>
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            aria-label="Next"
            onClick={onNext}
          >
            <ChevronRightIcon className="w-4 h-4" />
          </Button>
        </div>

        {/* Center: Date Label & Status */}
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-sm font-semibold text-gray-900 truncate">
            {displayLabel}
          </h2>
          {isLoading && <Loader type="spinner" size="sm" variant="muted" />}
          {isGoogleConnected && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full" />
              <span className="hidden xl:inline">
                Synced{lastSyncText ? ` · ${lastSyncText}` : ""}
              </span>
            </span>
          )}
        </div>

        {/* Right: Filters & View Toggle */}
        <div className="flex items-center gap-2">
          {typeof onStatusFilterChange === "function" && (
            <div className="w-40">
              <Select
                value={statusFilter || "scheduled"}
                onChange={(e) => onStatusFilterChange(e.target.value)}
                icon={FunnelIcon}
                aria-label="Filter by status"
                options={[
                  { value: "all", label: "All Statuses" },
                  { value: "scheduled", label: "Scheduled" },
                  { value: "checked_in", label: "Checked In" },
                  { value: "in_progress", label: "In Progress" },
                  { value: "completed", label: "Completed" },
                  { value: "canceled", label: "Canceled" },
                  { value: "no_show", label: "No Show" },
                ]}
              />
            </div>
          )}
          {Array.isArray(locations) &&
            locations.length > 0 &&
            typeof onLocationChange === "function" && (
              <div className="w-44">
                <Select
                  value={selectedLocationId || ""}
                  onChange={(e) => onLocationChange(e.target.value || null)}
                  icon={MapPinIcon}
                  aria-label="Filter by location"
                  options={[
                    { value: "", label: "All Locations" },
                    ...locations.map((loc) => ({
                      value: loc._id,
                      label: loc.label || loc.name || "Location",
                    })),
                  ]}
                />
              </div>
            )}
          {Array.isArray(trainers) &&
            trainers.length > 0 &&
            typeof onTrainerChange === "function" && (
              <div className="w-44">
                <Select
                  value={selectedTrainerId || ""}
                  onChange={(e) => onTrainerChange(e.target.value || "")}
                  icon={UserIcon}
                  aria-label="Filter by staff"
                  options={[
                    { value: "", label: "All Staff" },
                    ...(trainers || []).map((t) => ({
                      value: t._id,
                      label: t.fullName || t.name || "Staff",
                    })),
                  ]}
                />
              </div>
            )}
          {showViewToggle && (
            <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => onViewChange && onViewChange("day")}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  view === "day"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Day
              </button>
              <button
                onClick={() => onViewChange && onViewChange("week")}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  view === "week"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Week
              </button>
            </div>
          )}
          {canCreateBooking && (
            <Button variant="luxury" size="sm" onClick={onNewBooking}>
              + New booking
            </Button>
          )}
          {typeof onToggleSidebar === "function" && (
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleSidebar}
              aria-label="Toggle calendar"
              title={
                isSidebarOpen ? "Hide mini calendar" : "Show mini calendar"
              }
            >
              {isSidebarOpen ? (
                <CalendarDaysIcon className="w-5 h-5" />
              ) : (
                <CalendarIcon className="w-5 h-5" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Toolbar */}
      <div className="lg:hidden bg-white/90 supports-[backdrop-filter]:bg-white/70 backdrop-blur border border-neutral-200 rounded-xl overflow-hidden sticky top-0 z-30">
        {/* Top Row: Date & Navigation */}
        <div className="flex items-center justify-between p-3 border-b border-gray-100">
          <button
            onClick={onPrev}
            className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 transition-colors touch-manipulation"
            aria-label="Previous"
          >
            <ChevronLeftIcon className="w-5 h-5 text-gray-700" />
          </button>

          <div className="flex-1 text-center px-2">
            <h2 className="text-base font-semibold text-gray-900 truncate">
              {displayLabel}
            </h2>
            {isLoading && (
              <div className="flex items-center justify-center mt-1">
                <Loader type="spinner" size="sm" variant="muted" />
              </div>
            )}
          </div>

          <button
            onClick={onNext}
            className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 transition-colors touch-manipulation"
            aria-label="Next"
          >
            <ChevronRightIcon className="w-5 h-5 text-gray-700" />
          </button>
        </div>

        {/* Bottom Row: Actions */}
        <div className="flex items-center justify-between p-3 gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={onToday}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors touch-manipulation"
            >
              Today
            </button>

            {/* View Toggle */}
            {showViewToggle && (
              <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => onViewChange && onViewChange("day")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors touch-manipulation ${
                    view === "day"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600"
                  }`}
                >
                  Day
                </button>
                <button
                  onClick={() => onViewChange && onViewChange("week")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors touch-manipulation ${
                    view === "week"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600"
                  }`}
                >
                  Week
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Filters Button */}
            {hasFilters && (
              <button
                onClick={() => setShowMobileFilters(true)}
                className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors touch-manipulation"
                aria-label="Filters"
              >
                <AdjustmentsHorizontalIcon className="w-5 h-5 text-gray-700" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-600 rounded-full">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            )}

            {/* Calendar Toggle */}
            {typeof onToggleSidebar === "function" && (
              <button
                onClick={onToggleSidebar}
                className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors touch-manipulation"
                aria-label="Toggle calendar"
              >
                {isSidebarOpen ? (
                  <CalendarDaysIcon className="w-5 h-5 text-gray-700" />
                ) : (
                  <CalendarIcon className="w-5 h-5 text-gray-700" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Google Sync Status (if connected) */}
        {isGoogleConnected && (
          <div className="px-3 pb-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-green-700 font-medium">
                Google {lastSyncText ? `· ${lastSyncText}` : "connected"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Filters Bottom Sheet */}
      {showMobileFilters && (
        <div
          className="fixed inset-0 bg-black/50 z-50 lg:hidden"
          onClick={() => setShowMobileFilters(false)}
        >
          <div
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle Bar */}
            <div className="flex items-center justify-center pt-3 pb-2">
              <div className="w-12 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
              <button
                onClick={() => setShowMobileFilters(false)}
                className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Filter Options */}
            <div className="p-6 space-y-6">
              {/* Status Filter */}
              {typeof onStatusFilterChange === "function" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <Select
                    value={statusFilter || "scheduled"}
                    onChange={(e) => {
                      onStatusFilterChange(e.target.value);
                    }}
                    options={[
                      { value: "all", label: "All Statuses" },
                      { value: "scheduled", label: "Scheduled" },
                      { value: "checked_in", label: "Checked In" },
                      { value: "in_progress", label: "In Progress" },
                      { value: "completed", label: "Completed" },
                      { value: "canceled", label: "Canceled" },
                      { value: "no_show", label: "No Show" },
                    ]}
                    className="w-full"
                  />
                </div>
              )}

              {/* Location Filter */}
              {Array.isArray(locations) &&
                locations.length > 0 &&
                typeof onLocationChange === "function" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location
                    </label>
                    <Select
                      value={selectedLocationId || ""}
                      onChange={(e) => {
                        onLocationChange(e.target.value || null);
                      }}
                      options={[
                        { value: "", label: "All Locations" },
                        ...locations.map((loc) => ({
                          value: loc._id,
                          label: loc.label || loc.name || "Location",
                        })),
                      ]}
                      className="w-full"
                    />
                  </div>
                )}

              {/* Staff Filter */}
              {Array.isArray(trainers) &&
                trainers.length > 0 &&
                typeof onTrainerChange === "function" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Staff
                    </label>
                    <Select
                      value={selectedTrainerId || ""}
                      onChange={(e) => {
                        onTrainerChange(e.target.value || "");
                      }}
                      options={[
                        { value: "", label: "All Staff" },
                        ...(trainers || []).map((t) => ({
                          value: t._id,
                          label: t.fullName || t.name || "Staff",
                        })),
                      ]}
                      className="w-full"
                    />
                  </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 p-6 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => {
                  if (onStatusFilterChange) onStatusFilterChange("scheduled");
                  if (onLocationChange) onLocationChange(null);
                  if (onTrainerChange) onTrainerChange("");
                }}
                className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors touch-manipulation"
              >
                Clear All
              </button>
              <button
                onClick={() => setShowMobileFilters(false)}
                className="flex-1 px-4 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors touch-manipulation"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Toolbar;
