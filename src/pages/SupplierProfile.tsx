import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ExternalLink, FileText, Globe, Instagram, Facebook, MapPin, Phone, Share2, Navigation, Star, ArrowRight, Tag, Loader2 } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { LoadingState } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { SupplierLogo } from "@/components/suppliers/SupplierLogo";
import { SmartImg } from "@/components/ui/SmartImg";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SupplierRatingBadge } from "@/components/reviews/SupplierRatingBadge";
import { useApp } from "@/store/AppStore";
import { normalizeWhatsappUrl } from "@/lib/whatsapp";
import type { RealDealCardData } from "@/components/deals/RealDealCard";
import { describeOffer, type OfferTier, type OfferType } from "@/lib/offerPricing";
import { getFriendlyLoadError, withTimeout } from "@/lib/safeAsync";
import { EditableField } from "@/components/admin/EditableField";
import { trackSupplierEvent } from "@/lib/analytics";
import { useGuestGate } from "@/hooks/useGuestGate";
import { ShareBusinessSheet } from "@/components/public/ShareBusinessSheet";
import { iconForCategory } from "@/lib/categoryIcons";

const BRAND = "#0E6B5A";

const sectionLabel = "text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3";
const floatCard = "rounded-2xl border border-gray-100 bg-white shadow-sm";
const softBtn =
  "flex rounded-2xl bg-white border border-gray-100 shadow-sm text-slate-800 text-xs font-bold items-center justify-center gap-1.5 active:scale-[0.97] transition-transform";

interface DbSupplier {
  id: string;
  user_id: string | null;
  business_name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  description: string | null;
  short_description: string | null;
  categories: string[];
  serves_all_country: boolean;
  is_active: boolean;
  approval_status: string;
  logo_url: string | null;
  website_url: string | null;
  whatsapp_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  catalog_url: string | null;
  service_areas: string[] | null;
  supplier_kind: "service" | "product" | null;
  offers_services: boolean | null;
  offers_products: boolean | null;
}

interface GalleryItem {
  id: string;
  image_url: string;
  caption: string | null;
}

type AreaJoinRow = {
  regions?: { name_he?: string | null } | null;
  cities?: { name_he?: string | null } | null;
};

type SupplierCategoryRow = { category_id: string };

const WhatsappIcon = (props: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={props.className} fill="currentColor" aria-hidden="true">
    <path d="M20.52 3.48A11.86 11.86 0 0 0 12.05 0C5.5 0 .19 5.31.19 11.86a11.8 11.8 0 0 0 1.62 5.96L0 24l6.34-1.66a11.85 11.85 0 0 0 5.71 1.46h.01c6.55 0 11.86-5.31 11.86-11.86 0-3.17-1.23-6.15-3.4-8.46zM12.06 21.3a9.43 9.43 0 0 1-4.81-1.32l-.34-.2-3.76.98 1-3.66-.22-.37a9.46 9.46 0 1 1 8.13 4.57zm5.45-7.05c-.3-.15-1.77-.87-2.05-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.18.2-.35.22-.65.07-.3-.15-1.27-.47-2.42-1.5-.9-.8-1.5-1.78-1.68-2.07-.18-.3-.02-.46.13-.61.13-.13.3-.34.45-.5.15-.18.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51-.18-.01-.37-.01-.57-.01-.2 0-.52.07-.8.37-.27.3-1.05 1.02-1.05 2.5 0 1.47 1.07 2.9 1.22 3.1.15.2 2.12 3.24 5.13 4.55.72.31 1.27.5 1.7.64.71.23 1.36.2 1.87.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.18-1.42-.08-.13-.27-.2-.57-.35z"/>
  </svg>
);

type ReviewItem = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user_id: string;
  reviewer_name?: string;
};

