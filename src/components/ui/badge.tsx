import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold shadow-[0_1px_3px_rgba(10,31,61,0.06)] transition-colors focus:outline-none focus:ring-2 focus:ring-[#C9A227]/40 focus:ring-offset-1",
  {
    variants: {
      variant: {
        default: "bg-white text-[#1F2937]",
        secondary: "bg-[#F4F6FA] text-[#1F2937]",
        destructive: "bg-[#FEE2E2] text-[#DC2626]",
        outline: "bg-white text-[#1F2937]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
