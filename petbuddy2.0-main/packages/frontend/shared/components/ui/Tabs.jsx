"use client";
import React from "react";

/**
 * Tabs Component - Desktop optimized version
 * For mobile, use custom implementations in parent components
 */
export default function Tabs({
  tabs = [],
  value,
  onChange,
  size = "md",
  className = "",
}) {
  const sizeClasses =
    size === "sm"
      ? "px-3 py-2 text-xs"
      : size === "lg"
      ? "px-5 py-3 text-base"
      : "px-4 py-2.5 text-sm";

  return (
    <div
      className={`inline-flex items-center gap-1 bg-gray-100 rounded-lg p-1 ${className}`}
      role="tablist"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = value === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange && onChange(tab.id)}
            className={`${sizeClasses} rounded-lg font-medium transition-all flex items-center gap-2 ${
              active
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            {Icon && <Icon className="h-4 w-4" />}
            <span className="whitespace-nowrap">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
