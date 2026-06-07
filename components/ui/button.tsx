import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /**
   * Quand true, injecte les classes du bouton dans le premier enfant React.
   * Évite d'imbriquer une <a> dans une <button> (HTML invalide).
   */
  asChild?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-nd-sage text-white hover:bg-nd-sage-deep focus-visible:ring-nd-sage border-transparent",
  secondary:
    "bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-400 border-nd-line",
  ghost:
    "bg-transparent text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-400 border-transparent",
  destructive:
    "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 border-transparent",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-9 px-4 text-sm gap-2",
  lg: "h-10 px-5 text-sm gap-2",
};

function buildButtonClass(
  variant: ButtonVariant,
  size: ButtonSize,
  extra?: string
) {
  return cn(
    "inline-flex items-center justify-center font-medium rounded-full border",
    "transition-colors duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    "disabled:opacity-50 disabled:pointer-events-none",
    "cursor-pointer select-none",
    variantClasses[variant],
    sizeClasses[size],
    extra
  );
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      asChild = false,
      children,
      ...props
    },
    ref
  ) => {
    const resolvedClass = buildButtonClass(variant, size, className);

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<
        React.HTMLAttributes<HTMLElement>
      >;
      return React.cloneElement(child, {
        ...child.props,
        className: cn(resolvedClass, child.props.className),
      });
    }

    return (
      <button
        ref={ref}
        disabled={disabled ?? loading}
        aria-busy={loading}
        className={resolvedClass}
        {...props}
      >
        {loading ? (
          <svg
            className="animate-spin h-4 w-4"
            aria-hidden="true"
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
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        ) : (
          children
        )}
      </button>
    );
  }
);
Button.displayName = "Button";
