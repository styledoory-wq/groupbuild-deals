import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { useLandingMotion } from "@/lib/motion/useMotionPreview";
import { cn } from "@/lib/utils";

type MotionHoverProps = {
  children: ReactNode;
  className?: string;
};

/** Subtle scale on hover/tap — landing pages only. */
export function MotionHover({ children, className }: MotionHoverProps) {
  const landingMotion = useLandingMotion();
  const reduceMotion = useReducedMotion();

  if (!landingMotion || reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={cn(className)}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "tween", duration: 0.18, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
