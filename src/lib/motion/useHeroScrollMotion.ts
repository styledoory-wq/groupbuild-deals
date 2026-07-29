import { useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import type { RefObject } from "react";
import { useMotionPreview } from "@/lib/motion/useMotionPreview";

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
  const motionPreview = useMotionPreview();
  const reduceMotion = useReducedMotion();
  const enabled = motionPreview && !reduceMotion;

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const bgScale = useTransform(scrollYProgress, [0, 1], isMobile ? [1.03, 1] : [1.06, 1]);
  const bgY = useTransform(scrollYProgress, [0, 1], isMobile ? [0, -6] : [0, -14]);
  const titleY = useTransform(scrollYProgress, [0, 1], isMobile ? [0, -8] : [0, -12]);
  const titleOpacity = useTransform(scrollYProgress, [0, 1], isMobile ? [1, 0.85] : [1, 0.78]);

  return { enabled, bgScale, bgY, titleY, titleOpacity };
}
