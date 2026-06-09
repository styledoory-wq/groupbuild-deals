import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Unified app card — matches the Categories design system.
 * White bg, 20px radius, soft layered shadow, smooth press.
 */
const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-[20px] bg-white text-card-foreground p-4 border border-[#F1F3F6]",
      "shadow-[0_12px_28px_-14px_rgba(10,31,61,0.22),0_4px_10px_-4px_rgba(10,31,61,0.08)]",
      "transition-[transform,box-shadow] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
      "hover:-translate-y-[1px] hover:shadow-[0_18px_36px_-14px_rgba(10,31,61,0.26),0_6px_14px_-6px_rgba(10,31,61,0.10)]",
      "active:scale-[0.99]",
      className,
    )}
    {...props}
  />

));
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("text-[18px] font-extrabold leading-tight tracking-tight text-[#0A1F3D]", className)}
      {...props}
    />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-[13px] font-medium text-[#6B7280]", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />,
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
