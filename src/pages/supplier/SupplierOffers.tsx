import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Briefcase, Loader2, AlertCircle, ShieldCheck, Pencil, TrendingDown, Sparkles, Clock, CheckCircle2, XCircle, PauseCircle } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentSupplier } from "@/lib/supplierAuth";
import { describeOffer, describeTier, tierRange, type OfferTier, type OfferType } from "@/lib/offerPricing";
import { DealActionsMenu } from "@/components/deals/DealActionsMenu";

type DealRow = {
  id: string;
  title: string;
  status: string;
  original_price: number | null;
  discounted_price: number | null;
  discount_percentage: number | null;
  base_price: number | null;
  offer_type: string | null;
  tiers: OfferTier[] | null;
  created_at: string;
};

const statusBadge = (status: string) => {
  switch (status) {
    case "active":
      return {
        label: "פעילה",
        class: "bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]",
        icon: <CheckCircle2 className="h-3 w-3" />,
      };
    case "disabled":
      return {
        label: "מושבתת",
        class: "bg-[#F3F4F6] text-[#6B7280] border-[#E5E7EB]",
        icon: <PauseCircle className="h-3 w-3" />,
      };
    case "closed":
      return {
        label: "נסגרה",
        class: "bg-[#EFF6FF] text-[#0A1F3D] border-[#BFDBFE]",
        icon: <XCircle className="h-3 w-3" />,
      };
    case "pending":
      return {
        label: "ממתינה",
        class: "bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]",
        icon: <Clock className="h-3 w-3" />,
      };
    default:
      return {
        label: status,
        class: "bg-[#F3F4F6] text-[#6B7280] border-[#E5E7EB]",
        icon: <ShieldCheck className="h-3 w-3" />,
      };
  }
};

