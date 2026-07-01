import { forwardRef, useEffect, useMemo, useRef, useState, ImgHTMLAttributes } from "react";
import { imgUrl, imgSrcSet, imgBlurUrl, type ImgSize } from "@/lib/imageUrl";

interface SmartImgProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet"> {
  src: string | null | undefined;
  size: ImgSize;
  /** Set to true for above-the-fold LCP images. Default: lazy. */
  eager?: boolean;
  /** Set to true for the single most important image on the page. */
  priority?: boolean;
  /**
   * `sizes` attribute — tells the browser the rendered width so it can pick
   * the smallest sufficient srcset candidate. Defaults per preset below.
   */
  sizes?: string;
  /** Disable blur placeholder (rarely needed). */
  noBlur?: boolean;
}

const DEFAULT_SIZES: Record<ImgSize, string> = {
  thumb: "96px",
  logo: "200px",
  card: "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw",
  detail: "(max-width: 640px) 100vw, (max-width: 1024px) 66vw, 960px",
  hero: "100vw",
};

/**
 * Drop-in <img> that:
 *   1. Rewrites Supabase Storage URLs through the render/image transform
 *      (WebP + resized on the CDN edge).
 *   2. Emits a width-descriptor srcset + sizes so the browser fetches only
 *      what it needs for the actual rendered size.
 *   3. Shows a tiny (24px) blurred placeholder as CSS background under the
 *      image, fading the real image in on load. Zero layout shift when the
 *      parent has intrinsic dimensions (aspect ratio, fixed height, etc.).
 *   4. Sets lazy loading + async decoding by default; `priority` opts in to
 *      eager + fetchpriority=high for LCP candidates.
 *   5. Falls back to the raw URL if the transform 404s (defensive).
 */
export const SmartImg = forwardRef<HTMLImageElement, SmartImgProps>(function SmartImg(
  { src, size, eager, priority, sizes, alt, noBlur, className, style, ...rest },
  ref,
) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const finalSrc = !src ? "" : failed ? src : imgUrl(src, size);
  const srcSet = failed ? undefined : imgSrcSet(src, size);
  const finalSizes = srcSet ? (sizes ?? DEFAULT_SIZES[size]) : undefined;
  const blur = useMemo(() => (noBlur || failed ? null : imgBlurUrl(src)), [src, failed, noBlur]);

  // If the image is already cached (e.g., SW hit / repeat visit) the onLoad
  // event may fire before React attaches the listener. Check on mount.
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [finalSrc]);

  const bgStyle: React.CSSProperties = blur
    ? {
        backgroundImage: `url("${blur}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        // Blur the low-res background; the real <img> covers it once loaded.
        filter: loaded ? undefined : undefined,
      }
    : {};

  return (
    <img
      {...rest}
      ref={(node) => {
        imgRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLImageElement | null>).current = node;
      }}
      src={finalSrc}
      srcSet={srcSet}
      sizes={finalSizes}
      alt={alt ?? ""}
      loading={eager || priority ? "eager" : "lazy"}
      decoding="async"
      // @ts-expect-error — fetchpriority is a valid HTML attribute not yet in React types
      fetchpriority={priority ? "high" : undefined}
      className={className}
      style={{
        ...bgStyle,
        opacity: blur ? (loaded ? 1 : 0) : 1,
        transition: blur ? "opacity 240ms ease-out" : undefined,
        ...style,
      }}
      onLoad={(e) => {
        setLoaded(true);
        rest.onLoad?.(e);
      }}
      onError={(e) => {
        if (!failed && src && finalSrc !== src) {
          setFailed(true);
        }
        setLoaded(true);
        rest.onError?.(e);
      }}
    />
  );
});
