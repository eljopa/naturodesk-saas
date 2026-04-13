import * as React from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full rounded-lg border px-3 py-2 text-sm text-slate-900",
          "bg-white placeholder:text-slate-400",
          "transition-colors duration-150",
          "focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-0 focus:border-teal-600",
          "disabled:opacity-50 disabled:bg-slate-50 disabled:cursor-not-allowed",
          error
            ? "border-red-400 focus:ring-red-500 focus:border-red-500"
            : "border-slate-300 hover:border-slate-400",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