export default function SupplierOffers() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [deals, setDeals] = useState<DealRow[]>([]);

  const loadDeals = useCallback(async (sid: string) => {
    const { data, error: dErr } = await supabase
      .from("deals")
      .select("id, title, status, original_price, discounted_price, discount_percentage, base_price, offer_type, tiers, created_at")
      .eq("supplier_id", sid)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });
    if (dErr) throw dErr;
    setDeals(((data ?? []) as unknown) as DealRow[]);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { session, supplier } = await getCurrentSupplier<{ id: string }>("id");
        if (!session) {
          if (!cancelled) {
            setError("יש להתחבר כספק.");
            setLoading(false);
          }
          return;
        }
        const sid = supplier?.id ?? null;
        if (!cancelled) setSupplierId(sid);

        if (!sid) {
          if (!cancelled) setLoading(false);
          return;
        }

        await loadDeals(sid);
      } catch (e) {
        console.error("[SupplierOffers] load error", e);
        if (!cancelled) setError(e instanceof Error ? e.message : "שגיאה בטעינה");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [loadDeals]);

  const refresh = useCallback(() => {
    if (supplierId) loadDeals(supplierId).catch((e) => console.error(e));
  }, [supplierId, loadDeals]);

  const activeDeals = deals.filter((d) => d.status === "active").length;
  const totalSavings = deals.reduce((sum, d) => {
    const display = describeOffer({
      offer_type: ((d.offer_type as OfferType | null) ?? "percentage") as OfferType,
      original_price: d.original_price,
      discounted_price: d.discounted_price,
      discount_percentage: d.discount_percentage,
      base_price: d.base_price,
      tiers: Array.isArray(d.tiers) ? d.tiers : [],
    }, 0);
    const match = display.savings?.match(/[\d,.]+/);
    return sum + (match ? parseFloat(match[0].replace(/,/g, "")) : 0);
  }, 0);

  return (
    <MobileShell>
      <PageHeader title="ההצעות שלי" subtitle="ניהול כל ההצעות הפעילות שלך" back={false} />

      {/* CTA Button */}
      <div className="px-5 -mt-4 relative z-10 mb-5">
        <Link to="/supplier/offers/new">
          <Button className="w-full h-13 rounded-[16px] bg-gradient-to-r from-[#0A1F3D] to-[#1A3A5C] hover:from-[#0A1F3D]/90 hover:to-[#1A3A5C]/90 text-white font-bold shadow-[0_12px_28px_-10px_rgba(10,31,61,0.55)] transition-all duration-300 hover:shadow-[0_16px_36px_-10px_rgba(10,31,61,0.65)] hover:-translate-y-0.5 text-base">
            <Plus className="h-5 w-5 ml-2" /> צרו הצעה חדשה
          </Button>
        </Link>
      </div>

      {/* Stats Bar */}
      {!loading && !error && supplierId && deals.length > 0 && (
        <div className="px-5 mb-5">
          <div className="flex gap-3">
            <div className="flex-1 rounded-[16px] bg-gradient-to-br from-[#0A1F3D] to-[#1A3A5C] p-4 text-white shadow-[0_8px_24px_-10px_rgba(10,31,61,0.4)]">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-7 w-7 rounded-full bg-white/15 flex items-center justify-center">
                  <Sparkles className="h-3.5 w-3.5 text-[#D4AF37]" />
                </div>
                <span className="text-xs font-medium opacity-80">הצעות פעילות</span>
              </div>
              <div className="text-2xl font-extrabold">{activeDeals}</div>
            </div>
            <div className="flex-1 rounded-[16px] bg-gradient-to-br from-[#ECFDF5] to-[#D1FAE5] p-4 border border-[#A7F3D0] shadow-[0_8px_24px_-10px_rgba(6,95,46,0.15)]">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-7 w-7 rounded-full bg-[#065F46]/10 flex items-center justify-center">
                  <TrendingDown className="h-3.5 w-3.5 text-[#065F46]" />
                </div>
                <span className="text-xs font-medium text-[#065F46]/80">חיסכון כולל</span>
              </div>
              <div className="text-2xl font-extrabold text-[#065F46]">
                ₪{totalSavings.toLocaleString("he-IL")}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="px-5 space-y-4 pb-8">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        )}

        {!loading && error && (
          <div className="gb-card p-6 text-center">
            <div className="h-12 w-12 mx-auto rounded-full bg-destructive/10 flex items-center justify-center mb-3">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        )}

        {!loading && !error && !supplierId && (
          <div className="gb-card p-8 text-center">
            <Briefcase className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <h3 className="font-bold text-base mb-1">חסר פרופיל ספק</h3>
            <p className="text-sm text-muted-foreground">השלם את פרטי הספק לפני יצירת הצעות.</p>
          </div>
        )}

        {!loading && !error && supplierId && deals.length === 0 && (
          <div className="gb-card p-8 text-center">
            <Briefcase className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">אין הצעות עדיין</p>
          </div>
        )}

        {!loading && !error && deals.map((d) => {
          const offerType = ((d.offer_type as OfferType | null) ?? "percentage") as OfferType;
          const tiers = Array.isArray(d.tiers) ? d.tiers : [];
          const hasTiers = tiers.length > 0;
          const display = describeOffer({
            offer_type: offerType,
            original_price: d.original_price,
            discounted_price: d.discounted_price,
            discount_percentage: d.discount_percentage,
            base_price: d.base_price,
            tiers,
          }, 0);
          const badge = statusBadge(d.status);
          return (
            <div
              key={d.id}
              className="rounded-[20px] bg-gradient-to-br from-white to-[#FAFBFC] border border-[#ECEEF2] p-5 shadow-[0_2px_12px_-4px_rgba(10,31,61,0.08)] hover:shadow-[0_8px_28px_-10px_rgba(10,31,61,0.14)] hover:-translate-y-0.5 transition-all duration-300"
            >
              {/* Header: Title + Status + Actions */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-[15px] truncate leading-snug mb-1">{d.title}</h3>
                  <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3 text-[#D4AF37]" /> ספק מאומת
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border whitespace-nowrap ${badge.class}`}>
                    {badge.icon}
                    {badge.label}
                  </span>
                  <DealActionsMenu dealId={d.id} status={d.status} onChanged={refresh} />
                </div>
              </div>

              {/* Pricing Block */}
              <div className="rounded-[16px] bg-[#F4F6FA] border border-[#ECEEF2] p-4 mb-4">
                <div className="flex items-baseline gap-2 mb-1">
                  {d.original_price && d.discounted_price && (
                    <span className="text-sm text-muted-foreground line-through">
                      ₪{d.original_price.toLocaleString("he-IL")}
                    </span>
                  )}
                  <span className="text-xl font-extrabold text-[#0A1F3D]">
                    {display.headline}
                  </span>
                </div>
                {display.savings && (
                  <div className="inline-flex items-center gap-1.5 text-sm font-bold text-[#065F46] bg-[#ECFDF5] px-3 py-1.5 rounded-full mt-1">
                    <TrendingDown className="h-4 w-4" />
                    {display.savings}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-2.5">
                  ככל שיותר דיירים מצטרפים — ההנחה גדלה
                </p>
              </div>

              {/* Tiers Table */}
              {hasTiers && (
                <div className="rounded-[16px] border border-[#ECEEF2] bg-white overflow-hidden mb-4">
                  <div className="grid grid-cols-2 gap-1 px-4 py-2.5 bg-[#F4F6FA] text-xs font-bold text-[#6B7280]">
                    <span>מצטרפים</span>
                    <span className="text-left">הנחה</span>
                  </div>
                  {tiers.map((t, idx) => {
                    const td = describeTier(offerType, t);
                    const isFirst = idx === 0;
                    return (
                      <div
                        key={idx}
                        className={`grid grid-cols-2 gap-1 px-4 py-2.5 text-xs border-t border-[#ECEEF2] ${
                          isFirst ? "bg-[#FAFBFC]" : ""
                        }`}
                      >
                        <span className="font-medium text-[#0A1F3D]">{tierRange(t)}</span>
                        <span className="text-left font-bold text-[#0A1F3D]">{td.headline}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Footer: Edit + Date */}
              <div className="flex items-center justify-between pt-3 border-t border-[#ECEEF2]">
                <Link
                  to={`/supplier/offers/${d.id}/marketing`}
                  className="inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-[12px] bg-[#0A1F3D] text-white hover:bg-[#0A1F3D]/90 transition-colors shadow-[0_4px_12px_-4px_rgba(10,31,61,0.3)]"
                >
                  <Pencil className="h-3.5 w-3.5" /> עריכה שיווקית
                </Link>
                <div className="text-xs text-[#9CA3AF] font-medium">
                  {new Date(d.created_at).toLocaleDateString("he-IL")}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <BottomNav role="supplier" />
    </MobileShell>
  );
}
