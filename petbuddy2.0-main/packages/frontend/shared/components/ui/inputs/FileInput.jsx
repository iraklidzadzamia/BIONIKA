"use client";
import React, { useState, useRef } from "react";
import { PaperClipIcon, XMarkIcon } from "@heroicons/react/24/outline";

const FileInput = React.forwardRef(
  (
    {
      className = "",
      error,
      label,
      required = false,
      accept,
      multiple = false,
      maxSize = 10 * 1024 * 1024, // 10MB default
      onFileSelect,
      ...props
    },
    ref
  ) => {
    const [dragActive, setDragActive] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const fileInputRef = useRef(null);

    const baseClasses =
      "w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-500 transition-all duration-200 text-base bg-white";

    const errorClasses = error
      ? "border-red-300 focus:ring-red-100 focus:border-red-500"
      : "border-gray-200 hover:border-gray-300";

    const dragClasses = dragActive ? "border-primary-500 bg-primary-50" : "";

    const finalClasses = `${baseClasses} ${errorClasses} ${dragClasses} ${className}`;

    const handleDrag = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.type === "dragenter" || e.type === "dragover") {
        setDragActive(true);
      } else if (e.type === "dragleave") {
        setDragActive(false);
      }
    };

    const handleDrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFiles(e.dataTransfer.files);
      }
    };

    const handleFiles = (files) => {
      const validFiles = Array.from(files).filter((file) => {
        if (file.size > maxSize) {
          // File too large, skip it
          return false;
        }
        return true;
      });

      if (multiple) {
        setSelectedFiles((prev) => [...prev, ...validFiles]);
      } else {
        setSelectedFiles(validFiles.slice(0, 1));
      }

      if (onFileSelect) {
        onFileSelect(multiple ? validFiles : validFiles[0]);
      }
    };

    const handleFileInput = (e) => {
      if (e.target.files && e.target.files[0]) {
        handleFiles(e.target.files);
      }
    };

    const removeFile = (index) => {
      const newFiles = selectedFiles.filter((_, i) => i !== index);
      setSelectedFiles(newFiles);
      if (onFileSelect) {
        onFileSelect(multiple ? newFiles : newFiles[0]);
      }
    };

    const formatFileSize = (bytes) => {
      if (bytes === 0) return "0 Bytes";
      const k = 1024;
      const sizes = ["Bytes", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    return (
      <div className="relative">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-2 ml-1">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <div
          className={`${finalClasses} cursor-pointer`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex items-center gap-3">
            <PaperClipIcon className="w-5 h-5 text-gray-400" />
            <div className="flex-1">
              <p className="text-gray-600">
                {dragActive
                  ? "Drop files here"
                  : "Click to select files or drag and drop"}
              </p>
              <p className="text-sm text-gray-400">
                Max file size: {maxSize / (1024 * 1024)}MB
                {accept && ` • Accepted: ${accept}`}
              </p>
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInput}
          {...props}
        />

        {selectedFiles.length > 0 && (
          <div className="mt-3 space-y-2">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <PaperClipIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-700">{file.name}</span>
                  <span className="text-xs text-gray-500">
                    ({formatFileSize(file.size)})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
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

FileInput.displayName = "FileInput";

export default FileInput;
