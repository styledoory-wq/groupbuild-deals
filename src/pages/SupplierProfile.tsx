import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ExternalLink, FileText, Globe, Instagram, Facebook, MapPin, Star, ArrowRight, Tag, Loader2 } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BackHeader, LoadingState, ErrorState } from "@/components/ds";
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
  const { supplierId } = useParams();
  const navigate = useNavigate();
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
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const dealsRef = useRef<HTMLDivElement>(null);

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
        const [{ data: s }, { data: g }, { data: sregs }, { data: scits }, { data: dealsData }, { data: revData }] = await Promise.all([
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
        ]);
        if (cancelled) return;
      const sup = (s as DbSupplier | null) ?? null;
      setSupplier(sup);
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

  const supplierCategories = useMemo(() => {
    if (!supplier) return [] as { id: string; name: string; icon: string }[];
    return (supplier.categories ?? [])
      .map((cid) => categories.find((c) => c.id === cid))
      .filter(Boolean) as { id: string; name: string; icon: string }[];
  }, [supplier, categories]);

  const whatsappHref = useMemo(
    () => normalizeWhatsappUrl(supplier?.whatsapp_url ?? supplier?.phone ?? null),
    [supplier],
  );

  const handleInterest = async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      toast.error("יש להתחבר כדי להביע עניין");
      navigate("/auth");
      return;
    }
    if (!supplier) return;
    setSubmitting(true);
    try {
      const userId = session.session.user.id;
      const userEmail = session.session.user.email ?? null;
      // Pull profile contact details so the supplier sees a real lead
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
        category_id: supplier.categories?.[0] ?? null,
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

  if (loading) {
    return (
      <MobileShell>
        <LoadingState />
      </MobileShell>
    );
  }

  if (loadError || !supplier) {
    return (
      <MobileShell>
        <BackHeader title={loadError ? "שגיאה בטעינת ספק" : "ספק לא נמצא"} />
        <div className="px-5 mt-6">
          {loadError && <ErrorState title="שגיאה בטעינה" description={loadError} />}
          <Button onClick={() => navigate(-1)} variant="outline" className="w-full">
            <ArrowRight className="h-4 w-4 ml-2" /> חזרה
          </Button>
        </div>
      </MobileShell>
    );
  }

  const links: { label: string; href: string; Icon: React.ComponentType<{ className?: string }> }[] = [];
  if (supplier.website_url) links.push({ label: "לאתר הספק", href: supplier.website_url, Icon: Globe });
  if (whatsappHref) links.push({ label: "וואטסאפ", href: whatsappHref, Icon: WhatsappIcon });
  if (supplier.instagram_url) links.push({ label: "אינסטגרם", href: supplier.instagram_url, Icon: Instagram });
  if (supplier.facebook_url) links.push({ label: "פייסבוק", href: supplier.facebook_url, Icon: Facebook });

  return (
    <MobileShell>
      {/* Hero */}
      <div className="px-5 pt-4 pb-4 relative">
        <BackHeader title={supplier.business_name} subtitle="פרופיל ספק" />
        <div className="gb-card p-4 flex items-center gap-4">
          <SupplierLogo name={supplier.business_name} logoUrl={supplier.logo_url} size="xl" className="shadow-[0_3px_8px_-2px_rgba(10,31,61,0.10)]" />
          <div className="flex-1 min-w-0">
            <EditableField
              table="suppliers"
              id={supplier.id}
              field="business_name"
              value={supplier.business_name}
              as="h1"
              className="block text-[20px] font-extrabold text-[#1F2937] tracking-tight leading-tight mb-1.5 line-clamp-2"
            />
            <div className="flex items-center gap-1.5 flex-wrap">
              <SupplierRatingBadge supplierId={supplier.id} className="text-fs-xs text-[#6B7280] [&>b]:text-[#1F2937] [&>span]:text-[#6B7280]" />
              {(() => {
                const isSvc = Boolean(supplier.offers_services) || supplier.supplier_kind === "service";
                const isProd = Boolean(supplier.offers_products) || supplier.supplier_kind === "product";
                if (isSvc && isProd) return (
                  <span className="text-fs-xs font-extrabold px-2 py-0.5 rounded-full bg-[#F4F6FA] text-[#1F2937]">
                    שירות + מוצרים
                  </span>
                );
                if (isSvc) return (
                  <span className="text-fs-xs font-extrabold px-2 py-0.5 rounded-full bg-[#EAF2FF] text-[#2F6BFF]">
                    בעל מקצוע
                  </span>
                );
                if (isProd) return (
                  <span className="text-fs-xs font-extrabold px-2 py-0.5 rounded-full bg-[#E8F7EC] text-[#2EA85A]">
                    ספק מוצרים
                  </span>
                );
                return null;
              })()}
            </div>
          </div>
        </div>
      </div>


      <div className="px-5 relative z-10 space-y-4 pb-32">
        {/* Quick links */}
        {links.length > 0 && (
          <div className="gb-card p-3">
            <div className="grid grid-cols-2 gap-2">
              {links.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="h-11 rounded-[16px] bg-white text-[#1F2937] text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-[0_2px_10px_-4px_rgba(10,31,61,0.08)] active:scale-[0.97] transition-transform"
                >
                  <l.Icon className="h-4 w-4 text-[#0E6B5A]" />
                  {l.label}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Catalogs */}
        <SupplierCatalogsList supplierId={supplier.id} legacyUrl={supplier.catalog_url} />

        {/* Description */}
        {(supplier.description || true) && (() => {
          const desc = supplier.description ?? "";
          const isLong = desc.length > 220;
          const shown = !isLong || showFullDesc ? desc : desc.slice(0, 220).trimEnd() + "…";
          return (
            <section className="gb-card p-4">
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">על העסק</h2>
              <EditableField
                table="suppliers"
                id={supplier.id}
                field="description"
                value={desc}
                type="textarea"
                as="p"
                className="text-sm text-foreground whitespace-pre-line leading-relaxed block"
                placeholder="—"
                render={() => shown || "—"}
              />
              {isLong && (
                <button
                  onClick={() => setShowFullDesc((v) => !v)}
                  className="mt-2 text-xs font-bold text-[#0E6B5A] active:opacity-70 transition-opacity"
                >
                  {showFullDesc ? "הצג פחות" : "הצג עוד"}
                </button>
              )}
            </section>
          );
        })()}

        {/* Gallery — below business details */}
        {gallery.length > 0 && (
          <section className="gb-card p-4">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">גלריית עבודות</h2>
            <div className="grid grid-cols-3 gap-2">
              {gallery.slice(0, 6).map((g) => (
                <button
                  key={g.id}
                  onClick={() => setLightbox(g.image_url)}
                  className="aspect-square rounded-[14px] overflow-hidden shadow-[0_2px_10px_-4px_rgba(10,31,61,0.10)] transition-transform active:scale-[0.98]"
                >
                  <SmartImg src={g.image_url} size="card" alt={g.caption ?? "עבודה"} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Categories */}
        {supplierCategories.length > 0 && (
          <section className="gb-card p-4">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-[#0E6B5A]" /> תחומים
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {supplierCategories.map((c) => (
                <span
                  key={c.id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-fs-xs font-extrabold bg-white text-[#1F2937] shadow-[0_1px_3px_rgba(10,31,61,0.06)]"
                >
                  <span>{c.icon}</span> {c.name}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Service area */}
        <section className="gb-card p-4">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-[#0E6B5A]" /> אזורי שירות
          </h2>
          {supplier.serves_all_country ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-fs-xs font-extrabold bg-[#F4F6FA] text-[#1F2937] shadow-[0_1px_3px_rgba(10,31,61,0.06)]">
              נותן שירות בכל הארץ
            </span>
          ) : serviceAreas.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {serviceAreas.map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-fs-xs font-extrabold bg-[#EAF2FF] text-[#2F6BFF] shadow-[0_1px_3px_rgba(10,31,61,0.06)]"
                >
                  {name}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">לא הוגדרו אזורי שירות — צרו קשר לפרטים</p>
          )}
        </section>

        {/* Active offers from this supplier */}
        <section ref={dealsRef} className="gb-card p-4 scroll-mt-20">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5 text-[#0E6B5A]" /> ההצעות הפעילות
            {deals.length > 0 && <span className="text-[#6B7280] font-medium">· {deals.length}</span>}
          </h2>
          {deals.length === 0 ? (
            <p className="text-sm text-muted-foreground">אין עדיין הצעות פעילות מהספק הזה.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {deals.map((d) => {
                const cat = categories.find((c) => c.id === d.category_id);
                return <CompactDealCard key={d.id} deal={d} categoryIcon={cat?.icon ?? null} categoryName={cat?.name ?? null} />;
              })}
            </div>
          )}
        </section>


        {/* Reviews */}
        <section className="gb-card p-4">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5 text-[#0E6B5A]" /> ביקורות אחרונות
          </h2>
          {reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">אין עדיין ביקורות לספק זה.</p>
          ) : (
            <>
              <div className="space-y-3">
                {(showAllReviews ? reviews : reviews.slice(0, 3)).map((r) => (
                  <div key={r.id} className="rounded-[16px] bg-white p-3 shadow-[0_1px_3px_rgba(10,31,61,0.06)]">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-bold text-[#1F2937]">{r.reviewer_name || "דייר"}</span>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3.5 w-3.5 ${i < r.rating ? "fill-[#F5B600] text-[#F5B600]" : "text-[#E5E7EB]"}`}
                          />
                        ))}
                      </div>
                    </div>
                    {r.comment && (
                      <p className="text-sm text-[#4B5563] leading-relaxed whitespace-pre-line">{r.comment}</p>
                    )}
                    <div className="text-fs-xs text-muted-foreground mt-1.5">
                      {new Date(r.created_at).toLocaleDateString("he-IL")}
                    </div>
                  </div>
                ))}
              </div>
              {reviews.length > 3 && (
                <button
                  onClick={() => setShowAllReviews((v) => !v)}
                  className="mt-3 w-full h-10 rounded-[14px] text-sm font-bold text-[#0E6B5A] bg-white shadow-[0_1px_3px_rgba(10,31,61,0.06)] active:scale-[0.98] transition-transform"
                >
                  {showAllReviews ? "הצג פחות" : `הצג עוד (${reviews.length - 3})`}
                </button>
              )}
            </>
          )}
        </section>
      </div>


      {/* Dual CTA */}
      <div className="fixed bottom-0 inset-x-0 z-30 flex justify-center pointer-events-none">
        <div className="pointer-events-auto w-full max-w-screen-sm px-4 pb-4 pt-3 bg-gradient-to-t from-[#F7F5F0] via-[#F7F5F0] to-transparent">
          <div className="flex gap-2">
            {whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer noopener"
                onClick={async () => {
                  if (!supplier) return;
                  const { data: sd } = await supabase.auth.getSession();
                  const uid = sd.session?.user.id;
                  if (!uid) return;
                  void supabase.from("supplier_inquiries").insert({
                    supplier_id: supplier.id,
                    user_id: uid,
                    message: `לחיצה על וואטסאפ מפרופיל הספק`,
                    source: "whatsapp_click",
                    status: "new",
                  });
                }}
                className="flex-1 h-12 rounded-[16px] bg-[#25D366] text-white font-bold inline-flex items-center justify-center gap-2 shadow-[0_4px_14px_-4px_rgba(37,211,102,0.5)] active:scale-[0.98] transition-transform"
              >
                <WhatsappIcon className="h-5 w-5" />
                בקשת הצעה
              </a>
            ) : (
              <Button
                onClick={handleInterest}
                disabled={submitting || interested}
                variant="outline"
                className="flex-1 h-12"
              >
                {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : interested ? "✓ נרשם" : "השאר פרטים"}
              </Button>
            )}
            <Button
              onClick={() => dealsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
              disabled={deals.length === 0}
              className="flex-1 h-12"
            >
              <Tag className="h-4 w-4 ml-1.5" />
              {deals.length > 0 ? `ראה עסקאות (${deals.length})` : "אין עסקאות פעילות"}
            </Button>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-50 bg-[#0E6B5A]/80 flex items-center justify-center p-4"
        >
          <SmartImg src={lightbox} size="detail" alt="" priority eager className="max-h-[90vh] max-w-full rounded-[20px]" />
        </div>
      )}
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
    <section className="gb-card p-4 space-y-2">
      <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <FileText className="h-3.5 w-3.5 text-[#0E6B5A]" /> קטלוגים
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
              className="flex items-center gap-3 p-2.5 rounded-[16px] bg-white shadow-[0_2px_10px_-4px_rgba(10,31,61,0.08)] transition-transform active:scale-[0.98]"
            >
              <div className="h-10 w-10 rounded-[12px] bg-[#F4F6FA] flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4 text-[#0E6B5A]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold truncate flex items-center gap-1.5">
                  <span className="truncate">{r.name}</span>
                  <span className="text-fs-xs font-normal px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                    {isLink ? "קישור" : "PDF"}
                  </span>
                </div>
                {r.description && (
                  <div className="text-fs-xs text-muted-foreground line-clamp-1">{r.description}</div>
                )}
                <div className="text-fs-xs text-[#0A5446] font-bold mt-0.5">
                  {isLink ? "צפייה בקטלוג ↗" : "צפייה בקטלוג"}
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
            </a>
          );
        })}
        {rows.length === 0 && legacyUrl && (
          <a
            href={legacyUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="flex items-center gap-3 p-2.5 rounded-[16px] bg-white shadow-[0_2px_10px_-4px_rgba(10,31,61,0.08)] transition-transform active:scale-[0.98]"
          >
            <div className="h-10 w-10 rounded-[12px] bg-[#F4F6FA] flex items-center justify-center shrink-0">
              <FileText className="h-4 w-4 text-[#0E6B5A]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold truncate">צפייה בקטלוג</div>
              <div className="text-fs-xs text-muted-foreground">PDF · ייפתח בכרטיסיה חדשה</div>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
          </a>
        )}
      </div>
    </section>
  );
}
