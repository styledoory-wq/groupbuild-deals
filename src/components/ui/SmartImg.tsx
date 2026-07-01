import { forwardRef, useState, ImgHTMLAttributes } from "react";
import { imgUrl, imgSrcSet, type ImgSize } from "@/lib/imageUrl";

interface SmartImgProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet"> {
  src: string | null | undefined;
  size: ImgSize;
  /** Set to true for above-the-fold LCP images. Default: lazy. */
  eager?: boolean;
  /** Set to true for the single most important image on the page. */
  priority?: boolean;
}

/**
 * Drop-in <img> that:
 *   1. Rewrites Supabase Storage URLs through the render/image transform
 *      (WebP + resized on the CDN edge).
 *   2. Sets lazy loading + async decoding by default.
 *   3. Sets fetchpriority="high" when `priority` is true.
 *   4. Falls back to the original URL if the transform 404s (defensive).
 *
 * Falls back gracefully to the raw URL when transformation isn't supported.
 */
export const SmartImg = forwardRef<HTMLImageElement, SmartImgProps>(function SmartImg(
  { src, size, eager, priority, alt, ...rest },
  ref,
) {
  const [failed, setFailed] = useState(false);
  const finalSrc = !src ? "" : failed ? src : imgUrl(src, size);
  const srcSet = failed ? undefined : imgSrcSet(src, size);

  return (
    <img
      ref={ref}
      src={finalSrc}
      srcSet={srcSet}
      alt={alt ?? ""}
      loading={eager || priority ? "eager" : "lazy"}
      decoding="async"
      // @ts-expect-error — fetchpriority is a valid HTML attribute not yet in React types
      fetchpriority={priority ? "high" : undefined}
      onError={(e) => {
        // If the render endpoint failed (project without transform enabled),
        // fall back to the original URL once. Prevents infinite loop.
        if (!failed && src && finalSrc !== src) {
          setFailed(true);
        }
        rest.onError?.(e);
      }}
      {...rest}
    />
  );
});
