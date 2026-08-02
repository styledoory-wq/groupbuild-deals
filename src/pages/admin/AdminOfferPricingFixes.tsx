import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Loader2 } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BackHeader } from "@/components/layout/BackHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  CANONICAL_PRICE_REASON_HE,
  getCanonicalDealBasePrice,
  type CanonicalPriceReason,
} from "@/lib/participationPricing";

type DealRow = {
  id: string;
  title: string | null;
  status: string | null;
  listing_type: string | null;
  offer_type: string | null;
  base_price: number | null;
  original_price: number | null;
  discounted_price: number | null;
  tiers: unknown;
  supplier_id: string | null;
};

type Broken = { deal: DealRow; reason: CanonicalPriceReason };

/**
 * Offers whose canonical price cannot be derived → participation fee cannot be
 * resolved → joining is blocked (fail-closed). Admins use this to chase suppliers.
 */
export default function AdminOfferPricingFixes() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<DealRow[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("deals")
        .select(
          "id,title,status,listing_type,offer_type,base_price,original_price,discounted_price,tiers,supplier_id",
        )
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(500);
      setRows((data ?? []) as unknown as DealRow[]);
      setLoading(false);
    })();
  }, []);

  const broken = useMemo<Broken[]>(() => {
    return rows
      .filter((d) => (d.listing_type ?? "group_buy") !== "regular")
      .map((d) => ({
        deal: d,
        result: getCanonicalDealBasePrice({
          offer_type: d.offer_type,
          base_price: d.base_price,
          discounted_price: d.discounted_price,
          original_price: d.original_price,
          tiers: Array.isArray(d.tiers) ? (d.tiers as never[]) : [],
        }),
      }))
      .filter((x) => !x.result.valid)
      .map((x) => ({ deal: x.deal, reason: x.result.reason }));
  }, [rows]);

  const active = broken.filter((b) => b.deal.status === "active");

  return (
    <MobileShell>
      <BackHeader title="הצעות עם תמחור חסר" />
      <div className="px-4 pb-24 space-y-3" dir="rtl">
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 flex gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[12px] text-amber-900 leading-relaxed">
            להצעות אלה לא ניתן לחשב מחיר עסקה קנוני, ולכן דמי השירות אינם ניתנים לחישוב
            וההצטרפות חסומה. יש להשלים מחיר מקורי אצל הספק.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-[#0E6B5A]" />
          </div>
        ) : broken.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-10">
            כל ההצעות תקינות — לכולן ניתן לחשב דמי שירות.
          </p>
        ) : (
          <>
            <p className="text-[12px] text-muted-foreground">
              {broken.length} הצעות · מתוכן {active.length} פעילות
            </p>
            {broken.map(({ deal, reason }) => (
              <div key={deal.id} className="rounded-2xl bg-white ring-1 ring-black/[0.06] p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[13.5px] font-bold text-[#0F172A] leading-snug">
                    {deal.title ?? "ללא כותרת"}
                  </p>
                  <Badge variant={deal.status === "active" ? "destructive" : "secondary"}>
                    {deal.status === "active" ? "פעילה" : deal.status ?? "—"}
                  </Badge>
                </div>
                <p className="mt-1 text-[11.5px] text-muted-foreground">
                  {CANONICAL_PRICE_REASON_HE[reason]} · סוג הצעה: {deal.offer_type ?? "—"}
                </p>
                <Button asChild variant="outline" size="sm" className="mt-2 rounded-xl h-8">
                  <Link to={`/admin/deals?deal=${deal.id}`}>
                    פתח בניהול הצעות
                    <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                  </Link>
                </Button>
              </div>
            ))}
          </>
        )}
      </div>
    </MobileShell>
  );
}
