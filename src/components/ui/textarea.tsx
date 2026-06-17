import * as React from "react";

import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[96px] w-full rounded-[16px] bg-white px-4 py-3 text-[14px] font-medium text-[#1F2937] shadow-[0_2px_10px_-4px_rgba(10,31,61,0.08)] border-0 ring-0 outline-none placeholder:text-[#9CA3AF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E6B5A]/40 focus-visible:shadow-[0_4px_14px_-4px_rgba(10,31,61,0.12)] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
