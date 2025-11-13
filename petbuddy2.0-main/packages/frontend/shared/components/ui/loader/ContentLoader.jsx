import React from "react";
import { Loader } from "../index";

const ContentLoader = ({
  type = "spinner",
  size = "md",
  text = "Loading...",
  variant = "default",
  layout = "centered",
  className = "",
  padding = "md",
  fullWidth = false,
}) => {
  const layoutClasses = {
    centered: "flex items-center justify-center",
    left: "flex items-center justify-start",
    right: "flex items-center justify-end",
    top: "flex items-start justify-center",
    bottom: "flex items-end justify-center",
  };

  const paddingClasses = {
    none: "",
    sm: "p-2",
    md: "p-4",
    lg: "p-6",
    xl: "p-8",
  };

  return (
    <div
      className={`${layoutClasses[layout]} ${paddingClasses[padding]} ${
        fullWidth ? "w-full" : ""
      } ${className}`}
    >
      <div className="text-center">
        <Loader
          type={type}
          size={size}
          text={text}
          variant={variant}
          centered={true}
        />
        {text && type !== "text" && (
          <p
            className={`mt-2 text-${
              variant === "default" ? "gray" : variant
            }-600 text-sm`}
          >
            {text}
          </p>
        )}
      </div>
    </div>
  );
};

export default ContentLoader;
