import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useMotionPreview } from "@/lib/motion/useMotionPreview";
import { cn } from "@/lib/utils";

/** Scroll-triggered reveal. Premium blur+fade in preview mode; CSS fallback otherwise. */
export function Reveal({
  children,
  className,
  delayMs = 0,
}: {
  children: ReactNode;
  className?: string;
  delayMs?: number;
}) {
  const motionPreview = useMotionPreview();
  const reduceMotion = useReducedMotion();
  const useFramerReveal = motionPreview && !reduceMotion;
  const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches;
  const blurPx = isMobile ? 3 : 6;

  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (useFramerReveal) return;

    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setOn(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setOn(true);
          io.disconnect();
        }
      },
      { threshold: 0.16, rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [useFramerReveal]);

  if (useFramerReveal) {
    return (
      <motion.div
        className={cn("will-change-[transform,opacity]", className)}
        initial={{
          opacity: 0,
          y: 18,
          filter: `blur(${blurPx}px)`,
        }}
        whileInView={{
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
        }}
        viewport={{ once: true, amount: 0.14, margin: "0px 0px -4% 0px" }}
        transition={{
          duration: 0.65,
          ease: [0.22, 1, 0.36, 1],
          delay: delayMs / 1000,
        }}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div
      ref={ref}
      className={cn(
        "will-change-transform transition-[opacity,transform] duration-700 ease-out",
        on ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5",
        className,
      )}
      style={{ transitionDelay: on ? `${delayMs}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}
