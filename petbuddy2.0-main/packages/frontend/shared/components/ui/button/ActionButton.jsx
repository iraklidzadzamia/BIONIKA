import React from "react";

const ActionButton = React.forwardRef(
  (
    {
      children,
      action = "primary",
      size = "md",
      disabled = false,
      loading = false,
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
      "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]";

    const actionClasses = {
      save: "bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 focus:ring-green-200 shadow-soft hover:shadow-luxury",
      cancel:
        "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 hover:from-gray-200 hover:to-gray-300 focus:ring-gray-200 border-2 border-gray-200",
      add: "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 focus:ring-blue-200 shadow-soft hover:shadow-luxury",
      edit: "bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 focus:ring-amber-200 shadow-soft hover:shadow-luxury",
      delete:
        "bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 focus:ring-red-200 shadow-soft",
      view: "border-2 border-blue-500 bg-white text-blue-600 hover:bg-blue-50 focus:ring-blue-200",
      close:
        "border-2 border-gray-300 bg-white text-gray-600 hover:bg-gray-50 focus:ring-gray-200",
    };

    const sizeClasses = {
      sm: "px-4 py-2.5 text-sm",
      md: "px-6 py-3 text-base",
      lg: "px-8 py-4 text-lg",
      xl: "px-10 py-5 text-xl",
    };

    const widthClasses = fullWidth ? "w-full" : "";
    const finalClasses = `${baseClasses} ${actionClasses[action]} ${sizeClasses[size]} ${widthClasses} ${className}`;

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
            className="animate-spin -ml-1 mr-2 h-4 w-4"
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
        {icon && !loading && <span className="mr-2">{icon}</span>}
        {children}
      </button>
    );
  }
);

ActionButton.displayName = "ActionButton";

export default ActionButton;
