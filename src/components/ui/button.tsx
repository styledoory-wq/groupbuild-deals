import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-[14px] font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "ios-btn-navy",
        destructive: "bg-destructive text-destructive-foreground rounded-2xl shadow-sm hover:bg-destructive/90",
        outline: "ios-btn-secondary",
        secondary: "ios-btn-secondary",
        ghost: "hover:bg-muted text-foreground rounded-2xl",
        link: "text-primary underline-offset-4 hover:underline",
        premium: "bg-gradient-to-l from-gold via-gold-light to-gold text-[#0A1F3D] font-bold rounded-2xl shadow-gold hover:brightness-105",
        navy: "ios-btn-navy",
        glass: "bg-white/10 backdrop-blur-md border border-white/15 text-primary-foreground hover:bg-white/15 rounded-2xl",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 rounded-xl px-3",
        lg: "h-12 rounded-2xl px-8",
        icon: "h-10 w-10 rounded-full",
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
