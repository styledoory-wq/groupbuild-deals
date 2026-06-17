import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Unified app buttons — matches the Categories design language.
 * 16px radius, soft shadow, 180ms transitions, premium press feedback.
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "rounded-[16px] text-[14px] font-bold tracking-tight",
    "min-h-touch ring-offset-background",
    "transition-[transform,box-shadow,filter,background-color,color] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227]/40 focus-visible:ring-offset-1",
    "disabled:pointer-events-none disabled:opacity-50",
    "active:scale-[0.97]",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        // Primary — deep navy CTA, app-wide default
        default:
          "bg-[#1F2937] text-white shadow-[0_8px_20px_-10px_rgba(10,31,61,0.45)] hover:brightness-110",
        // Gold accent — premium / hero actions
        premium:
          "bg-gradient-to-l from-[#C9A84C] via-[#E8C96B] to-[#C9A84C] text-[#1F2937] shadow-[0_8px_20px_-10px_rgba(201,168,76,0.55)] hover:brightness-105",
        // Secondary — soft white surface, matches cards
        secondary:
          "bg-white text-[#1F2937] shadow-[0_2px_10px_-4px_rgba(10,31,61,0.10)] hover:bg-[#F4F6FA]",
        outline:
          "bg-white text-[#1F2937] shadow-[0_2px_8px_-4px_rgba(10,31,61,0.08)] hover:bg-[#F4F6FA]",
        ghost:
          "bg-transparent text-[#1F2937] hover:bg-[#F4F6FA]",
        destructive:
          "bg-[#DC2626] text-white shadow-[0_8px_20px_-10px_rgba(220,38,38,0.55)] hover:brightness-110",
        link:
          "text-[#1F2937] underline-offset-4 hover:underline min-h-0 shadow-none",
        navy:
          "bg-[#1F2937] text-white shadow-[0_8px_20px_-10px_rgba(10,31,61,0.45)] hover:brightness-110",
        glass:
          "bg-white/10 backdrop-blur-md border border-white/15 text-white hover:bg-white/15",
      },
      size: {
        default: "h-12 px-5",
        sm: "h-10 px-3.5 text-[13px]",
        lg: "h-13 px-7 text-[15px]",
        icon: "h-11 w-11 min-w-[44px] rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
