import React from "react";

const Loader = ({
  type = "spinner",
  size = "md",
  text = "Loading...",
  className = "",
  variant = "default",
  fullWidth = false,
  centered = true,
}) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
    xl: "w-12 h-12",
  };

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
    xl: "text-xl",
  };

  const variantClasses = {
    default: "text-gray-600",
    primary: "text-primary-600",
    secondary: "text-gray-500",
    muted: "text-gray-400",
  };

  const containerClasses = `flex items-center justify-center ${fullWidth ? "w-full" : ""} ${className}`;
  const contentClasses = centered ? "text-center" : "";

  // Spinner Loader
  if (type === "spinner") {
    return (
      <div className={containerClasses}>
        <div className={`animate-spin ${sizeClasses[size]} ${variantClasses[variant]}`}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            className="w-full h-full"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
      </div>
    );
  }

  // Dots Loader
  if (type === "dots") {
    return (
      <div className={containerClasses}>
        <div className={`flex space-x-1 ${contentClasses}`}>
          <div className={`w-2 h-2 bg-current rounded-full animate-bounce ${variantClasses[variant]}`} style={{ animationDelay: '0ms' }}></div>
          <div className={`w-2 h-2 bg-current rounded-full animate-bounce ${variantClasses[variant]}`} style={{ animationDelay: '150ms' }}></div>
          <div className={`w-2 h-2 bg-current rounded-full animate-bounce ${variantClasses[variant]}`} style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    );
  }

  // Pulse Loader
  if (type === "pulse") {
    return (
      <div className={containerClasses}>
        <div className={`w-4 h-4 bg-current rounded-full animate-pulse ${variantClasses[variant]}`}></div>
      </div>
    );
  }

  // Text Loader
  if (type === "text") {
    return (
      <div className={containerClasses}>
        <p className={`${textSizeClasses[size]} ${variantClasses[variant]} ${contentClasses}`}>
          {text}
        </p>
      </div>
    );
  }

  // Skeleton Loader
  if (type === "skeleton") {
    return (
      <div className={containerClasses}>
        <div className={`animate-pulse space-y-3 ${fullWidth ? "w-full" : ""}`}>
          <div className={`bg-gray-200 rounded ${size === "sm" ? "h-4" : size === "md" ? "h-6" : size === "lg" ? "h-8" : "h-12"}`}></div>
          <div className={`bg-gray-200 rounded ${size === "sm" ? "h-3" : size === "md" ? "h-4" : size === "lg" ? "h-6" : "h-8"}`} style={{ width: '80%' }}></div>
          <div className={`bg-gray-200 rounded ${size === "sm" ? "h-3" : size === "md" ? "h-4" : size === "lg" ? "h-6" : "h-8"}`} style={{ width: '60%' }}></div>
        </div>
      </div>
    );
  }

  // Card Skeleton Loader
  if (type === "card-skeleton") {
    return (
      <div className={containerClasses}>
        <div className={`animate-pulse space-y-4 ${fullWidth ? "w-full" : ""}`}>
          <div className="bg-gray-200 rounded-lg h-32"></div>
          <div className="space-y-2">
            <div className="bg-gray-200 rounded h-4 w-3/4"></div>
            <div className="bg-gray-200 rounded h-4 w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  // Table Skeleton Loader
  if (type === "table-skeleton") {
    return (
      <div className={containerClasses}>
        <div className={`animate-pulse space-y-3 ${fullWidth ? "w-full" : ""}`}>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex space-x-4">
              <div className="bg-gray-200 rounded h-4 w-1/4"></div>
              <div className="bg-gray-200 rounded h-4 w-1/3"></div>
              <div className="bg-gray-200 rounded h-4 w-1/6"></div>
              <div className="bg-gray-200 rounded h-4 w-1/5"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Default to spinner
  return (
    <div className={containerClasses}>
      <div className={`animate-spin ${sizeClasses[size]} ${variantClasses[variant]}`}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          className="w-full h-full"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
    </div>
  );
};

export default Loader;
