"use client";
import React from "react";
import {
  isStep1Complete,
  isStep2Complete,
  isStep3Complete,
} from "@/shared/utils/bookingValidation";

const StepIndicator = ({ step, setStep, newCustomer, newPet, bookingData }) => {
  const steps = [
    { number: 1, label: "Pet Info" },
    { number: 2, label: "Service" },
    { number: 3, label: "Staff & Time" },
    { number: 4, label: "Confirm" },
  ];

  const step1Complete = isStep1Complete(newCustomer, newPet);
  const step2Complete = isStep2Complete(bookingData, newCustomer, newPet);
  const step3Complete = isStep3Complete(bookingData, newCustomer, newPet);

  return (
    <div className="flex items-center justify-center mb-6 px-4">
      {steps.map((s, index) => {
        const stepNumber = s.number;
        const canNavigate =
          stepNumber <= step ||
          (stepNumber === 2 && step1Complete) ||
          (stepNumber === 3 && step2Complete) ||
          (stepNumber === 4 && step3Complete);
        const isDone = stepNumber < step;
        const isCurrent = stepNumber === step;
        return (
          <div key={stepNumber} className="flex items-center">
            {/* Step Circle */}
            <div className="relative">
              <button
                type="button"
                onClick={() => canNavigate && setStep(stepNumber)}
                disabled={!canNavigate}
                className={`relative w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-200 ${
                  isDone
                    ? "bg-green-500 text-white shadow-lg shadow-green-500/25"
                    : isCurrent
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25 scale-110"
                    : canNavigate
                    ? "bg-gray-200 text-gray-600 hover:bg-gray-300"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                } ${canNavigate && !isCurrent ? "hover:scale-105" : ""}`}
                aria-current={isCurrent ? "step" : undefined}
              >
                {isDone ? (
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  stepNumber
                )}
              </button>

              {/* Step Label */}
              <div className="absolute top-10 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                <span
                  className={`text-xs font-medium ${
                    isDone || isCurrent ? "text-gray-900" : "text-gray-500"
                  }`}
                >
                  {s.label}
                </span>
              </div>
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div className="flex-1 mx-3">
                <div
                  className={`h-0.5 transition-colors duration-200 ${
                    isDone ? "bg-green-500" : "bg-gray-200"
                  }`}
                  style={{ minWidth: "40px" }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StepIndicator;

