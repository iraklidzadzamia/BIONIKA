import { useState, useCallback } from "react";
import { getFieldErrors } from "@/shared/utils/validation";

/**
 * Custom hook for form validation using Zod schemas
 *
 * @param {Object} schema - Zod validation schema
 * @param {Object} initialValues - Initial form values
 * @returns {Object} Form state and handlers
 *
 * @example
 * const { values, errors, handleChange, handleSubmit, setFieldValue, reset } = useValidatedForm(
 *   loginSchema,
 *   { email: '', password: '' }
 * );
 */
export function useValidatedForm(schema, initialValues = {}) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle input change
  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    const fieldValue = type === "checkbox" ? checked : value;

    setValues((prev) => ({
      ...prev,
      [name]: fieldValue,
    }));

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  }, [errors]);

  // Set a specific field value (useful for custom inputs)
  const setFieldValue = useCallback((name, value) => {
    setValues((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  }, [errors]);

  // Set multiple field values at once
  const setFieldValues = useCallback((fieldsObject) => {
    setValues((prev) => ({
      ...prev,
      ...fieldsObject,
    }));
  }, []);

  // Handle field blur (mark as touched)
  const handleBlur = useCallback((e) => {
    const { name } = e.target;
    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }));
  }, []);

  // Validate the form
  const validate = useCallback(() => {
    try {
      schema.parse(values);
      setErrors({});
      return true;
    } catch (error) {
      const fieldErrors = getFieldErrors(error);
      setErrors(fieldErrors);
      return false;
    }
  }, [schema, values]);

  // Handle form submission
  const handleSubmit = useCallback((onSubmit) => {
    return async (e) => {
      if (e) {
        e.preventDefault();
      }

      setIsSubmitting(true);

      try {
        // Validate the form
        schema.parse(values);
        setErrors({});

        // Call the onSubmit callback with validated data
        await onSubmit(values);
      } catch (error) {
        if (error.errors) {
          // Zod validation error
          const fieldErrors = getFieldErrors(error);
          setErrors(fieldErrors);
        } else {
          // Other error (e.g., API error)
          throw error;
        }
      } finally {
        setIsSubmitting(false);
      }
    };
  }, [schema, values]);

  // Reset form to initial values
  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  // Set form errors manually (useful for server-side validation)
  const setFormErrors = useCallback((errorObject) => {
    setErrors(errorObject);
  }, []);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    setFieldValues,
    setFormErrors,
    validate,
    reset,
  };
}
