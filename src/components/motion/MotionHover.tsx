import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { useMotionPreview } from "@/lib/motion/useMotionPreview";
import { cn } from "@/lib/utils";

type MotionHoverProps = {
  children: ReactNode;
  className?: string;
};

/** Subtle scale on hover/tap — preview mode only. */
export function MotionHover({ children, className }: MotionHoverProps) {
  const motionPreview = useMotionPreview();
  const reduceMotion = useReducedMotion();

  if (!motionPreview || reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={cn(className)}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "tween", duration: 0.18, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
