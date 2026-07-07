import { Helmet } from "react-helmet-async";

const SITE_URL = "https://groupbuild.co.il";
const DEFAULT_OG = `${SITE_URL}/og-image.jpg`;

export interface SeoProps {
  /** Full page title. Keep under ~60 chars. */
  title: string;
  /** Meta description. Keep under ~160 chars. */
  description: string;
  /** Route path (starts with /) or absolute URL. Defaults to current path. */
  path?: string;
  /** Absolute image URL for og/twitter cards. */
  image?: string;
  /** OpenGraph type. Defaults to "website". */
  type?: "website" | "article" | "product";
  /** Prevents indexing. */
  noindex?: boolean;
  /** Optional JSON-LD payload(s). */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

/**
 * Per-route <head> metadata: title, description, canonical, OG, Twitter, JSON-LD.
 * Wrapped by <HelmetProvider> at the app root.
 */
export function Seo({
  title,
  description,
  path,
  image = DEFAULT_OG,
  type = "website",
  noindex,
  jsonLd,
}: SeoProps) {
  const resolvedPath = path ?? (typeof window !== "undefined" ? window.location.pathname : "/");
  const url = resolvedPath.startsWith("http") ? resolvedPath : `${SITE_URL}${resolvedPath}`;
  const ldArray = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet prioritizeSeoTags>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:image" content={image} />
      <meta property="og:locale" content="he_IL" />
      <meta property="og:site_name" content="GroupBuild" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {ldArray.map((ld, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(ld)}
        </script>
      ))}
    </Helmet>
  );
}

export default Seo;