export default function SupplierProfile() {
  const params = useParams();
  const routeSlug = (params.slug as string | undefined) ?? undefined;
  const routeId = (params.supplierId as string | undefined) ?? undefined;
  const navigate = useNavigate();
  const { requireAuth } = useGuestGate();
  const { categories } = useApp();
  const [loading, setLoading] = useState(true);
  const [supplier, setSupplier] = useState<DbSupplier | null>(null);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [serviceAreas, setServiceAreas] = useState<string[]>([]);
  const [interested, setInterested] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [deals, setDeals] = useState<RealDealCardData[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [supplierCategoryIds, setSupplierCategoryIds] = useState<string[]>([]);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [resolvedId, setResolvedId] = useState<string | null>(routeId ?? null);
  const [slugResolved, setSlugResolved] = useState<boolean>(!!routeId);
  const [shareOpen, setShareOpen] = useState(false);
  const dealsRef = useRef<HTMLDivElement>(null);

  // Resolve slug → id when the route is /supplier/:slug.
  // Only approved + active + not-deleted suppliers are publicly resolvable.
  useEffect(() => {
    if (routeId) { setResolvedId(routeId); setSlugResolved(true); return; }
    if (!routeSlug) return;
    let cancelled = false;
    setSlugResolved(false);
    (async () => {
      const { data } = await supabase
        .from("suppliers")
        .select("id")
        .eq("slug", routeSlug)
        .eq("approval_status", "approved")
        .eq("is_active", true)
        .eq("is_deleted", false)
        .maybeSingle();
      if (!cancelled) {
        setResolvedId(data?.id ?? null);
        setSlugResolved(true);
        if (!data) setLoading(false); // no supplier → stop the initial loading state
      }
    })();
    return () => { cancelled = true; };
  }, [routeId, routeSlug]);

  const supplierId = resolvedId;


  useEffect(() => {
    if (!supplierId) return;
    let cancelled = false;
    const safety = window.setTimeout(() => {
      if (!cancelled) {
        setLoadError("טעינת הספק נמשכת יותר מדי זמן. נסו לרענן את המסך.");
        setLoading(false);
      }
    }, 12000);
    (async () => {
      try {
        setLoadError(null);
        const [{ data: s }, { data: g }, { data: sregs }, { data: scits }, { data: dealsData }, { data: revData }, { data: catRows }] = await Promise.all([
          withTimeout(supabase.from("suppliers").select("id,user_id,business_name,contact_name,phone,email,description,short_description,categories,serves_all_country,is_active,approval_status,logo_url,website_url,whatsapp_url,instagram_url,facebook_url,catalog_url,service_areas,supplier_kind,offers_services,offers_products").eq("id", supplierId).maybeSingle(), "טעינת ספק"),
          withTimeout(supabase.from("supplier_gallery").select("id,image_url,caption").eq("supplier_id", supplierId).order("display_order"), "טעינת גלריה"),
          withTimeout(supabase.from("supplier_regions").select("region_id, regions(name_he)").eq("supplier_id", supplierId), "טעינת אזורי שירות"),
          withTimeout(supabase.from("supplier_cities").select("city_id, cities(name_he)").eq("supplier_id", supplierId), "טעינת ערי שירות"),
          withTimeout(supabase
            .from("deals")
            .select("id,title,status,category_id,supplier_id,offer_type,listing_type,original_price,discounted_price,discount_percentage,base_price,tiers,ends_at,cover_image_url,gallery_images")
            .eq("supplier_id", supplierId)
            .eq("status", "active")
            .order("created_at", { ascending: false }), "טעינת הצעות"),
          withTimeout(supabase
            .from("reviews")
            .select("id,rating,comment,created_at,user_id")
            .eq("supplier_id", supplierId)
            .order("created_at", { ascending: false })
            .limit(20), "טעינת ביקורות"),
          withTimeout(supabase.from("supplier_categories").select("category_id").eq("supplier_id", supplierId), "טעינת תחומי ספק"),
        ]);
        if (cancelled) return;
      const sup = (s as DbSupplier | null) ?? null;
      setSupplier(sup);
      const newCategoryIds = ((catRows ?? []) as SupplierCategoryRow[]).map((row) => row.category_id);
      setSupplierCategoryIds(newCategoryIds.length ? newCategoryIds : (sup?.categories ?? []));
      setGallery((g as GalleryItem[] | null) ?? []);

      const regionNames = ((sregs ?? []) as AreaJoinRow[]).map((r) => r.regions?.name_he).filter(Boolean) as string[];
      const cityNames = ((scits ?? []) as AreaJoinRow[]).map((c) => c.cities?.name_he).filter(Boolean) as string[];
      const fromTable = [...regionNames, ...cityNames];
      const fromArr = (sup?.service_areas ?? []).filter((x) => x && x !== "כל הארץ");
      const merged = Array.from(new Set([...fromTable, ...fromArr]));
      setServiceAreas(merged);

      const dealRows = (dealsData ?? []) as Array<Record<string, unknown>>;
      setDeals(
        dealRows.map((r) => ({
          id: String(r.id),
          title: String(r.title ?? ""),
          status: String(r.status ?? "active"),
          category_id: (r.category_id as string | null) ?? null,
          supplier_id: String(r.supplier_id),
          supplier_name: sup?.business_name ?? null,
          supplier_logo_url: sup?.logo_url ?? null,
          offer_type: (r.offer_type as string | null) ?? "percentage",
          original_price: (r.original_price as number | null) ?? null,
          discounted_price: (r.discounted_price as number | null) ?? null,
          discount_percentage: (r.discount_percentage as number | null) ?? null,
          base_price: (r.base_price as number | null) ?? null,
          tiers: (Array.isArray(r.tiers) ? (r.tiers as OfferTier[]) : []) as OfferTier[],
          ends_at: (r.ends_at as string | null) ?? null,
          listing_type: (r.listing_type as string | null) ?? "group_buy",
          cover_image_url: (r.cover_image_url as string | null) ?? null,
          gallery_images: (Array.isArray(r.gallery_images) ? (r.gallery_images as string[]) : null),
        })),

      );

      const revRows = (revData ?? []) as ReviewItem[];
      let withNames: ReviewItem[] = revRows;
      const uids = Array.from(new Set(revRows.map((r) => r.user_id)));
      if (uids.length) {
        const { data: profs } = await supabase.from("profiles").select("id,full_name").in("id", uids);
        const map = new Map<string, string>();
        (profs ?? []).forEach((p) => map.set(p.id, p.full_name || "דייר"));
        withNames = revRows.map((r) => ({ ...r, reviewer_name: map.get(r.user_id) || "דייר" }));
      }
      if (!cancelled) setReviews(withNames);


      } catch (error) {
        if (!cancelled) setLoadError(getFriendlyLoadError(error, "שגיאה בטעינת הספק"));
      } finally {
        window.clearTimeout(safety);
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; window.clearTimeout(safety); };
  }, [supplierId]);

  // Fire view + phone_impression once per supplier load. phone_impression is a passive signal —
  // reveal_phone is reserved for an explicit "show number" click.
  useEffect(() => {
    if (!supplier?.id) return;
    void trackSupplierEvent(supplier.id, "view");
    if (supplier.phone) void trackSupplierEvent(supplier.id, "phone_impression");
  }, [supplier?.id, supplier?.phone]);

  const supplierCategories = useMemo(() => {
    if (!supplier) return [] as { id: string; name: string; icon: string }[];
    return supplierCategoryIds
      .map((cid) => categories.find((c) => c.id === cid))
      .filter(Boolean) as { id: string; name: string; icon: string }[];
  }, [supplier, supplierCategoryIds, categories]);

  const whatsappHref = useMemo(
    () => normalizeWhatsappUrl(supplier?.whatsapp_url ?? supplier?.phone ?? null),
    [supplier],
  );

  const submitInterest = async () => {
    if (!supplier) return;
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user.id;
    if (!userId) return;
    setSubmitting(true);
    try {
      const userEmail = session.session?.user.email ?? null;
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name,phone,city,project_id")
        .eq("id", userId)
        .maybeSingle();
      const { error: insErr } = await supabase.from("supplier_inquiries").insert({
        supplier_id: supplier.id,
        user_id: userId,
        full_name: prof?.full_name ?? null,
        phone: prof?.phone ?? null,
        email: userEmail,
        city: prof?.city ?? null,
        project_name: prof?.project_id ?? null,
        category_id: supplierCategoryIds[0] ?? supplier.categories?.[0] ?? null,
        message: `התעניינות בשירותים של ${supplier.business_name}`,
        source: deals.length > 0 ? "supplier_with_deals" : "general",
        status: "new",
      });
      if (insErr) throw insErr;
      setInterested(true);
      toast.success("רישמנו את ההתעניינות שלך — הספק יקבל את הפנייה");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "שליחת ההתעניינות נכשלה");
    } finally {
      setSubmitting(false);
    }
  };

  const handleInterest = () => {
    if (!supplier) return;
    void trackSupplierEvent(supplier.id, "open_project");
    requireAuth("פתיחת פרויקט וקבלת הצעות דורשת חשבון קצר", submitInterest);
  };

  const handleShare = () => {
    if (!supplier) return;
    setShareOpen(true);
  };

  const handleNavigate = () => {
    if (!supplier) return;
    void trackSupplierEvent(supplier.id, "navigate");
    const q = encodeURIComponent(supplier.business_name);
    window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, "_blank", "noopener");
  };

  if (loading) {
    return (
      <MobileShell>
        <LoadingState />
      </MobileShell>
    );
  }

  if (loadError || !supplier) {
    // Public supplier page not found (unknown slug, unapproved, removed).
    // Do NOT let Google index this URL — emit noindex and a proper 404 UI.
    const notFound = !loadError && !supplier;
    return (
      <MobileShell>
        <Helmet prioritizeSeoTags>
          <title>{notFound ? "ספק לא נמצא — GroupBuild" : "שגיאה בטעינת ספק — GroupBuild"}</title>
          <meta name="robots" content="noindex, nofollow" />
          <meta name="description" content="הכתובת שביקשת אינה זמינה יותר או שהעסק אינו פעיל." />
        </Helmet>
        <div className="bg-slate-50 min-h-screen px-4 pt-4" style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)" }} dir="rtl">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1 text-[13px] font-semibold text-slate-500 mb-4"
          >
            <ArrowRight className="h-4 w-4" />
            חזרה
          </button>
          <h1 className="text-[22px] font-extrabold text-slate-900 mb-2">
            {loadError ? "אירעה שגיאה בטעינת הספק" : "העסק לא נמצא (404)"}
          </h1>
          <p className="text-sm text-slate-500 mb-4">
            {loadError
              ? loadError
              : "ייתכן שהעסק הוסר, בהמתנה לאישור, או שהכתובת שגויה. גלו עסקים מומלצים בקטגוריות שלנו."}
          </p>
          <div className="flex gap-2">
            <Button onClick={() => navigate("/categories")} className="flex-1">חזרה לקטגוריות</Button>
            <Button onClick={() => navigate(-1)} variant="outline" className="flex-1">
              <ArrowRight className="h-4 w-4 ml-2" /> חזרה
            </Button>
          </div>
        </div>
      </MobileShell>
    );
  }

  // Secondary channels only — WhatsApp stays in the primary bottom CTA.
  const links: { label: string; href: string; Icon: React.ComponentType<{ className?: string }>; event: "website" | "share" }[] = [];
  if (supplier.website_url) links.push({ label: "אתר", href: supplier.website_url, Icon: Globe, event: "website" });
  if (supplier.instagram_url) links.push({ label: "אינסטגרם", href: supplier.instagram_url, Icon: Instagram, event: "share" });
  if (supplier.facebook_url) links.push({ label: "פייסבוק", href: supplier.facebook_url, Icon: Facebook, event: "share" });

  const canonical = `https://groupbuild.co.il/supplier/${routeSlug ?? supplier.id}`;
  const seoTitle = `${supplier.business_name} — ספק ב־GroupBuild`;
  const seoDesc = (supplier.short_description || supplier.description || `${supplier.business_name} — צור קשר, גלריה, ביקורות ומבצעים ב־GroupBuild`).slice(0, 160);

  const isSvc = Boolean(supplier.offers_services) || supplier.supplier_kind === "service";
  const isProd = Boolean(supplier.offers_products) || supplier.supplier_kind === "product";
  const kindLabel = isSvc && isProd ? "שירות + מוצרים" : isSvc ? "בעל מקצוע" : isProd ? "ספק מוצרים" : null;

  return (
    <MobileShell>
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDesc} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDesc} />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="business.business" />
        {supplier.logo_url && <meta property="og:image" content={supplier.logo_url} />}
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name: supplier.business_name,
          description: supplier.description || undefined,
          telephone: supplier.phone || undefined,
          url: canonical,
          image: supplier.logo_url || undefined,
          areaServed: supplier.serves_all_country ? "IL" : (serviceAreas.length ? serviceAreas : undefined),
        })}</script>
      </Helmet>

      <div className="bg-slate-50 min-h-screen" dir="rtl">
        {/* Hero identity */}
        <div className="px-4 pb-3" style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)" }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1 text-[13px] font-semibold text-slate-500 mb-3 active:opacity-70"
          >
            <ArrowRight className="h-4 w-4" />
            חזרה
          </button>

          <div className={`${floatCard} p-4`}>
            <div className="flex items-center gap-4">
              <SupplierLogo name={supplier.business_name} logoUrl={supplier.logo_url} size="xl" />
              <div className="flex-1 min-w-0">
                <EditableField
                  table="suppliers"
                  id={supplier.id}
                  field="business_name"
                  value={supplier.business_name}
                  as="h1"
                  className="block text-[22px] font-extrabold text-slate-900 tracking-tight leading-tight mb-1.5 line-clamp-2"
                />
                <SupplierRatingBadge supplierId={supplier.id} variant="stars" />
                {kindLabel && (
                  <span
                    className="mt-2 inline-flex text-[11px] font-bold px-2.5 py-1 rounded-full"
                    style={{ background: "rgba(14,107,90,0.08)", color: BRAND }}
                  >
                    {kindLabel}
                  </span>
                )}
              </div>
            </div>
            {supplier.short_description && (
              <p className="mt-3 text-[13px] text-slate-600 leading-relaxed">
                {supplier.short_description}
              </p>
            )}
          </div>
        </div>

        <div className="px-4 relative z-10 space-y-3 pb-36">
          {/* Contact strip */}
          <div className="grid grid-cols-3 gap-2">
            {supplier.phone ? (
              <a
                href={`tel:${supplier.phone}`}
                onClick={() => { void trackSupplierEvent(supplier.id, "call"); }}
                className="h-14 rounded-2xl text-white text-xs font-bold flex flex-col items-center justify-center gap-0.5 shadow-sm active:scale-[0.97] transition-transform"
                style={{ background: BRAND }}
                aria-label={`התקשר ל־${supplier.business_name}`}
              >
                <Phone className="h-4 w-4" />
                התקשר
              </a>
            ) : (
              <div className="h-14 rounded-2xl bg-white text-[11px] text-slate-400 flex items-center justify-center border border-gray-100">
                אין טלפון
              </div>
            )}
            <button type="button" onClick={handleNavigate} className={`h-14 flex-col gap-0.5 ${softBtn}`}>
              <Navigation className="h-4 w-4 text-[#0E6B5A]" />
              ניווט
            </button>
            <button type="button" onClick={handleShare} className={`h-14 flex-col gap-0.5 ${softBtn}`}>
              <Share2 className="h-4 w-4 text-[#0E6B5A]" />
              שתף
            </button>
          </div>

          {/* Secondary links — compact row, no empty grid holes */}
          {links.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {links.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  onClick={() => { void trackSupplierEvent(supplier.id, l.event); }}
                  className={`h-11 px-4 ${softBtn}`}
                >
                  <l.Icon className="h-4 w-4 text-[#0E6B5A]" />
                  {l.label}
                </a>
              ))}
            </div>
          )}

          {/* About */}
          {(supplier.description?.trim() || supplier.short_description?.trim()) && (() => {
            const desc = (supplier.description ?? supplier.short_description ?? "").trim();
            const isLong = desc.length > 220;
            const shown = !isLong || showFullDesc ? desc : desc.slice(0, 220).trimEnd() + "…";
            return (
              <section className={`${floatCard} p-4`}>
                <h2 className={sectionLabel}>על העסק</h2>
                <EditableField
                  table="suppliers"
                  id={supplier.id}
                  field="description"
                  value={supplier.description ?? ""}
                  type="textarea"
                  as="p"
                  className="text-sm text-slate-700 whitespace-pre-line leading-relaxed block"
                  placeholder="—"
                  render={() => shown || "—"}
                />
                {isLong && (
                  <button
                    type="button"
                    onClick={() => setShowFullDesc((v) => !v)}
                    className="mt-2 text-xs font-bold active:opacity-70 transition-opacity"
                    style={{ color: BRAND }}
                  >
                    {showFullDesc ? "הצג פחות" : "הצג עוד"}
                  </button>
                )}
              </section>
            );
          })()}

          {/* Gallery — visual anchor */}
          {gallery.length > 0 && (
            <section className={`${floatCard} p-3`}>
              <div className="flex items-center justify-between px-1 mb-2.5">
                <h2 className={`${sectionLabel} mb-0`}>גלריית עבודות</h2>
                <span className="text-[11px] font-semibold text-slate-400">{gallery.length} תמונות</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {gallery.slice(0, 6).map((g, i) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setLightbox(g.image_url)}
                    className={
                      "relative overflow-hidden rounded-xl border border-gray-100 transition-transform active:scale-[0.98] " +
                      (i === 0 && gallery.length > 1 ? "col-span-2 row-span-2 aspect-square" : "aspect-square")
                    }
                  >
                    <SmartImg src={g.image_url} size="card" alt={g.caption ?? "עבודה"} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </section>
          )}

          <SupplierCatalogsList supplierId={supplier.id} legacyUrl={supplier.catalog_url} />

          {supplierCategories.length > 0 && (
            <section className={`${floatCard} p-4`}>
              <h2 className={sectionLabel}>תחומים</h2>
              <div className="grid grid-cols-4 gap-2">
                {supplierCategories.map((c) => {
                  const Icon = iconForCategory(c.id, c.name);
                  return (
                    <div
                      key={c.id}
                      className="rounded-2xl border border-gray-100 bg-white px-1.5 py-3 flex flex-col items-center gap-1.5 text-center shadow-sm"
                    >
                      <Icon size={22} strokeWidth={1.6} className="text-[#0E6B5A]" aria-hidden />
                      <span className="text-[10px] font-bold text-slate-800 leading-snug line-clamp-2">{c.name}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {(supplier.serves_all_country || serviceAreas.length > 0) && (
            <section className={`${floatCard} p-4`}>
              <h2 className={`${sectionLabel} flex items-center gap-1.5`}>
                <MapPin className="h-3.5 w-3.5" style={{ color: BRAND }} /> אזורי שירות
              </h2>
              {supplier.serves_all_country ? (
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-fs-xs font-bold border border-gray-100"
                  style={{ background: "rgba(14,107,90,0.08)", color: BRAND }}
                >
                  נותן שירות בכל הארץ
                </span>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {serviceAreas.map((name) => (
                    <span
                      key={name}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-fs-xs font-bold bg-slate-50 text-slate-800 border border-gray-100"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Offers — only when there is content */}
          {deals.length > 0 && (
            <section ref={dealsRef} className={`${floatCard} p-4 scroll-mt-20`}>
              <h2 className={`${sectionLabel} flex items-center gap-1.5`}>
                <Tag className="h-3.5 w-3.5" style={{ color: BRAND }} /> ההצעות הפעילות
                <span className="text-slate-400 font-medium normal-case tracking-normal">· {deals.length}</span>
              </h2>
              <div className="grid grid-cols-2 gap-2.5">
                {deals.map((d) => {
                  const cat = categories.find((c) => c.id === d.category_id);
                  return <CompactDealCard key={d.id} deal={d} categoryIcon={cat?.icon ?? null} categoryName={cat?.name ?? null} />;
                })}
              </div>
            </section>
          )}

          {/* Reviews — only when there is content */}
          {reviews.length > 0 && (
            <section className={`${floatCard} p-4`}>
              <h2 className={`${sectionLabel} flex items-center gap-1.5`}>
                <Star className="h-3.5 w-3.5" style={{ color: BRAND }} /> ביקורות אחרונות
              </h2>
              <div className="space-y-3">
                {(showAllReviews ? reviews : reviews.slice(0, 3)).map((r) => (
                  <div key={r.id} className="rounded-2xl bg-slate-50 border border-gray-100 p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-bold text-slate-900">{r.reviewer_name || "דייר"}</span>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3.5 w-3.5 ${i < r.rating ? "fill-[#F5B600] text-[#F5B600]" : "text-slate-200"}`}
                          />
                        ))}
                      </div>
                    </div>
                    {r.comment && (
                      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{r.comment}</p>
                    )}
                    <div className="text-fs-xs text-slate-400 mt-1.5">
                      {new Date(r.created_at).toLocaleDateString("he-IL")}
                    </div>
                  </div>
                ))}
              </div>
              {reviews.length > 3 && (
                <button
                  type="button"
                  onClick={() => setShowAllReviews((v) => !v)}
                  className="mt-3 w-full h-10 rounded-2xl text-sm font-bold bg-white border border-gray-100 shadow-sm active:scale-[0.98] transition-transform"
                  style={{ color: BRAND }}
                >
                  {showAllReviews ? "הצג פחות" : `הצג עוד (${reviews.length - 3})`}
                </button>
              )}
            </section>
          )}
        </div>
      </div>

      {/* Dual CTA — mock Style A */}
      <div className="fixed bottom-0 inset-x-0 z-30 flex justify-center pointer-events-none">
        <div className="pointer-events-auto w-full max-w-screen-sm px-4 pb-4 pt-3 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent">
          <div className="flex gap-2">
            {whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer noopener"
                onClick={() => { void trackSupplierEvent(supplier.id, "whatsapp"); }}
                className="flex-1 h-12 rounded-2xl text-white font-bold inline-flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-transform"
                style={{ background: BRAND }}
              >
                <WhatsappIcon className="h-5 w-5" />
                WhatsApp
              </a>
            ) : supplier.phone ? (
              <a
                href={`tel:${supplier.phone}`}
                onClick={() => { void trackSupplierEvent(supplier.id, "call"); }}
                className="flex-1 h-12 rounded-2xl text-white font-bold inline-flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-transform"
                style={{ background: BRAND }}
              >
                <Phone className="h-5 w-5" />
                התקשר
              </a>
            ) : (
              <div className="flex-1 h-12 rounded-2xl bg-slate-100 text-slate-400 text-sm inline-flex items-center justify-center">
                אין ערוץ קשר
              </div>
            )}
            <Button
              onClick={handleInterest}
              disabled={submitting || interested}
              variant="outline"
              className="flex-1 h-12 rounded-2xl border-2 font-bold bg-white"
              style={{ borderColor: BRAND, color: BRAND }}
            >
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : interested ? "✓ נרשם" : "קבל כמה הצעות"}
            </Button>
          </div>
        </div>
      </div>

      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-50 bg-slate-900/80 flex items-center justify-center p-4"
        >
          <SmartImg src={lightbox} size="detail" alt="" priority eager className="max-h-[90vh] max-w-full rounded-2xl" />
        </div>
      )}

      <ShareBusinessSheet
        open={shareOpen}
        onOpenChange={setShareOpen}
        supplierId={supplier.id}
        businessName={supplier.business_name}
        url={typeof window !== "undefined" ? window.location.href : canonical}
      />
    </MobileShell>
  );
}

function SupplierCatalogsList({ supplierId, legacyUrl }: { supplierId: string; legacyUrl: string | null }) {
  const [rows, setRows] = useState<Array<{ id: string; name: string; description: string | null; file_url: string; kind: "pdf" | "link" }>>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("supplier_catalogs")
        .select("id,name,description,file_url,display_order,created_at,kind")
        .eq("supplier_id", supplierId)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });
      setRows((data ?? []) as Array<{ id: string; name: string; description: string | null; file_url: string; kind: "pdf" | "link" }>);
    })();
  }, [supplierId]);

  if (rows.length === 0 && !legacyUrl) return null;

  return (
    <section className="rounded-2xl border border-gray-100 bg-white shadow-sm p-4 space-y-2">
      <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <FileText className="h-3.5 w-3.5" style={{ color: BRAND }} /> קטלוגים
      </h2>
      <div className="space-y-1.5">
        {rows.map((r) => {
          const isLink = r.kind === "link";
          return (
            <a
              key={r.id}
              href={r.file_url}
              target="_blank"
              rel="noreferrer noopener"
              className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-50 border border-gray-100 transition-transform active:scale-[0.98]"
            >
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "rgba(14,107,90,0.08)" }}
              >
                <FileText className="h-4 w-4" style={{ color: BRAND }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold truncate flex items-center gap-1.5 text-slate-900">
                  <span className="truncate">{r.name}</span>
                  <span className="text-fs-xs font-normal px-1.5 py-0.5 rounded-md bg-white border border-gray-100 text-slate-400 shrink-0">
                    {isLink ? "קישור" : "PDF"}
                  </span>
                </div>
                {r.description && (
                  <div className="text-fs-xs text-slate-500 line-clamp-1">{r.description}</div>
                )}
                <div className="text-fs-xs font-bold mt-0.5" style={{ color: BRAND }}>
                  {isLink ? "צפייה בקטלוג ↗" : "צפייה בקטלוג"}
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-slate-400 shrink-0" />
            </a>
          );
        })}
        {rows.length === 0 && legacyUrl && (
          <a
            href={legacyUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-50 border border-gray-100 transition-transform active:scale-[0.98]"
          >
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(14,107,90,0.08)" }}
            >
              <FileText className="h-4 w-4" style={{ color: BRAND }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold truncate text-slate-900">צפייה בקטלוג</div>
              <div className="text-fs-xs text-slate-500">PDF · ייפתח בכרטיסיה חדשה</div>
            </div>
            <ExternalLink className="h-4 w-4 text-slate-400 shrink-0" />
          </a>
        )}
      </div>
    </section>
  );
}

function CompactDealCard({
  deal,
  categoryIcon,
  categoryName,
}: {
  deal: RealDealCardData;
  categoryIcon: string | null;
  categoryName: string | null;
}) {
  const offerType = ((deal.offer_type as OfferType | null) ?? "percentage") as OfferType;
  const tiers = Array.isArray(deal.tiers) ? (deal.tiers as OfferTier[]) : [];
  const display = describeOffer(
    {
      offer_type: offerType,
      original_price: deal.original_price,
      discounted_price: deal.discounted_price,
      discount_percentage: deal.discount_percentage,
      base_price: deal.base_price,
      tiers,
    },
    0,
  );
  const cover = deal.cover_image_url ?? null;
  const discountPct =
    offerType === "percentage" && deal.discount_percentage
      ? `${Math.round(Number(deal.discount_percentage))}%`
      : null;

  return (
    <Link
      to={`/resident/deals/${deal.id}`}
      className="group block bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-50">
        {cover ? (
          <SmartImg
            src={cover}
            size="card"
            alt={deal.title}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1" style={{ color: `${BRAND}B3` }}>
            <span className="text-3xl leading-none">{categoryIcon ?? "🏷️"}</span>
            {categoryName && (
              <span className="text-[10px] font-bold" style={{ color: `${BRAND}CC` }}>{categoryName}</span>
            )}
          </div>
        )}
        {discountPct && (
          <span
            className="absolute top-1.5 right-1.5 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full text-white shadow-sm"
            style={{ background: BRAND }}
          >
            {discountPct}
          </span>
        )}
      </div>
      <div className="p-2.5">
        <h3 className="text-[12px] font-semibold text-slate-900 leading-snug line-clamp-2 min-h-[2.4em] mb-1">
          {deal.title}
        </h3>
        <div className="text-[13px] font-extrabold leading-tight truncate" style={{ color: BRAND }}>
          {display.headline}
        </div>
      </div>
    </Link>
  );
}

