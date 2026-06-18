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
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E6B5A]/40 focus-visible:ring-offset-1",
    "disabled:pointer-events-none disabled:opacity-50",
    "active:scale-[0.97]",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        // Primary — brand emerald, the single CTA color across the app
        default:
          "bg-[#0E6B5A] text-white shadow-[0_8px_20px_-10px_rgba(14,107,90,0.45)] hover:bg-[#0A5446] hover:shadow-[0_10px_24px_-10px_rgba(14,107,90,0.55)]",
        // Premium — brand gradient for hero / marketing actions
        premium:
          "bg-gradient-to-l from-[#0A5446] via-[#0E6B5A] to-[#1A8870] text-white shadow-[0_10px_24px_-10px_rgba(14,107,90,0.55)] hover:brightness-105",
        // Secondary — soft white surface, matches cards
        secondary:
          "bg-white text-[#0B1220] shadow-[0_2px_10px_-4px_rgba(11,18,32,0.10)] hover:bg-[#F4F6FA]",
        outline:
          "bg-white text-[#0B1220] ring-1 ring-inset ring-[#E5E7EB] shadow-none hover:bg-[#F7F5F0] hover:ring-[#0E6B5A]/30",
        ghost:
          "bg-transparent text-[#0B1220] hover:bg-[#F1F1ED]",
        destructive:
          "bg-[#DC2626] text-white shadow-[0_8px_20px_-10px_rgba(220,38,38,0.45)] hover:bg-[#B91C1C]",
        link:
          "text-[#0E6B5A] underline-offset-4 hover:underline min-h-0 shadow-none",
        navy:
          "bg-[#0B1220] text-white shadow-[0_8px_20px_-10px_rgba(11,18,32,0.45)] hover:bg-black",
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
