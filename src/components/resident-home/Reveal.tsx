import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useLandingMotion } from "@/lib/motion/useMotionPreview";
import { cn } from "@/lib/utils";

/** Scroll-triggered reveal — opacity + translateY + soft blur (Framer on landings). */
export function Reveal({
  children,
  className,
  delayMs = 0,
}: {
  children: ReactNode;
  className?: string;
  delayMs?: number;
}) {
  const landingMotion = useLandingMotion();
  const reduceMotion = useReducedMotion();
  const useFramerReveal = landingMotion && !reduceMotion;
  const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches;
  const blurPx = isMobile ? 4 : 8;

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
          y: 28,
          filter: `blur(${blurPx}px)`,
        }}
        whileInView={{
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
        }}
        viewport={{ once: true, amount: 0.18, margin: "0px 0px -8% 0px" }}
        transition={{
          duration: 0.75,
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
