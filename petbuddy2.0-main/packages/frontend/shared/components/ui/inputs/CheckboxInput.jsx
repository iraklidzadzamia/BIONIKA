"use client";
import React from "react";
import { CheckIcon } from "@heroicons/react/24/outline";

const CheckboxInput = React.forwardRef(
  (
    {
      className = "",
      error,
      label,
      required = false,
      description,
      disabled = false,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      "w-5 h-5 border-2 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all duration-200";

    const stateClasses = disabled
      ? "bg-gray-100 border-gray-300 cursor-not-allowed"
      : error
      ? "border-red-300 focus:ring-red-500"
      : "border-gray-300 hover:border-gray-400 focus:border-primary-500";

    const finalClasses = `${baseClasses} ${stateClasses} ${className}`;

    return (
      <div className="relative">
        <div className="flex items-start gap-3">
          <div className="relative flex items-center">
            <input
              ref={ref}
              type="checkbox"
              className={finalClasses}
              disabled={disabled}
              {...props}
            />
            {props.checked && !disabled && (
              <CheckIcon className="absolute inset-0 w-5 h-5 text-primary-600 pointer-events-none" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            {label && (
              <label
                className={`text-sm font-medium cursor-pointer ${
                  disabled
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-gray-700"
                }`}
                htmlFor={props.id}
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

CheckboxInput.displayName = "CheckboxInput";

export default CheckboxInput;
