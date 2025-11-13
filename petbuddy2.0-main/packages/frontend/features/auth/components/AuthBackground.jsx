import React from "react";

const AuthBackground = ({ children, className = "" }) => {
  return (
    <div
      className={`min-h-screen bg-gradient-to-br from-primary-50 via-white to-luxury-50 relative overflow-hidden ${className}`}
    >
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating orbs - hidden on very small screens */}
        <div className="absolute top-20 left-10 w-48 h-48 sm:w-72 sm:h-72 bg-gradient-to-r from-primary-200/30 to-luxury-200/30 rounded-full blur-3xl animate-pulse-slow hidden sm:block"></div>
        <div
          className="absolute bottom-20 right-10 w-64 h-64 sm:w-96 sm:h-96 bg-gradient-to-r from-luxury-200/20 to-primary-200/20 rounded-full blur-3xl animate-pulse-slow hidden sm:block"
          style={{ animationDelay: "2s" }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-56 h-56 sm:w-80 sm:h-80 bg-gradient-to-r from-primary-100/20 to-luxury-100/20 rounded-full blur-3xl animate-pulse-slow hidden sm:block"
          style={{ animationDelay: "4s" }}
        ></div>

        {/* Grid pattern - hidden on very small screens */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:50px_50px] hidden sm:block"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-2 sm:p-4">
        {children}
      </div>
    </div>
  );
};

export default AuthBackground;
