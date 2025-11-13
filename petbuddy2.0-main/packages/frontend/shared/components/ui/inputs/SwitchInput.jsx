"use client";
import React from "react";

const SwitchInput = React.forwardRef(
  (
    {
      className = "",
      error,
      label,
      required = false,
      description,
      disabled = false,
      size = "md",
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: "w-9 h-5",
      md: "w-11 h-6",
      lg: "w-14 h-7",
    };

    const thumbSizeClasses = {
      sm: "w-4 h-4",
      md: "w-5 h-5",
      lg: "w-6 h-6",
    };

    const baseClasses = `relative inline-flex items-center rounded-full transition-colors duration-200 ease-in-out ${sizeClasses[size]}`;

    const stateClasses = disabled
      ? "bg-gray-200 cursor-not-allowed"
      : error
      ? "bg-red-300 focus:ring-red-500"
      : props.checked
      ? "bg-primary-600 focus:ring-primary-500"
      : "bg-gray-200 hover:bg-gray-300 focus:ring-primary-500";

    const finalClasses = `${baseClasses} ${stateClasses} ${className}`;

    return (
      <div className="relative">
        <div className="flex items-start gap-3">
          <div className="relative flex items-center">
            <button
              ref={ref}
              type="button"
              role="switch"
              aria-checked={props.checked}
              className={finalClasses}
              disabled={disabled}
              onClick={() => {
                if (!disabled && props.onChange) {
                  props.onChange(!props.checked);
                }
              }}
              {...props}
            >
              <span
                className={`${
                  thumbSizeClasses[size]
                } transform transition-transform duration-200 ease-in-out bg-white rounded-full shadow-md ${
                  props.checked
                    ? `translate-x-${
                        size === "sm" ? "4" : size === "md" ? "5" : "7"
                      }`
                    : "translate-x-0"
                }`}
              />
            </button>
          </div>
          <div className="flex-1 min-w-0">
            {label && (
              <label
                className={`text-sm font-medium cursor-pointer ${
                  disabled
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-gray-700"
                }`}
              >
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
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
        {error && (
          <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </p>
        )}
      </div>
    );
  }
);

SwitchInput.displayName = "SwitchInput";

export default SwitchInput;
