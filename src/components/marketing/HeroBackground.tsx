import { motion, type MotionValue } from "framer-motion";
import { useEffect, useState, type CSSProperties } from "react";

type Props = {
  src: string;
  /** Tiny inline data-URL shown instantly so the hero never paints solid black. */
  lqip: string;
  objectPosition?: string;
  /** When set, apply scroll parallax/zoom from useHeroScrollMotion. */
  motionScale?: MotionValue<number>;
  motionY?: MotionValue<number>;
  enabled?: boolean;
};

/**
 * Full-bleed landing hero photo:
 * 1. LQIP paints immediately (no black flash)
 * 2. Full JPEG with fetchpriority=high covers it when decoded
 */
export function HeroBackground({
  src,
  lqip,
  objectPosition = "center 32%",
  motionScale,
  motionY,
  enabled = false,
}: Props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.src = src;
    const mark = () => {
      if (!cancelled) setReady(true);
    };
    if (img.complete && img.naturalWidth > 0) {
      mark();
    } else {
      img.decode?.()
        .then(mark)
        .catch(mark);
      img.onload = mark;
    }
    return () => {
      cancelled = true;
    };
  }, [src]);

  const layerStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    minHeight: "100%",
    objectFit: "cover",
    objectPosition,
  };

  const content = (
    <>
      {/* Instant soft stand-in — scaled so blur doesn't show edges */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage: `url("${lqip}")`,
          backgroundSize: "cover",
          backgroundPosition: objectPosition,
          filter: "blur(18px)",
          transform: "scale(1.12)",
          opacity: ready ? 0 : 1,
          transition: "opacity 280ms ease-out",
        }}
      />
      <img
        src={src}
        alt=""
        aria-hidden
        loading="eager"
        decoding="async"
        fetchPriority="high"
        className="absolute inset-0"
        style={{
          ...layerStyle,
          opacity: ready ? 1 : 0,
          transition: "opacity 280ms ease-out",
        }}
        onLoad={() => setReady(true)}
      />
    </>
  );

  if (enabled && motionScale && motionY) {
    return (
      <motion.div
        aria-hidden
        className="absolute inset-0 -z-30 overflow-hidden"
        style={{
          scale: motionScale,
          y: motionY,
          transformOrigin: "center top",
        }}
      >
        {content}
      </motion.div>
    );
  }

  return (
    <div aria-hidden className="absolute inset-0 -z-30 overflow-hidden">
      {content}
    </div>
  );
}
