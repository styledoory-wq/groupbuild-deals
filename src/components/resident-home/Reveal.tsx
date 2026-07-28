import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useLocation, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";

/** Scroll-triggered fade/slide-up. One-shot; respects reduced motion. */
export function Reveal({
  children,
  className,
  delayMs = 0,
}: {
  children: ReactNode;
  className?: string;
  delayMs?: number;
}) {
  const location = useLocation();
  const [params] = useSearchParams();
  const motionPreview = params.get("motion") === "preview" && (location.pathname === "/" || location.pathname === "/residents");

  // Keep reduced-motion fully static (no blur/parallax).
  const reduceMotion = useReducedMotion();

  const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches;

  // Stage-0 preview mode: blur+scale reveal with Framer Motion.
  if (motionPreview && !reduceMotion) {
    const blurPx = isMobile ? 4 : 10;

    return (
      <motion.div
        className={cn("will-change-transform", className)}
        initial={{
          opacity: 0,
          y: 12,
          scale: 0.985,
          filter: `blur(${blurPx}px)`,
        }}
        whileInView={{
          opacity: 1,
          y: 0,
          scale: 1,
          filter: "blur(0px)",
        }}
        viewport={{ once: true, amount: 0.16 }}
        transition={{ duration: 0.7, ease: "easeOut", delay: delayMs / 1000 }}
      >
        {children}
      </motion.div>
    );
  }

  // Default mode: keep the existing Reveal behaviour.
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
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
  }, []);

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
