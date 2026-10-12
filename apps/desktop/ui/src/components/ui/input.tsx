import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md px-3 py-2",
          "bg-graphite-2 border border-stroke-hairline",
          "text-porcelain placeholder:text-fg-dim",
          "font-mono text-sm",
          "focus:outline-none focus:border-accent-teal focus:shadow-[0_0_0_1px_rgba(20,184,166,0.35)]",
          "hover:border-border-medium",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "transition-all duration-200",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
