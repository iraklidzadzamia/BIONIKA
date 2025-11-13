import React from "react";

const ToggleButton = React.forwardRef(
  (
    {
      children,
      active = false,
      variant = "default",
      size = "md",
      disabled = false,
      className = "",
      type = "button",
      onClick,
      fullWidth = false,
      icon,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed border-2";

    const variantClasses = {
      default: active
        ? "border-gray-300 bg-gray-100 text-gray-900 shadow-sm"
        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50",
      primary: active
        ? "border-primary-500 bg-primary-50 text-primary-700 shadow-sm"
        : "border-gray-200 bg-white text-gray-600 hover:border-primary-300 hover:bg-primary-50",
      success: active
        ? "border-green-500 bg-green-50 text-green-700 shadow-sm"
        : "border-gray-200 bg-white text-gray-600 hover:border-green-300 hover:bg-green-50",
      danger: active
        ? "border-red-500 bg-red-50 text-red-700 shadow-sm"
        : "border-gray-200 bg-white text-gray-600 hover:border-red-300 hover:bg-red-50",
    };

    const sizeClasses = {
      sm: "px-3 py-2 text-sm",
      md: "px-4 py-2.5 text-base",
      lg: "px-6 py-3 text-lg",
      xl: "px-8 py-4 text-xl",
    };

    const widthClasses = fullWidth ? "w-full" : "";
    const finalClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClasses} ${className}`;

    return (
      <button
        ref={ref}
        type={type}
        className={finalClasses}
        disabled={disabled}
        onClick={onClick}
        aria-pressed={active}
        {...props}
      >
        {icon && <span className="mr-2">{icon}</span>}
        {children}
      </button>
    );
  }
);

ToggleButton.displayName = "ToggleButton";

export default ToggleButton;
