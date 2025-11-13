import React from "react";
import { Loader } from "../index";

const PageLoader = ({
  type = "spinner",
  size = "lg",
  text = "Loading...",
  variant = "default",
  layout = "centered",
  className = "",
}) => {
  const layoutClasses = {
    centered: "min-h-screen flex items-center justify-center",
    top: "min-h-screen flex items-start justify-center pt-32",
    "top-left": "min-h-screen flex items-start justify-start p-8",
    "top-right": "min-h-screen flex items-start justify-end p-8",
    "bottom-left": "min-h-screen flex items-end justify-start p-8",
    "bottom-right": "min-h-screen flex items-end justify-end p-8",
  };

  return (
    <div className={`${layoutClasses[layout]} ${className}`}>
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
            className={`mt-4 text-${
              variant === "default" ? "gray" : variant
            }-600 text-lg`}
          >
            {text}
          </p>
        )}
      </div>
    </div>
  );
};

export default PageLoader;
