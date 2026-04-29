import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Star, Shield, Sparkles, Loader2, ArrowRight, ShieldCheck, Tag } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SupplierLogo } from "@/components/suppliers/SupplierLogo";
import { SupplierRatingBadge } from "@/components/reviews/SupplierRatingBadge";
import { useApp } from "@/store/AppStore";
import {
  describeOffer,
  describeTier,
  getActiveTier,
  tierRange,
  type OfferTier,
  type OfferType,
} from "@/lib/offerPricing";

interface DealRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  category_id: string | null;
  supplier_id: string;
  offer_type: string | null;
  original_price: number | null;
  discounted_price: number | null;
  discount_percentage: number | null;
  base_price: number | null;
  tiers: OfferTier[] | null;
  ends_at: string | null;
}

interface SupplierRow {
  id: string;
  business_name: string;
  logo_url: string | null;
  approval_status: string;
  service_areas: string[] | null;
}

export default function DealDetail() {
  const { dealId } = useParams();
  const { categories } = useApp();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deal, setDeal] = useState<DealRow | null>(null);
  const [supplier, setSupplier] = useState<SupplierRow | null>(null);
  const [interested, setInterested] = useState(false);
  const [submittingInterest, setSubmittingInterest] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!dealId) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: dealData, error: dErr } = await supabase
          .from("deals")
          .select(
            "id,title,description,status,category_id,supplier_id,offer_type,original_price,discounted_price,discount_percentage,base_price,tiers,ends_at",
          )
          .eq("id", dealId)
          .maybeSingle();
        if (dErr) throw dErr;
        if (!dealData) {
          if (!cancelled) {
            setError("העסקה לא נמצאה");
            setLoading(false);
          }
          return;
        }
        const d = dealData as unknown as DealRow;
        if (!cancelled) setDeal(d);

        const { data: supData } = await supabase
          .from("suppliers")
          .select("id,business_name,logo_url,approval_status,service_areas")
          .eq("id", d.supplier_id)
          .maybeSingle();
        if (!cancelled) setSupplier((supData as SupplierRow | null) ?? null);

        const { data: session } = await supabase.auth.getSession();
        if (session.session) {
          const { data: interest } = await supabase
            .from("deal_interests")
            .select("id")
            .eq("user_id", session.session.user.id)
            .eq("deal_id", d.id)
            .maybeSingle();
          if (!cancelled && interest) setInterested(true);
        }
      } catch (e) {
        console.error("[DealDetail] load error", e);
        if (!cancelled) setError(e instanceof Error ? e.message : "שגיאה בטעינה");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dealId]);

  const handleInterest = async () => {
    if (!deal) return;
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      toast.error("יש להתחבר כדי להביע עניין בעסקה");
      return;
    }
    setSubmittingInterest(true);
    try {
      const { error: insErr } = await supabase.from("deal_interests").insert({
        user_id: session.session.user.id,
        deal_id: deal.id,
        status: "interested",
      });
      if (insErr && !insErr.message.toLowerCase().includes("duplicate")) throw insErr;
      setInterested(true);
      toast.success("רישמנו את התעניינותך! נחזור אליך עם פרטים נוספים.");
      supabase.functions
        .invoke("notify-admin", {
          body: {
            event: "deal_interest",
            title: "מתעניין חדש בעסקה",
            details: {
              deal_id: deal.id,
              deal_title: deal.title,
              user_id: session.session.user.id,
              user_email: session.session.user.email,
            },
          },
        })
        .catch(() => {});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שמירה נכשלה");
    } finally {
      setSubmittingInterest(false);
    }
  };

  if (loading) {
    return (
      <MobileShell>
        <PageHeader title="טוען עסקה..." back />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
        <BottomNav role="resident" />
      </MobileShell>
    );
  }

  if (error || !deal) {
    return (
      <MobileShell>
        <PageHeader title="עסקה לא נמצאה" back />
        <div className="px-5 mt-6">
          <div className="gb-card p-6 text-center">
            <p className="text-sm font-bold text-foreground">{error ?? "העסקה לא נמצאה"}</p>
            <Link to="/resident/deals">
              <Button variant="outline" className="mt-4">
                <ArrowRight className="h-4 w-4 ml-2" />
                חזרה לעסקאות
              </Button>
            </Link>
          </div>
        </div>
        <BottomNav role="resident" />
      </MobileShell>
    );
  }

  const offerType = ((deal.offer_type as OfferType | null) ?? "percentage") as OfferType;
  const tiers = Array.isArray(deal.tiers) ? deal.tiers : [];
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
  const activeTier = tiers.length > 0 ? getActiveTier(tiers, 0) : null;
  const category = categories.find((c) => c.id === deal.category_id);

  return (
    <MobileShell>
      <div className="bg-gradient-hero text-primary-foreground px-5 pt-6 pb-10 rounded-b-[32px] relative overflow-hidden">
        <div className="absolute -top-12 -left-12 h-40 w-40 rounded-full bg-gold/10 blur-3xl" />
        <PageHeader title="" subtitle="" back variant="navy" />
        <div className="-mt-10 relative">
          <div className="flex items-center gap-2 mb-3">
            {category?.icon ? (
              <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center text-xl">
                {category.icon}
              </div>
            ) : (
              <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
                <Tag className="h-5 w-5 text-gold" />
              </div>
            )}
            {category?.name && <span className="text-xs text-primary-foreground/70">{category.name}</span>}
          </div>
          <h1 className="text-2xl font-extrabold leading-tight mb-2">{deal.title}</h1>
          <div className="gb-divider-gold mb-3" />
          {deal.description && (
            <p className="text-primary-foreground/75 text-sm leading-relaxed whitespace-pre-line">{deal.description}</p>
          )}
        </div>
      </div>

      {/* Pricing card */}
      <div className="px-5 -mt-6 relative z-10 mb-5">
        <div className="gb-card p-5 bg-gradient-card">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">המחיר הנוכחי</div>
          <div className="text-2xl font-extrabold text-primary leading-tight">{display.headline}</div>
          {display.savings && (
            <div className="text-xs font-bold text-success mt-1">{display.savings}</div>
          )}
          <p className="text-[11px] text-muted-foreground mt-2">
            ככל שיותר דיירים מצטרפים — ההנחה גדלה
          </p>
        </div>
      </div>

      {/* Tiers */}
      {tiers.length > 0 && (
        <section className="px-5 mb-5">
          <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-gold" />
            מדרגות מחיר
          </h2>
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="grid grid-cols-2 gap-1 px-3 py-2 bg-muted/60 text-[10px] font-bold text-muted-foreground">
              <span>מצטרפים</span>
              <span className="text-left">הנחה / מחיר</span>
            </div>
            {tiers.map((t, idx) => {
              const td = describeTier(offerType, t);
              const isActive = activeTier && t.minParticipants === activeTier.minParticipants;
              return (
                <div
                  key={idx}
                  className={cn(
                    "grid grid-cols-2 gap-1 px-3 py-3 text-[12px] border-t border-border",
                    isActive ? "bg-gold/10" : "",
                  )}
                >
                  <span className="font-bold text-foreground">{tierRange(t)}</span>
                  <div className="text-left">
                    <div className="font-extrabold text-primary">{td.headline}</div>
                    {td.savings && <div className="text-[10px] text-success font-bold">{td.savings}</div>}
                    {isActive && <div className="text-[10px] gb-gold-text font-bold mt-0.5">פעיל עכשיו</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Supplier */}
      {supplier && (
        <section className="px-5 mb-24">
          <h2 className="text-sm font-bold text-foreground mb-3">הספק</h2>
          <Link to={`/suppliers/${supplier.id}`} className="gb-card p-4 flex items-center gap-3 hover:border-gold/40 transition-smooth">
            <SupplierLogo name={supplier.business_name} logoUrl={supplier.logo_url} size="lg" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <h3 className="font-bold text-foreground truncate">{supplier.business_name}</h3>
                {supplier.approval_status === "approved" && <Shield className="h-4 w-4 text-gold" />}
              </div>
              <div className="text-xs text-muted-foreground">
                <SupplierRatingBadge supplierId={supplier.id} showEmpty />
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5 inline-flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-gold" /> ספק מאומת
              </div>
            </div>
            <Star className="h-4 w-4 text-gold" />
          </Link>
        </section>
      )}

      {/* CTA */}
      <div className="fixed bottom-0 inset-x-0 z-30 flex justify-center pointer-events-none">
        <div className="pointer-events-auto w-full max-w-[480px] px-4 pb-4 pt-3 bg-gradient-to-t from-background via-background to-background/0">
          <div className="gb-card p-3 shadow-elevated">
            {interested ? (
              <div className="text-center text-xs font-bold text-success bg-success/10 rounded-xl py-3">
                ✓ רשמנו את התעניינותך — נחזור אליך בקרוב
              </div>
            ) : (
              <Button
                onClick={handleInterest}
                disabled={submittingInterest}
                className="w-full h-12 rounded-2xl bg-gradient-gold text-primary font-bold shadow-gold"
              >
                {submittingInterest ? <Loader2 className="h-5 w-5 animate-spin" /> : "אני מעוניין להצטרף"}
              </Button>
            )}
          </div>
        </div>
      </div>
      <BottomNav role="resident" />
    </MobileShell>
  );
}
