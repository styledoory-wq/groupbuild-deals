import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ExternalLink, FileText, Globe, Instagram, Facebook, MapPin, Star, ShieldCheck, Loader2, ArrowRight, Tag } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { SupplierLogo } from "@/components/suppliers/SupplierLogo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SupplierRatingBadge } from "@/components/reviews/SupplierRatingBadge";
import { useApp } from "@/store/AppStore";
import { normalizeWhatsappUrl } from "@/lib/whatsapp";
import { RealDealCard, type RealDealCardData } from "@/components/deals/RealDealCard";
import type { OfferTier } from "@/lib/offerPricing";

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
}

interface GalleryItem {
  id: string;
  image_url: string;
  caption: string | null;
}

const WhatsappIcon = (props: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={props.className} fill="currentColor" aria-hidden="true">
    <path d="M20.52 3.48A11.86 11.86 0 0 0 12.05 0C5.5 0 .19 5.31.19 11.86a11.8 11.8 0 0 0 1.62 5.96L0 24l6.34-1.66a11.85 11.85 0 0 0 5.71 1.46h.01c6.55 0 11.86-5.31 11.86-11.86 0-3.17-1.23-6.15-3.4-8.46zM12.06 21.3a9.43 9.43 0 0 1-4.81-1.32l-.34-.2-3.76.98 1-3.66-.22-.37a9.46 9.46 0 1 1 8.13 4.57zm5.45-7.05c-.3-.15-1.77-.87-2.05-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.18.2-.35.22-.65.07-.3-.15-1.27-.47-2.42-1.5-.9-.8-1.5-1.78-1.68-2.07-.18-.3-.02-.46.13-.61.13-.13.3-.34.45-.5.15-.18.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51-.18-.01-.37-.01-.57-.01-.2 0-.52.07-.8.37-.27.3-1.05 1.02-1.05 2.5 0 1.47 1.07 2.9 1.22 3.1.15.2 2.12 3.24 5.13 4.55.72.31 1.27.5 1.7.64.71.23 1.36.2 1.87.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.18-1.42-.08-.13-.27-.2-.57-.35z"/>
  </svg>
);

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

  useEffect(() => {
    if (!supplierId) return;
    (async () => {
      const [{ data: s }, { data: g }, { data: sregs }, { data: scits }, { data: dealsData }] = await Promise.all([
        supabase.from("suppliers").select("*").eq("id", supplierId).maybeSingle(),
        supabase.from("supplier_gallery").select("id,image_url,caption").eq("supplier_id", supplierId).order("display_order"),
        supabase.from("supplier_regions").select("region_id, regions(name_he)").eq("supplier_id", supplierId),
        supabase.from("supplier_cities").select("city_id, cities(name_he)").eq("supplier_id", supplierId),
        supabase
          .from("deals")
          .select("id,title,status,category_id,supplier_id,offer_type,original_price,discounted_price,discount_percentage,base_price,tiers,ends_at")
          .eq("supplier_id", supplierId)
          .eq("status", "active")
          .order("created_at", { ascending: false }),
      ]);
      const sup = (s as DbSupplier | null) ?? null;
      setSupplier(sup);
      setGallery((g as GalleryItem[] | null) ?? []);

      const regionNames = (sregs ?? []).map((r: any) => r.regions?.name_he).filter(Boolean) as string[];
      const cityNames = (scits ?? []).map((c: any) => c.cities?.name_he).filter(Boolean) as string[];
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
        })),
      );

      setLoading(false);
    })();
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
      await supabase.functions.invoke("notify-admin", {
        body: {
          event: "supplier_interest",
          title: "מתעניין חדש בספק",
          details: {
            supplier_id: supplier.id,
            supplier_name: supplier.business_name,
            user_id: session.session.user.id,
            user_email: session.session.user.email,
          },
        },
      }).catch(() => {});
      setInterested(true);
      toast.success("רישמנו את ההתעניינות שלך — נחזור אליך בהקדם");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <MobileShell>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </MobileShell>
    );
  }

  if (!supplier) {
    return (
      <MobileShell>
        <PageHeader title="ספק לא נמצא" back />
        <div className="px-5 mt-6">
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
      <div className="bg-gradient-hero text-primary-foreground px-5 pt-4 pb-12 rounded-b-[32px] relative overflow-hidden">
        <div className="absolute -top-12 -left-12 h-40 w-40 rounded-full bg-gold/10 blur-3xl" />
        <PageHeader title="" subtitle="" back variant="navy" />
        <div className="-mt-8 relative flex items-end gap-4">
          <SupplierLogo name={supplier.business_name} logoUrl={supplier.logo_url} size="xl" className="border-gold/40 shadow-elevated" />
          <div className="flex-1 min-w-0 pb-1">
            <div className="flex items-center gap-1.5 mb-1">
              <h1 className="text-xl font-extrabold truncate">{supplier.business_name}</h1>
              {supplier.approval_status === "approved" && <ShieldCheck className="h-4 w-4 text-gold shrink-0" />}
            </div>
            <div className="mb-1">
              <SupplierRatingBadge supplierId={supplier.id} className="text-[11px] text-primary-foreground/90 [&>b]:text-gold [&>span]:text-primary-foreground/70" />
            </div>
            {supplier.short_description && (
              <p className="text-primary-foreground/80 text-xs leading-relaxed line-clamp-2">{supplier.short_description}</p>
            )}
          </div>
        </div>
      </div>

      <div className="px-5 -mt-6 relative z-10 space-y-4 pb-32">
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
                  className="h-11 rounded-xl border border-border bg-card text-foreground text-xs font-bold inline-flex items-center justify-center gap-1.5 hover:border-gold/40 transition-smooth"
                >
                  <l.Icon className="h-4 w-4 text-gold" />
                  {l.label}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Catalog */}
        {supplier.catalog_url && (
          <a
            href={supplier.catalog_url}
            target="_blank"
            rel="noreferrer noopener"
            className="gb-card p-4 flex items-center gap-3 hover:border-gold/40 transition-smooth"
          >
            <div className="h-11 w-11 rounded-xl bg-gold/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-gold" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold">צפייה בקטלוג</div>
              <div className="text-[11px] text-muted-foreground">PDF · ייפתח בכרטיסיה חדשה</div>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </a>
        )}

        {/* Description */}
        {supplier.description && (
          <section className="gb-card p-4">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">על העסק</h2>
            <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{supplier.description}</p>
          </section>
        )}

        {/* Categories */}
        {supplierCategories.length > 0 && (
          <section className="gb-card p-4">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-gold" /> תחומים
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {supplierCategories.map((c) => (
                <span
                  key={c.id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-gold/10 text-primary border border-gold/30"
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
            <MapPin className="h-3.5 w-3.5 text-gold" /> אזורי שירות
          </h2>
          {supplier.serves_all_country ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-gold/15 text-primary border border-gold/40">
              נותן שירות בכל הארץ
            </span>
          ) : serviceAreas.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {serviceAreas.map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/30"
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
        <section className="gb-card p-4">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5 text-gold" /> ההצעות הפעילות
          </h2>
          {deals.length === 0 ? (
            <p className="text-sm text-muted-foreground">אין עדיין הצעות פעילות מהספק הזה.</p>
          ) : (
            <div className="space-y-3">
              {deals.map((d) => (
                <RealDealCard key={d.id} deal={d} />
              ))}
            </div>
          )}
        </section>

        {/* Gallery */}
        {gallery.length > 0 && (
          <section className="gb-card p-4">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">גלריית עבודות</h2>
            <div className="grid grid-cols-3 gap-2">
              {gallery.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setLightbox(g.image_url)}
                  className="aspect-square rounded-xl overflow-hidden border border-border hover:border-gold/40 transition-smooth"
                >
                  <img src={g.image_url} alt={g.caption ?? "עבודה"} className="h-full w-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* CTA */}
      <div className="fixed bottom-0 inset-x-0 z-30 flex justify-center pointer-events-none">
        <div className="pointer-events-auto w-full max-w-[480px] px-4 pb-4 pt-3 bg-gradient-to-t from-background via-background to-background/0">
          <Button
            onClick={handleInterest}
            disabled={submitting || interested}
            className="w-full h-12 rounded-2xl bg-gradient-gold text-primary font-bold shadow-gold"
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : interested ? "✓ ההתעניינות שלך נרשמה" : "אני מעוניין בהצעה"}
          </Button>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
        >
          <img src={lightbox} alt="" className="max-h-[90vh] max-w-full rounded-2xl" />
        </div>
      )}
    </MobileShell>
  );
}
