import { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { LoadingState, ErrorState } from "@/components/ds";
import { MobileShell } from "@/components/layout/MobileShell";

/**
 * Public SEO-friendly URL /supplier/:slug — resolves the supplier by slug and
 * renders the existing supplier profile page underneath.
 */
export default function PublicSupplierRedirect() {
  const { slug } = useParams();
  const [state, setState] = useState<{
    loading: boolean;
    id?: string;
    name?: string;
    desc?: string;
    logo?: string | null;
    phone?: string | null;
    notFound?: boolean;
  }>({ loading: true });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!slug) return;
      const { data } = await supabase
        .from("suppliers")
        .select("id,business_name,short_description,description,logo_url,phone")
        .eq("slug", slug)
        .eq("is_active", true)
        .in("approval_status", ["approved", "active"])
        .maybeSingle();
      if (cancelled) return;
      if (!data) {
        setState({ loading: false, notFound: true });
      } else {
        setState({
          loading: false,
          id: data.id,
          name: data.business_name,
          desc: data.short_description || data.description || "",
          logo: data.logo_url,
          phone: data.phone,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (state.loading) {
    return (
      <MobileShell>
        <LoadingState label="טוען כרטיס עסק..." />
      </MobileShell>
    );
  }
  if (state.notFound || !state.id) {
    return (
      <MobileShell>
        <Helmet>
          <title>העסק לא נמצא — GroupBuild</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <ErrorState title="העסק לא נמצא" description="ייתכן שהעסק הוסר או שהכתובת שגויה." />
      </MobileShell>
    );
  }

  const canonical = `https://groupbuild.co.il/supplier/${slug}`;
  const title = `${state.name} — GroupBuild`;
  const description = (state.desc || `כרטיס העסק של ${state.name} ב־GroupBuild. פרטי קשר, גלריה, מבצעים וביקורות.`).slice(0, 160);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: state.name,
    description,
    url: canonical,
    ...(state.logo ? { image: state.logo } : {}),
    ...(state.phone ? { telephone: state.phone } : {}),
  };

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="profile" />
        {state.logo && <meta property="og:image" content={state.logo} />}
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      <Navigate to={`/suppliers/${state.id}`} replace />
    </>
  );
}
