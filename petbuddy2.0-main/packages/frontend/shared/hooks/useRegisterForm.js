import { useEffect, useState, useCallback } from "react";
import { registerCompanySchema } from "@/shared/utils/validation";
import { getFieldErrors } from "@/shared/utils/validation";

/**
 * Custom hook for registration form with auto-save and validation
 */
export function useRegisterForm() {
  const [company, setCompany] = useState({
    name: "",
    email: "",
    timezone: "UTC",
    businessTypes: [],
    locations: [
      {
        label: "Main",
        address: "",
        googleLocationUrl: "",
        phone: "",
        timezone: "",
        isMain: true,
      },
    ],
  });

  const [user, setUser] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    color: "#000000",
  });

  const [tosAccepted, setTosAccepted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  // Load from localStorage on mount and detect timezone
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const savedData = localStorage.getItem("petbuddy_registration");

      if (savedData) {
        const { company: savedCompany, user: savedUser } =
          JSON.parse(savedData);
        if (savedCompany) {
          setCompany({
            ...savedCompany,
            timezone: tz || savedCompany.timezone,
          });
        }
        if (savedUser) setUser(savedUser);
      } else if (tz) {
        setCompany((c) => ({ ...c, timezone: tz }));
      }
    } catch (_) {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) setCompany((c) => ({ ...c, timezone: tz }));
    }
  }, []);

  // Auto-save to localStorage when form data changes
  useEffect(() => {
    try {
      const dataToSave = {
        company: { ...company },
        user: { ...user, password: undefined }, // Don't save password
      };
      localStorage.setItem("petbuddy_registration", JSON.stringify(dataToSave));
    } catch (_) {
      // Ignore localStorage errors
    }
  }, [company, user]);

  // Validate form using Zod schema
  const validate = useCallback(() => {
    try {
      const formData = {
        company,
        user: {
          name: user.name,
          email: user.email,
          password: user.password,
          phone: user.phone || "",
          color: user.color,
          tosAccepted,
        },
      };

      registerCompanySchema.parse(formData);
      setFieldErrors({});
      return { isValid: true, errors: {} };
    } catch (error) {
      const errors = getFieldErrors(error);
      setFieldErrors(errors);
      return { isValid: false, errors };
    }
  }, [company, user, tosAccepted]);

  // Clear error for a specific field
  const clearFieldError = useCallback((fieldPath) => {
    setFieldErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldPath];
      return newErrors;
    });
  }, []);

  // Update company field
  const updateCompany = useCallback(
    (field, value) => {
      setCompany((prev) => ({ ...prev, [field]: value }));
      clearFieldError(`company.${field}`);
    },
    [clearFieldError]
  );

  // Update user field
  const updateUser = useCallback(
    (field, value) => {
      setUser((prev) => ({ ...prev, [field]: value }));
      clearFieldError(`user.${field}`);
    },
    [clearFieldError]
  );

  // Update location at index
  const updateLocation = useCallback(
    (index, field, value) => {
      setCompany((prev) => {
        const newLocations = [...prev.locations];
        newLocations[index] = { ...newLocations[index], [field]: value };
        return { ...prev, locations: newLocations };
      });
      clearFieldError(`company.locations.${index}.${field}`);
    },
    [clearFieldError]
  );

  // Add location
  const addLocation = useCallback(() => {
    setCompany((prev) => ({
      ...prev,
      locations: [
        ...prev.locations,
        {
          label: `Location ${prev.locations.length + 1}`,
          address: "",
          googleLocationUrl: "",
          phone: "",
          timezone: prev.timezone,
          isMain: prev.locations.length === 0,
        },
      ],
    }));
  }, []);

  // Remove location at index
  const removeLocation = useCallback((index) => {
    setCompany((prev) => ({
      ...prev,
      locations: prev.locations.filter((_, i) => i !== index),
    }));
  }, []);

  // Set main location
  const setMainLocation = useCallback((index) => {
    setCompany((prev) => {
      const newLocations = prev.locations.map((l, i) => ({
        ...l,
        isMain: i === index,
      }));
      // Ensure at least one main location
      if (!newLocations.some((l) => l.isMain)) {
        newLocations[0].isMain = true;
      }
      return { ...prev, locations: newLocations };
    });
  }, []);

  // Clear saved registration data
  const clearSavedData = useCallback(() => {
    try {
      localStorage.removeItem("petbuddy_registration");
    } catch (_) {
      // Ignore errors
    }
  }, []);

  // Get form data ready for submission
  const getFormData = useCallback(() => {
    const fullName = user.name.trim();
    // Omit legacy fields that may exist in saved localStorage
    const {
      address: _omitAddress,
      phone: _omitPhone,
      ...companyPayload
    } = company;

    return {
      company: {
        ...companyPayload,
      },
      user: {
        fullName,
        email: user.email.trim(),
        password: user.password,
        phone: user.phone.trim() || undefined,
        color: "#000000", // Always black for manager
      },
    };
  }, [company, user]);

  return {
    // State
    company,
    user,
    tosAccepted,
    fieldErrors,

    // Actions
    setCompany,
    setUser,
    setTosAccepted,
    updateCompany,
    updateUser,
    updateLocation,
    addLocation,
    removeLocation,
    setMainLocation,

    // Validation
    validate,
    clearFieldError,
    setFieldErrors,

    // Utilities
    clearSavedData,
    getFormData,
  };
}
