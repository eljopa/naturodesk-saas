import * as React from "react";
import { cn } from "@/lib/utils";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "w-full rounded-lg border px-3 py-2 text-sm text-slate-900 bg-white",
        "transition-colors duration-150 appearance-none",
        "focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-0 focus:border-teal-600",
        "disabled:opacity-50 disabled:bg-slate-50 disabled:cursor-not-allowed",
        error
          ? "border-red-400 focus:ring-red-500 focus:border-red-500"
          : "border-slate-300 hover:border-slate-400",
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = "Select";
