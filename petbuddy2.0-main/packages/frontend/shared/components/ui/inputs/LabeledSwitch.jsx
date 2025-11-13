"use client";

import React from "react";

export default function LabeledSwitch({
  className = "",
  label,
  description,
  checked = false,
  onChange,
  disabled = false,
  size = "md",
}) {
  const sizeClasses = {
    sm: { track: "w-9 h-5", thumb: "w-4 h-4", translate: "translate-x-4" },
    md: { track: "w-11 h-6", thumb: "w-5 h-5", translate: "translate-x-5" },
    lg: { track: "w-14 h-7", thumb: "w-6 h-6", translate: "translate-x-7" },
  };

  const s = sizeClasses[size] || sizeClasses.md;

  const baseClasses = `relative inline-flex items-center rounded-full transition-colors duration-200 ease-in-out ${s.track}`;
  const stateClasses = disabled
    ? "bg-gray-200 cursor-not-allowed"
    : checked
    ? "bg-primary-600 hover:bg-primary-600 focus:ring-primary-500"
    : "bg-gray-200 hover:bg-gray-300 focus:ring-primary-500";

  const finalClasses = `${baseClasses} ${stateClasses} ${className}`;

  const handleToggle = () => {
    if (disabled) return;
    if (typeof onChange === "function") onChange(!checked);
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleToggle();
    }
  };

  return (
    <div className="relative">
      <div className="flex items-start gap-3">
        <div className="relative flex items-center">
          <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-disabled={disabled}
            className={finalClasses}
            disabled={disabled}
            onClick={handleToggle}
            onKeyDown={handleKeyDown}
          >
            <span
              className={`transform transition-transform duration-200 ease-in-out bg-white rounded-full shadow-md ${
                s.thumb
              } ${checked ? s.translate : "translate-x-0"}`}
            />
          </button>
        </div>
        <div className="flex-1 min-w-0">
          {label && (
            <label
              className={`text-sm font-medium ${
                disabled ? "text-gray-400" : "text-gray-700"
              }`}
            >
              {label}
            </label>
          )}
          {description && (
            <p
              className={`mt-1 text-sm ${
                disabled ? "text-gray-400" : "text-gray-500"
              }`}
            >
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
