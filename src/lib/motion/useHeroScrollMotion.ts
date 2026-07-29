import { useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import type { RefObject } from "react";
import { useLandingMotion } from "@/lib/motion/useMotionPreview";

type HeroScrollMotion = {
  enabled: boolean;
  bgScale: MotionValue<number>;
  bgY: MotionValue<number>;
  titleY: MotionValue<number>;
  titleOpacity: MotionValue<number>;
};

export function useHeroScrollMotion(
  heroRef: RefObject<HTMLElement | null>,
  isMobile: boolean,
): HeroScrollMotion {
  const landingMotion = useLandingMotion();
  const reduceMotion = useReducedMotion();
  const enabled = landingMotion && !reduceMotion;

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  // Perceptible but still soft: start slightly zoomed, ease out on scroll.
  const bgScale = useTransform(scrollYProgress, [0, 1], isMobile ? [1.08, 1] : [1.12, 1]);
  const bgY = useTransform(scrollYProgress, [0, 1], isMobile ? [0, -18] : [0, -36]);
  const titleY = useTransform(scrollYProgress, [0, 0.55], isMobile ? [0, -16] : [0, -28]);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.55], [1, 0.55]);

  return { enabled, bgScale, bgY, titleY, titleOpacity };
}
