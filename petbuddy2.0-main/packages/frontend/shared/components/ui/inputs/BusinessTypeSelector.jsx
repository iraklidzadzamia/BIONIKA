"use client";
import React from "react";
import { CheckIcon } from "@heroicons/react/24/outline";
import {
  ScissorsIcon,
  HeartIcon,
  HomeIcon,
  BuildingStorefrontIcon,
  BeakerIcon,
  AcademicCapIcon,
} from "@heroicons/react/24/outline";

const BUSINESS_TYPES = [
  {
    id: "grooming",
    label: "Grooming Salon",
    icon: ScissorsIcon,
    description: "Pet grooming and styling services",
  },
  {
    id: "vet",
    label: "Veterinary Clinic",
    icon: HeartIcon,
    description: "Medical care and health services",
  },
  {
    id: "boarding",
    label: "Pet Boarding",
    icon: HomeIcon,
    description: "Overnight pet care and lodging",
  },
  {
    id: "daycare",
    label: "Pet Daycare",
    icon: BuildingStorefrontIcon,
    description: "Daily pet care and socialization",
  },
  {
    id: "training",
    label: "Training Center",
    icon: AcademicCapIcon,
    description: "Pet training and behavior services",
  },
  {
    id: "other",
    label: "Other Services",
    icon: BeakerIcon,
    description: "Other pet-related services",
  },
];

const BusinessTypeSelector = ({
  value = [],
  onChange,
  label = "Business Type",
  required = false,
  error,
  maxSelect,
  className = "",
}) => {
  const handleToggle = (typeId) => {
    const currentValues = Array.isArray(value) ? value : [];
    const isSelected = currentValues.includes(typeId);

    let newValues;
    if (isSelected) {
      newValues = currentValues.filter((id) => id !== typeId);
    } else {
      if (maxSelect && currentValues.length >= maxSelect) {
        // If max limit reached, replace the first item
        newValues = [...currentValues.slice(1), typeId];
      } else {
        newValues = [...currentValues, typeId];
      }
    }

    onChange?.(newValues);
  };

  return (
    <div className={`relative ${className}`}>
      {label && (
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-700 ml-1">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <div className="flex items-center gap-2">
            {value?.length > 0 && (
              <span className="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-1 rounded-lg">
                {value.length} selected
              </span>
            )}
            {maxSelect && (
              <span className="text-xs text-gray-500 font-normal">
                (Max: {maxSelect})
              </span>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {BUSINESS_TYPES.map((type) => {
          const isSelected = value?.includes(type.id);
          const Icon = type.icon;

          return (
            <button
              key={type.id}
              type="button"
              onClick={() => handleToggle(type.id)}
              className={`
                relative p-4 rounded-xl border-2 text-left transition-all duration-200
                hover:shadow-md active:scale-[0.98]
                ${
                  isSelected
                    ? "border-primary-500 bg-primary-50 shadow-sm"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }
                ${error ? "border-red-300" : ""}
              `}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`
                  flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-colors
                  ${
                    isSelected
                      ? "bg-primary-100 text-primary-600"
                      : "bg-gray-100 text-gray-500"
                  }
                `}
                >
                  <Icon className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3
                      className={`text-sm font-semibold ${
                        isSelected ? "text-primary-900" : "text-gray-800"
                      }`}
                    >
                      {type.label}
                    </h3>
                  </div>
                  <p
                    className={`text-xs ${
                      isSelected ? "text-primary-700" : "text-gray-500"
                    }`}
                  >
                    {type.description}
                  </p>
                </div>

                {isSelected && (
                  <div className="flex-shrink-0">
                    <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center">
                      <CheckIcon className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}
              </div>
            </button>
          );
        })}
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
};

export default BusinessTypeSelector;
