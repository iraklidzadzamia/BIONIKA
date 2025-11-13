"use client";
import React from "react";
import { SwatchIcon } from "@heroicons/react/24/outline";

const ColorInput = React.forwardRef(
  (
    {
      className = "",
      error,
      label,
      required = false,
      placeholder = "#000000",
      ...props
    },
    ref
  ) => {
    const baseClasses =
      "w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-500 transition-all duration-200 text-base placeholder-neutral-400 bg-white";

    const errorClasses = error
      ? "border-red-300 focus:ring-red-100 focus:border-red-500"
      : "border-gray-200 hover:border-gray-300";

    const finalClasses = `${baseClasses} ${errorClasses} ${className}`;

    return (
      <div className="relative">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-2 ml-1">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <SwatchIcon className="w-5 h-5" />
          </div>
          <input
            ref={ref}
            type="color"
            className={`${finalClasses} pl-12 h-12`}
            placeholder={placeholder}
            {...props}
          />
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

ColorInput.displayName = "ColorInput";

export default ColorInput;
