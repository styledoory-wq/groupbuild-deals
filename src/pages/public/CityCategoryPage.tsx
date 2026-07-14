import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Phone, MessageCircle, ArrowLeft, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LoadingState, ErrorState } from "@/components/ds";
import { SupplierLogo } from "@/components/suppliers/SupplierLogo";
import { normalizeWhatsappUrl } from "@/lib/whatsapp";
import { trackSupplierEvent } from "@/lib/analytics";

type Row = {
  supplier_id: string;
  business_name: string;
  slug: string | null;
  logo_url: string | null;
  short_description: string | null;
  phone: string | null;
  whatsapp_url: string | null;
};

/**
 * /city/:citySlug/:categorySlug — SEO landing page for a category within a city.
 * Fully public + indexable with LocalBusiness ItemList schema.
 */
export default function CityCategoryPage() {
  const { citySlug, categorySlug } = useParams();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [cityName, setCityName] = useState<string>("");
  const [categoryName, setCategoryName] = useState<string>("");
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!citySlug || !categorySlug) return;
      setLoading(true);
      const [cityRes, catRes, listRes] = await Promise.all([
        supabase.from("cities").select("name_he").eq("slug", citySlug).maybeSingle(),
        supabase.from("categories").select("name").eq("slug", categorySlug).maybeSingle(),
        supabase.rpc("city_category_suppliers", { _city_slug: citySlug, _category_slug: categorySlug }),
      ]);
      if (cancelled) return;
      if (!cityRes.data || !catRes.data) {
        setNotFound(true);
      } else {
        setCityName(cityRes.data.name_he ?? "");
        setCategoryName(catRes.data.name ?? "");
      }
      setRows((listRes.data ?? []) as Row[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [citySlug, categorySlug]);

  if (loading) return <LoadingState label="טוען ספקים..." />;

  if (notFound) {
    return (
      <>
        <Helmet><title>לא נמצא — GroupBuild</title><meta name="robots" content="noindex" /></Helmet>
        <ErrorState title="הדף לא נמצא" description="הקטגוריה או העיר לא קיימות במערכת." />
      </>
    );
  }

  const canonical = `https://groupbuild.co.il/city/${citySlug}/${categorySlug}`;
  const title = `${categoryName} ב${cityName} — GroupBuild`;
  const description = `רשימת ${categoryName} מומלצים ב${cityName}. השוואת ספקים, פרטי קשר, גלריות והצעות. ${rows.length > 0 ? `${rows.length} עסקים מוצגים.` : ""}`.slice(0, 160);

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: title,
    numberOfItems: rows.length,
    itemListElement: rows.slice(0, 20).map((r, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `https://groupbuild.co.il/supplier/${r.slug ?? r.supplier_id}`,
      name: r.business_name,
    })),
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "בית", item: "https://groupbuild.co.il/" },
      { "@type": "ListItem", position: 2, name: cityName, item: `https://groupbuild.co.il/city/${citySlug}` },
      { "@type": "ListItem", position: 3, name: categoryName, item: canonical },
    ],
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#F7F5F0]">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(itemListLd)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbLd)}</script>
      </Helmet>

      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-[#ECEEF2]">
        <div className="mx-auto max-w-screen-md px-4 h-14 flex items-center gap-3">
          <Link to="/" className="text-[#0E6B5A] font-bold">GroupBuild</Link>
          <span className="text-[#9CA3AF]">·</span>
          <Link to={`/category/${categorySlug}`} className="text-[13px] text-[#374151] hover:underline">{categoryName}</Link>
          <span className="text-[#9CA3AF]">·</span>
          <span className="text-[13px] text-[#374151]">{cityName}</span>
        </div>
      </header>

      <main className="mx-auto max-w-screen-md px-4 py-6">
        <h1 className="text-2xl font-extrabold text-[#1F2937] mb-1">{categoryName} ב{cityName}</h1>
        <p className="text-[13px] text-[#6B7280] mb-5">
          {rows.length > 0
            ? `${rows.length} עסקים ב${cityName} או שנותנים שירות ארצי`
            : `לא נמצאו כרגע ${categoryName} ב${cityName}. הצטרפו לקבלת עדכון כשספק חדש יתווסף.`}
        </p>

        <div className="space-y-3">
          {rows.map((r) => {
            const wa = normalizeWhatsappUrl(r.whatsapp_url ?? r.phone ?? null);
            return (
              <article key={r.supplier_id} className="bg-white rounded-2xl p-4 shadow-[0_4px_12px_rgba(0,0,0,0.06)] flex gap-3 items-center">
                <SupplierLogo logoUrl={r.logo_url} name={r.business_name} size="md" />
                <div className="flex-1 min-w-0">
                  <Link to={`/supplier/${r.slug ?? r.supplier_id}`} className="font-bold text-[15px] text-[#1F2937] hover:text-[#0E6B5A]">{r.business_name}</Link>
                  {r.short_description && (
                    <p className="text-[12px] text-[#6B7280] truncate mt-0.5">{r.short_description}</p>
                  )}
                  <div className="flex gap-2 mt-2">
                    {r.phone && (
                      <a
                        href={`tel:${r.phone}`}
                        onClick={() => trackSupplierEvent(r.supplier_id, "call", { from: "city_category" })}
                        className="inline-flex items-center gap-1 h-8 px-3 rounded-full bg-[#0E6B5A] text-white text-[12px] font-semibold"
                      >
                        <Phone className="h-3.5 w-3.5" /> התקשר
                      </a>
                    )}
                    {wa && (
                      <a
                        href={wa}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => trackSupplierEvent(r.supplier_id, "whatsapp", { from: "city_category" })}
                        className="inline-flex items-center gap-1 h-8 px-3 rounded-full bg-[#25D366] text-white text-[12px] font-semibold"
                      >
                        <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                      </a>
                    )}
                    <Link
                      to={`/supplier/${r.slug ?? r.supplier_id}`}
                      className="inline-flex items-center gap-1 h-8 px-3 rounded-full bg-white border border-[#E5E7EB] text-[12px] font-semibold text-[#1F2937]"
                    >
                      פרטים <ArrowLeft className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <section className="mt-10 bg-white rounded-2xl p-5 border border-[#ECEEF2]">
          <h2 className="text-lg font-bold text-[#1F2937] flex items-center gap-2">
            <MapPin className="h-5 w-5 text-[#0E6B5A]" />
            למה לבחור {categoryName} ב{cityName} דרך GroupBuild?
          </h2>
          <ul className="mt-3 space-y-2 text-[13px] text-[#374151] list-disc pr-5">
            <li>ספקים מאומתים בלבד — עם ביקורות אמיתיות של דיירים</li>
            <li>השוואת מחירים חכמה והצעות רכישה קבוצתית</li>
            <li>קשר ישיר בטלפון או WhatsApp — ללא עמלות תיווך</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
