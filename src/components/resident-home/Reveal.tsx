import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useLandingMotion } from "@/lib/motion/useMotionPreview";
import { cn } from "@/lib/utils";

/**
 * Scroll-triggered reveal — soft opacity + translateY only.
 * No blur: blur reads as a loading/FOUC state on first paint, especially for
 * above-the-fold cards that overlap the hero.
 *
 * Pass `eager` for first-viewport sections so content is sharp immediately
 * (optional subtle settle animation only).
 */
export function Reveal({
  children,
  className,
  delayMs = 0,
  eager = false,
}: {
  children: ReactNode;
  className?: string;
  delayMs?: number;
  /** Show immediately — for content already in the first viewport. */
  eager?: boolean;
}) {
  const landingMotion = useLandingMotion();
  const reduceMotion = useReducedMotion();
  const useFramerReveal = landingMotion && !reduceMotion;
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(eager);

  useEffect(() => {
    if (eager || useFramerReveal) {
      if (eager) setOn(true);
      return;
    }

    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setOn(true);
      return;
    }

    // If already in (or near) the viewport on mount, show immediately —
    // avoid a blurred/invisible flash for overlapping hero cards.
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    if (rect.top < vh * 0.92 && rect.bottom > 0) {
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
      // Positive bottom margin: start revealing slightly before fully scrolled in
      { threshold: 0.08, rootMargin: "0px 0px 12% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [eager, useFramerReveal]);

  if (useFramerReveal) {
    if (eager) {
      return (
        <motion.div
          className={cn("will-change-[transform,opacity]", className)}
          initial={{ opacity: 1, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.45,
            ease: [0.22, 1, 0.36, 1],
            delay: delayMs / 1000,
          }}
        >
          {children}
        </motion.div>
      );
    }

    return (
      <motion.div
        className={cn("will-change-[transform,opacity]", className)}
        initial={{
          opacity: 0,
          y: 20,
        }}
        whileInView={{
          opacity: 1,
          y: 0,
        }}
        viewport={{ once: true, amount: 0.08, margin: "0px 0px 12% 0px" }}
        transition={{
          duration: 0.55,
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
        "will-change-transform transition-[opacity,transform] duration-500 ease-out",
        on ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        className,
      )}
      style={{ transitionDelay: on ? `${delayMs}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}
