import React, { useState, useEffect } from "react";
import { Card, Button, ContentLoader, Loader } from "../ui";

const OnboardingGuide = ({ companyId, onComplete }) => {
  const [onboardingData, setOnboardingData] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchOnboardingGuide();
  }, []);

  const fetchOnboardingGuide = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/v1/setup/onboarding");
      if (!response.ok) throw new Error("Failed to fetch onboarding guide");

      const data = await response.json();
      setOnboardingData(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (currentStep < onboardingData.steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    if (onComplete) {
      onComplete();
    }
  };

  if (loading) {
    return (
      <Card className="p-8 text-center">
        <Loader type="spinner" size="lg" variant="primary" />
        <ContentLoader
          type="spinner"
          size="md"
          text="Loading onboarding guide..."
          variant="default"
          layout="centered"
        />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-8 text-center">
        <div className="text-red-600 mb-4">
          <svg
            className="w-16 h-16 mx-auto"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Error Loading Guide
        </h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={fetchOnboardingGuide} variant="outline">
          Try Again
        </Button>
      </Card>
    );
  }

  if (!onboardingData) {
    return null;
  }

  const currentStepData = onboardingData.steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === onboardingData.steps.length - 1;

  return (
    <Card className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center p-6 border-b border-gray-200">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {onboardingData.title}
        </h1>
        <p className="text-gray-600">
          Step {currentStep + 1} of {onboardingData.steps.length}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="px-6 py-4">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${
                ((currentStep + 1) / onboardingData.steps.length) * 100
              }%`,
            }}
          ></div>
        </div>
      </div>

      {/* Current Step Content */}
      <div className="p-6">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <span className="text-2xl font-bold text-blue-600">
              {currentStep + 1}
            </span>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">
            {currentStepData.title}
          </h2>
          <p className="text-gray-600 text-lg mb-4">
            {currentStepData.description}
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800 font-medium">
              💡 {currentStepData.action}
            </p>
          </div>
        </div>

        {/* Tips Section */}
        {isLastStep && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-green-800 mb-3">
              🎯 Pro Tips
            </h3>
            <ul className="space-y-2">
              {onboardingData.tips.map((tip, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-green-600 mr-2">✓</span>
                  <span className="text-green-700">{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center p-6 border-t border-gray-200">
        <Button
          onClick={handlePrevious}
          disabled={isFirstStep}
          variant="outline"
          className={isFirstStep ? "invisible" : ""}
        >
          ← Previous
        </Button>

        <div className="flex space-x-3">
          {!isLastStep ? (
            <Button onClick={handleNext}>Next →</Button>
          ) : (
            <Button
              onClick={handleComplete}
              className="bg-green-600 hover:bg-green-700"
            >
              🎉 Get Started!
            </Button>
          )}
        </div>
      </div>

      {/* Step Indicators */}
      <div className="px-6 pb-6">
        <div className="flex justify-center space-x-2">
          {onboardingData.steps.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStep(index)}
              className={`w-3 h-3 rounded-full transition-colors ${
                index === currentStep
                  ? "bg-blue-600"
                  : index < currentStep
                  ? "bg-green-500"
                  : "bg-gray-300"
              }`}
              aria-label={`Go to step ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </Card>
  );
};

export default OnboardingGuide;
