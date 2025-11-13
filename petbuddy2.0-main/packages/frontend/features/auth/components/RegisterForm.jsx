"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { useRegisterCompanyMutation } from "@/core/api/authApi";
import { setSession } from "@/core/store/slices/authSlice";
import { useRegisterForm } from "@/shared/hooks/useRegisterForm";
import {
  Card,
  Button,
  Input,
  EmailInput,
  PasswordInput,
  PhoneInput,
  ColorInput,
  BusinessTypeSelector,
  Tooltip,
} from "@/ui";
import {
  BuildingOfficeIcon,
  MapPinIcon,
  ClockIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";

export default function RegisterForm() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [registerCompany, { isLoading }] = useRegisterCompanyMutation();

  const {
    company,
    user,
    tosAccepted,
    fieldErrors,
    setTosAccepted,
    updateCompany,
    updateUser,
    updateLocation,
    addLocation,
    removeLocation,
    setMainLocation,
    validate,
    clearSavedData,
    getFormData,
  } = useRegisterForm();

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validate using Zod schema
    const { isValid, errors } = validate();

    if (!isValid) {
      const errorCount = Object.keys(errors).length;
      const firstError = Object.values(errors)[0];
      setError(
        errorCount > 0
          ? `Please fix ${errorCount} field(s): ${firstError}`
          : "Please check all required fields"
      );
      // Scroll to first error
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    try {
      const payload = getFormData();
      const result = await registerCompany(payload).unwrap();
      clearSavedData();

      // Auto-login: Set session in Redux store
      dispatch(
        setSession({
          user: result.user,
          accessToken: result.accessToken,
          tokenExpiry: result.tokenExpiry,
          company: result.company,
        })
      );

      setSuccess("Registration successful! Redirecting to dashboard...");
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch (err) {
      // Handle validation errors from backend
      if (err?.data?.errors) {
        const backendErrors = err.data.errors
          .map((e) => e.msg || e.message)
          .join(", ");
        setError(`Validation error: ${backendErrors}`);
      } else if (err?.data?.error?.message) {
        setError(err.data.error.message);
      } else if (err?.message) {
        setError(err.message);
      } else {
        setError("Registration failed. Please try again.");
      }

      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <Card className="animate-slide-up">
      <form onSubmit={onSubmit} className="space-y-6 sm:space-y-8">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-neutral-800 mb-4 sm:mb-6 flex items-center gap-2">
            <BuildingOfficeIcon className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" />
            Company Information
          </h2>

          <div className="space-y-6">
            <BusinessTypeSelector
              label="What type of pet business are you?"
              value={company.businessTypes}
              onChange={(types) => updateCompany("businessTypes", types)}
              error={fieldErrors["company.businessTypes"]}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mt-6">
            <Input
              label="Company Name"
              placeholder="Enter company name"
              value={company.name}
              onChange={(e) => updateCompany("name", e.target.value)}
              icon={BuildingOfficeIcon}
              error={fieldErrors["company.name"]}
              required
            />

            <EmailInput
              label="Company Email"
              placeholder="Enter company email"
              value={company.email}
              onChange={(e) => updateCompany("email", e.target.value)}
              error={fieldErrors["company.email"]}
              required
            />

            {/* Multiple Locations (optional) */}
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-neutral-800">
                  Locations (you can add multiple)
                </label>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={addLocation}
                  className="text-xs"
                >
                  <PlusIcon className="h-4 w-4 mr-1" /> Add Location
                </Button>
              </div>
              {fieldErrors["company.locations"] && (
                <div className="text-xs text-red-600 mb-2">
                  {fieldErrors["company.locations"]}
                </div>
              )}
              <div className="space-y-2">
                {company.locations.map((loc, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-3"
                  >
                    <Input
                      label="Label"
                      value={loc.label}
                      onChange={(e) =>
                        updateLocation(idx, "label", e.target.value)
                      }
                      required
                    />
                    <Input
                      label="Address"
                      placeholder="Enter location address"
                      value={loc.address}
                      onChange={(e) =>
                        updateLocation(idx, "address", e.target.value)
                      }
                      icon={MapPinIcon}
                      required
                    />
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <label className="block text-sm font-medium text-gray-700 ml-1 leading-5">
                          Google Maps URL
                        </label>
                        <Tooltip content="Open Google Maps, search for your location, click Share, then copy the link"></Tooltip>
                      </div>
                      <Input
                        placeholder="Paste Google Maps link"
                        value={loc.googleLocationUrl}
                        onChange={(e) =>
                          updateLocation(
                            idx,
                            "googleLocationUrl",
                            e.target.value
                          )
                        }
                      />
                    </div>
                    <PhoneInput
                      label="Phone (optional)"
                      value={loc.phone || ""}
                      onValueChange={(e164) =>
                        updateLocation(idx, "phone", e164)
                      }
                      defaultCountry="GE"
                    />
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={!!loc.isMain}
                        onChange={(e) =>
                          e.target.checked && setMainLocation(idx)
                        }
                      />
                      Set as main
                    </label>
                    {company.locations.length > 1 && (
                      <Button
                        type="button"
                        variant="danger"
                        onClick={() => removeLocation(idx)}
                        className="text-xs"
                      >
                        <TrashIcon className="h-4 w-4 mr-1" /> Remove
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-neutral-800 mb-4 sm:mb-6 flex items-center gap-2">
            <UserIcon className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" />
            Manager Account
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <Input
              label="Name"
              placeholder="Enter your full name"
              value={user.name}
              onChange={(e) => updateUser("name", e.target.value)}
              icon={UserIcon}
              error={fieldErrors["user.name"]}
              required
            />

            <EmailInput
              label="Email Address"
              placeholder="Enter email address"
              value={user.email}
              onChange={(e) => updateUser("email", e.target.value)}
              error={fieldErrors["user.email"]}
              required
            />

            <PasswordInput
              label="Password"
              placeholder="Min 8 chars with uppercase, lowercase & number"
              value={user.password}
              onChange={(e) => updateUser("password", e.target.value)}
              error={fieldErrors["user.password"]}
              showStrength
              required
            />

            <PhoneInput
              label="Phone Number (optional)"
              placeholder="Enter phone number"
              value={user.phone}
              onValueChange={(e164) => updateUser("phone", e164)}
              error={fieldErrors["user.phone"]}
              defaultCountry="GE"
            />
          </div>
        </div>

        {/* Terms of Service Acceptance */}
        <div className="border-t border-gray-200 pt-6">
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={tosAccepted}
              onChange={(e) => setTosAccepted(e.target.checked)}
              className="mt-1 w-5 h-5 border-2 border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 text-primary-600 cursor-pointer"
            />
            <span className="text-sm text-gray-700 leading-relaxed">
              I agree to the{" "}
              <a
                href="/terms-of-use"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:text-primary-700 underline font-medium"
              >
                Terms of Service
              </a>{" "}
              and{" "}
              <a
                href="/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:text-primary-700 underline font-medium"
              >
                Privacy Policy
              </a>
              <span className="text-red-500 ml-1">*</span>
            </span>
          </label>
          {fieldErrors["user.tosAccepted"] && (
            <p className="mt-2 text-sm text-red-600 flex items-center gap-1 ml-8">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              {fieldErrors["user.tosAccepted"]}
            </p>
          )}
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
            <svg
              className="w-5 h-5 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm flex items-center gap-2">
            <svg
              className="w-5 h-5 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            {success}
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          size="xl"
          fullWidth
          disabled={isLoading}
          loading={isLoading}
        >
          Create PetBuddy Account
        </Button>
      </form>
    </Card>
  );
}
