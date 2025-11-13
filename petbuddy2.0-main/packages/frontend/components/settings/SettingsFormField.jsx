/**
 * Reusable form field wrapper for settings forms
 * Provides consistent layout for form fields
 */
export default function SettingsFormField({
  label,
  description,
  required = false,
  children,
  fullWidth = false,
}) {
  return (
    <div className={fullWidth ? "col-span-full" : ""}>
      <div className="mb-2">
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {description && (
          <p className="mt-1 text-xs text-gray-500">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}
