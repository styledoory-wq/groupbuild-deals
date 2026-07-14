import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { LoadingState, ErrorState } from "@/components/ds";
import { MobileShell } from "@/components/layout/MobileShell";
import CategorySuppliers from "@/pages/resident/CategorySuppliers";

/**
 * Public SEO-friendly URL /category/:slug — resolves the category by slug and
 * renders CategorySuppliers directly (no client-side redirect).
 */
export default function PublicCategoryRedirect() {
  const { slug } = useParams();
  const [state, setState] = useState<{ loading: boolean; id?: string; name?: string; description?: string | null; notFound?: boolean }>({
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!slug) return;
      const { data } = await supabase
        .from("categories")
        .select("id,name,description")
        .eq("slug", slug)
        .eq("is_active", true)
        .eq("is_deleted", false)
        .maybeSingle();
      if (cancelled) return;
      if (!data) setState({ loading: false, notFound: true });
      else setState({ loading: false, id: data.id, name: data.name, description: data.description });
    })();
    return () => { cancelled = true; };
  }, [slug]);

  if (state.loading) {
    return <MobileShell><LoadingState label="טוען קטגוריה..." /></MobileShell>;
  }
  if (state.notFound || !state.id) {
    return (
      <MobileShell>
        <Helmet>
          <title>קטגוריה לא נמצאה — GroupBuild</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <ErrorState title="הקטגוריה לא נמצאה" description="ייתכן שהקטגוריה הוסרה או שהכתובת שגויה." />
      </MobileShell>
    );
  }

  const canonical = `https://groupbuild.co.il/category/${slug}`;
  const title = `${state.name} — ספקים ב־GroupBuild`;
  const description = state.description || `כל הספקים המובילים בקטגוריית ${state.name}. השוואת עסקים, גלריות, ביקורות והצעות מיוחדות.`;

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="website" />
      </Helmet>
      <CategorySuppliers initialCategoryId={state.id} />
    </>
  );
}
