import React from "react";

const Card = React.forwardRef(
  (
    {
      children,
      className = "",
      variant = "default",
      padding = "default",
      ...props
    },
    ref
  ) => {
    const baseClasses =
      "bg-white rounded-2xl border border-neutral-100 shadow-soft";

    const variantClasses = {
      default: "bg-white",
      glass: "bg-white/80 backdrop-blur-sm border-white/20",
      elevated: "bg-white shadow-luxury",
      outline: "bg-transparent border-2 border-neutral-200",
    };

    const paddingClasses = {
      none: "",
      sm: "p-4",
      default: "p-6",
      lg: "p-8",
      xl: "p-10",
    };

    const finalClasses = `${baseClasses} ${variantClasses[variant]} ${paddingClasses[padding]} ${className}`;

    return (
      <div ref={ref} className={finalClasses} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export default Card;
