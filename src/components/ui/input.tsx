import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Unified app input — matches the Categories search field.
 * White bg, 16px radius, soft shadow, gold focus ring.
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex w-full h-12 rounded-[16px] bg-white px-4 text-[14px] font-medium text-[#1F2937]",
          "placeholder:text-[#9CA3AF] placeholder:font-medium",
          "shadow-[0_2px_10px_-4px_rgba(10,31,61,0.08)]",
          "border-0 ring-0 outline-none",
          "transition-[box-shadow,transform] duration-200 ease-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227]/40 focus-visible:shadow-[0_4px_14px_-4px_rgba(10,31,61,0.12)]",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "disabled:cursor-not-allowed disabled:opacity-50",
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
