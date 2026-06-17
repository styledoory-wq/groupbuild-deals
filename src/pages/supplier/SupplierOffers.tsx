import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Briefcase, Loader2, AlertCircle, ShieldCheck, Pencil, Wallet, Sparkles, Clock, CheckCircle2, XCircle, PauseCircle, Users, TrendingUp, Coins } from "lucide-react";
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
        class: "bg-[#EFF6FF] text-[#1F2937] border-[#BFDBFE]",
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

function extractPriceNum(headline: string): number {
  const m = headline.replace(/,/g, "").match(/[\d.]+/);
  return m ? parseFloat(m[0]) : 0;
}

export default function SupplierOffers() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [participantsByDeal, setParticipantsByDeal] = useState<Record<string, number>>({});

  const loadDeals = useCallback(async (sid: string) => {
    const { data, error: dErr } = await supabase
      .from("deals")
      .select("id, title, status, original_price, discounted_price, discount_percentage, base_price, offer_type, tiers, created_at")
      .eq("supplier_id", sid)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });
    if (dErr) throw dErr;
    const rows = ((data ?? []) as unknown) as DealRow[];
    setDeals(rows);

    const ids = rows.map((r) => r.id);
    if (ids.length > 0) {
      const { data: interests } = await supabase
        .from("deal_interests")
        .select("deal_id")
        .in("deal_id", ids)
        .eq("is_deleted", false);
      const counts: Record<string, number> = {};
      (interests ?? []).forEach((row: { deal_id: string }) => {
        counts[row.deal_id] = (counts[row.deal_id] ?? 0) + 1;
      });
      setParticipantsByDeal(counts);
    } else {
      setParticipantsByDeal({});
    }
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

  const unitPriceForDeal = (d: DealRow): number => {
    if (d.discounted_price && d.discounted_price > 0) return Number(d.discounted_price);
    const base = Number(d.base_price ?? d.original_price ?? 0);
    if (d.discount_percentage && base > 0) {
      return base * (1 - Number(d.discount_percentage) / 100);
    }
    const tiers = Array.isArray(d.tiers) ? d.tiers : [];
    if (tiers.length > 0) {
      const display = describeOffer({
        offer_type: ((d.offer_type as OfferType | null) ?? "percentage") as OfferType,
        original_price: d.original_price,
        discounted_price: d.discounted_price,
        discount_percentage: d.discount_percentage,
        base_price: d.base_price,
        tiers,
      }, 0);
      return extractPriceNum(display.headline);
    }
    return base;
  };


  const activeDeals = deals.filter((d) => d.status === "active").length;
  const potentialIncome = deals
    .filter((d) => d.status === "active")
    .reduce((sum, d) => sum + unitPriceForDeal(d) * (participantsByDeal[d.id] ?? 0), 0);
  const generatedIncome = deals
    .filter((d) => d.status === "closed")
    .reduce((sum, d) => sum + unitPriceForDeal(d) * (participantsByDeal[d.id] ?? 0), 0);


  return (
    <MobileShell>
      <PageHeader title="ההצעות שלי" subtitle="ניהול כל ההצעות הפעילות שלך" back={false} />

      {/* CTA Button */}
      <div className="px-5 -mt-4 relative z-10 mb-5">
        <Link to="/supplier/offers/new">
          <Button className="w-full h-13 rounded-[16px] bg-gradient-to-r from-[#1F2937] to-[#1A3A5C] hover:from-[#1F2937]/90 hover:to-[#1A3A5C]/90 text-white font-bold shadow-[0_12px_28px_-10px_rgba(10,31,61,0.55)] transition-all duration-300 hover:shadow-[0_16px_36px_-10px_rgba(10,31,61,0.65)] hover:-translate-y-0.5 text-base">
            <Plus className="h-5 w-5 ml-2" /> צרו הצעה חדשה
          </Button>
        </Link>
      </div>

      {/* Stats Bar */}
      {!loading && !error && supplierId && deals.length > 0 && (
        <div className="px-5 mb-5">
          <div className="flex gap-3">
            <div className="flex-1 rounded-[16px] bg-gradient-to-br from-[#1F2937] to-[#1A3A5C] p-4 text-white shadow-[0_8px_24px_-10px_rgba(10,31,61,0.4)]">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-7 w-7 rounded-full bg-white/15 flex items-center justify-center">
                  <Sparkles className="h-3.5 w-3.5 text-[#C9A227]" />
                </div>
                <span className="text-xs font-medium opacity-80">הצעות פעילות</span>
              </div>
              <div className="text-2xl font-extrabold">{activeDeals}</div>
            </div>
            <div className="flex-1 rounded-[16px] bg-gradient-to-br from-[#FFFBEB] to-[#FEF3C7] p-4 border border-[#FDE68A] shadow-[0_8px_24px_-10px_rgba(146,64,14,0.12)]">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-7 w-7 rounded-full bg-[#92400E]/10 flex items-center justify-center">
                  <Wallet className="h-3.5 w-3.5 text-[#92400E]" />
                </div>
                <span className="text-xs font-medium text-[#92400E]/80">
                  {activeDeals > 0 ? "פוטנציאל הכנסה" : "הכנסה שנוצרה"}
                </span>
              </div>
              <div className="text-2xl font-extrabold text-[#92400E]">
                ₪{(activeDeals > 0 ? potentialIncome : generatedIncome).toLocaleString("he-IL")}
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
          const currentTier = hasTiers ? describeTier(offerType, tiers[0]) : null;
          const participants = participantsByDeal[d.id] ?? 0;

          return (
            <div
              key={d.id}
              className="rounded-[20px] bg-white border border-[#ECEEF2] p-5 shadow-[0_2px_12px_-4px_rgba(10,31,61,0.06)] hover:shadow-[0_8px_28px_-10px_rgba(10,31,61,0.12)] hover:-translate-y-0.5 transition-all duration-300"
            >
              {/* Row 1: Title + Status + Actions */}
              <div className="flex items-center justify-between gap-2 mb-4">
                <h3 className="font-bold text-[15px] truncate leading-snug flex-1 min-w-0">{d.title}</h3>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full border whitespace-nowrap ${badge.class}`}>
                    {badge.icon}
                    {badge.label}
                  </span>
                  <DealActionsMenu dealId={d.id} status={d.status} onChanged={refresh} />
                </div>
              </div>

              {/* Row 2: Big Price */}
              <div className="mb-4">
                <div className="flex items-baseline gap-2">
                  {d.original_price && (
                    <span className="text-sm text-[#9CA3AF] line-through">
                      ₪{d.original_price.toLocaleString("he-IL")}
                    </span>
                  )}
                  <span className="text-2xl font-extrabold text-[#1F2937]">
                    {display.headline}
                  </span>
                </div>
              </div>


              {/* Row 4: Participants */}
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1F2937] bg-[#EFF6FF] px-3 py-1.5 rounded-full">
                  <Users className="h-3.5 w-3.5" />
                  {participants} {participants === 1 ? "מצטרף" : "מצטרפים"}
                </div>
                {hasTiers && currentTier && (
                  <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#065F46] bg-[#ECFDF5] px-3 py-1.5 rounded-full">
                    יעד {tierRange(tiers[0])} — {currentTier.headline}
                  </div>
                )}
              </div>


              {/* Row 4: Bottom row — Edit + Date */}
              <div className="flex items-center justify-between pt-3 border-t border-[#ECEEF2]">
                <div className="flex items-center gap-2">
                  <Link
                    to={`/supplier/offers/${d.id}/edit`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-[10px] bg-[#1F2937] text-white hover:bg-[#1F2937]/90 transition-colors"
                  >
                    <Pencil className="h-3 w-3" /> עריכת הצעה
                  </Link>
                  <Link
                    to={`/supplier/offers/${d.id}/marketing`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-[10px] bg-white border border-[#ECEEF2] text-[#1F2937] hover:bg-[#F4F6FA] transition-colors"
                  >
                    <Pencil className="h-3 w-3" /> שיווק
                  </Link>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[#9CA3AF]">
                  <Clock className="h-3 w-3" />
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
