import React from "react";

const Button = React.forwardRef(
  (
    {
      children,
      variant = "primary",
      size = "md",
      disabled = false,
      loading = false,
      className = "",
      type = "button",
      onClick,
      fullWidth = false,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]";

    const variantClasses = {
      primary:
        "bg-gradient-to-r from-primary-600 to-primary-700 text-white hover:from-primary-700 hover:to-primary-800 focus:ring-primary-200 shadow-soft hover:shadow-luxury",
      secondary:
        "bg-gradient-to-r from-neutral-100 to-neutral-200 text-neutral-800 hover:from-neutral-200 hover:to-neutral-300 focus:ring-neutral-200 border-2 border-neutral-200",
      outline:
        "border-2 border-primary-500 bg-white text-primary-600 hover:bg-primary-50 focus:ring-primary-200",
      luxury:
        "bg-gradient-to-r from-luxury-500 to-luxury-600 text-white hover:from-luxury-600 hover:to-luxury-700 focus:ring-luxury-200 shadow-soft hover:shadow-luxury",
      danger:
        "bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 focus:ring-red-200 shadow-soft",
      ghost:
        "text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100 focus:ring-neutral-200",
    };

    const sizeClasses = {
      sm: "px-4 py-2.5 text-sm",
      md: "px-6 py-3 text-base",
      lg: "px-8 py-4 text-lg",
      xl: "px-10 py-5 text-xl",
    };

    const widthClasses = fullWidth ? "w-full" : "";
    const finalClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClasses} ${className}`;

    return (
      <button
        ref={ref}
        type={type}
        className={finalClasses}
        disabled={disabled || loading}
        onClick={onClick}
        {...props}
      >
        {loading && (
          <svg
            className={`animate-spin -ml-1 mr-2 ${
              size === "xl" ? "h-5 w-5" : "h-4 w-4"
            }`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
