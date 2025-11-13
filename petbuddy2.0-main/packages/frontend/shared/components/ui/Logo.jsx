import React from "react";

const Logo = ({ size = "md", className = "" }) => {
  const sizeClasses = {
    sm: "text-xl font-bold",
    md: "text-2xl font-bold",
    lg: "text-3xl font-bold",
    xl: "text-4xl font-bold",
  };

  return (
    <div className={`flex items-center gap-3 ${sizeClasses[size]} ${className}`}>
      <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-luxury-500 rounded-xl flex items-center justify-center shadow-soft">
        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      </div>
      <span className="bg-gradient-to-r from-primary-600 to-luxury-600 bg-clip-text text-transparent">
        PetBuddy
      </span>
    </div>
  );
};

export default Logo;
