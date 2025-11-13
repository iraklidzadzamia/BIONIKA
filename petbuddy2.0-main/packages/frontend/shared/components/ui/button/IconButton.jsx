import React from "react";

const IconButton = React.forwardRef(
  (
    {
      children,
      variant = "ghost",
      size = "md",
      disabled = false,
      className = "",
      type = "button",
      onClick,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      "inline-flex items-center justify-center rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

    const variantClasses = {
      ghost:
        "text-gray-600 hover:bg-gray-50 hover:text-gray-900 focus:ring-gray-200",
      primary:
        "text-primary-600 hover:bg-primary-50 hover:text-primary-700 focus:ring-primary-200",
      danger:
        "text-red-600 hover:bg-red-50 hover:text-red-700 focus:ring-red-200",
      success:
        "text-green-600 hover:bg-green-50 hover:text-green-700 focus:ring-green-200",
      warning:
        "text-yellow-600 hover:bg-yellow-50 hover:text-yellow-700 focus:ring-yellow-200",
    };

    const sizeClasses = {
      sm: "p-2",
      md: "p-2.5",
      lg: "p-3",
      xl: "p-4",
    };

    const finalClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

    return (
      <button
        ref={ref}
        type={type}
        className={finalClasses}
        disabled={disabled}
        onClick={onClick}
        {...props}
      >
        {children}
      </button>
    );
  }
);

IconButton.displayName = "IconButton";

export default IconButton;
