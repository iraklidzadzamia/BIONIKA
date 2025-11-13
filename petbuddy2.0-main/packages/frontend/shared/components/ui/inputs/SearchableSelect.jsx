"use client";
import React, { useState, useRef, useEffect } from "react";
import {
  ChevronDownIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

const SearchableSelect = React.forwardRef(
  (
    {
      className = "",
      error,
      label,
      icon: Icon,
      options = [],
      value,
      onChange,
      placeholder = "Search...",
      disabled = false,
      required = false,
      ...props
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [filteredOptions, setFilteredOptions] = useState(options);
    const dropdownRef = useRef(null);

    useEffect(() => {
      setFilteredOptions(options);
    }, [options]);

    useEffect(() => {
      const handleClickOutside = (event) => {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target)
        ) {
          setIsOpen(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSearch = (term) => {
      setSearchTerm(term);
      if (term.trim() === "") {
        setFilteredOptions(options);
      } else {
        const filtered = options.filter((option) =>
          option.label.toLowerCase().includes(term.toLowerCase())
        );
        setFilteredOptions(filtered);
      }
    };

    const handleSelect = (option) => {
      onChange(option.value);
      setSearchTerm("");
      setIsOpen(false);
    };

    const selectedOption = options.find((option) => option.value === value);

    const baseClasses =
      "w-full h-12 px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-500 transition-all duration-200 text-base bg-white cursor-pointer";

    const errorClasses = error
      ? "border-red-300 focus:ring-red-100 focus:border-red-500"
      : "border-neutral-200 hover:border-neutral-300";

    const disabledClasses = disabled
      ? "bg-gray-50 text-gray-400 cursor-not-allowed"
      : "";

    const finalClasses = `${baseClasses} ${errorClasses} ${disabledClasses} ${className}`;

    return (
      <div className="relative" ref={dropdownRef}>
        {label && (
          <label className="block text-sm font-medium text-neutral-700 mb-2 ml-1 leading-5">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
              <Icon className="w-5 h-5" />
            </div>
          )}
          <button
            type="button"
            ref={ref}
            className={`${finalClasses} ${Icon ? "pl-12" : ""} text-left`}
            onClick={() => !disabled && setIsOpen(!isOpen)}
            disabled={disabled}
            {...props}
          >
            <span
              className={
                selectedOption ? "text-neutral-900" : "text-neutral-400"
              }
            >
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
              <ChevronDownIcon
                className={`w-5 h-5 transition-transform ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </div>
          </button>
        </div>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border-2 border-neutral-200 rounded-xl shadow-lg max-h-60 overflow-hidden">
            {/* Search Input */}
            <div className="p-3 border-b border-neutral-200">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  className="w-full pl-10 pr-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            {/* Options List */}
            <div className="max-h-48 overflow-y-auto">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`w-full px-4 py-3 text-left hover:bg-neutral-50 transition-colors ${
                      value === option.value
                        ? "bg-primary-50 text-primary-700"
                        : "text-neutral-700"
                    }`}
                    onClick={() => handleSelect(option)}
                  >
                    {option.label}
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-neutral-500 text-sm text-center">
                  No options found
                </div>
              )}
            </div>
          </div>
        )}

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

SearchableSelect.displayName = "SearchableSelect";

export default SearchableSelect;
