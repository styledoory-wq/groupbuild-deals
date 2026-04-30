import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Briefcase, Loader2, AlertCircle, ShieldCheck } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { describeOffer, describeTier, tierRange, type OfferTier, type OfferType } from "@/lib/offerPricing";

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

export default function SupplierOffers() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [deals, setDeals] = useState<DealRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData.session;
        if (!session) {
          if (!cancelled) {
            setError("יש להתחבר כספק.");
            setLoading(false);
          }
          return;
        }

        const email = session.user.email ?? "";
        const byUser = await supabase
          .from("suppliers")
          .select("id")
          .eq("user_id", session.user.id)
          .maybeSingle();
        let sid = byUser.data?.id ?? null;
        if (!sid && email) {
          const byEmail = await supabase
            .from("suppliers")
            .select("id")
            .ilike("email", email)
            .maybeSingle();
          sid = byEmail.data?.id ?? null;
        }
        if (!cancelled) setSupplierId(sid);

        if (!sid) {
          if (!cancelled) setLoading(false);
          return;
        }

        const { data, error: dErr } = await supabase
          .from("deals")
          .select("id, title, status, original_price, discounted_price, discount_percentage, base_price, offer_type, tiers, created_at")
          .eq("supplier_id", sid)
          .eq("is_deleted", false)
          .order("created_at", { ascending: false });

        if (dErr) throw dErr;
        if (!cancelled) setDeals(((data ?? []) as unknown) as DealRow[]);
      } catch (e) {
        console.error("[SupplierOffers] load error", e);
        if (!cancelled) setError(e instanceof Error ? e.message : "שגיאה בטעינה");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <MobileShell>
      <PageHeader title="ההצעות שלי" subtitle="ניהול כל ההצעות הפעילות שלך" back={false} />

      <div className="px-5 -mt-4 relative z-10 mb-4">
        <Link to="/supplier/offers/new">
          <Button className="w-full h-12 rounded-2xl bg-gradient-gold text-primary font-bold shadow-gold">
            <Plus className="h-4 w-4 ml-2" /> צרו הצעה חדשה
          </Button>
        </Link>
      </div>

      <div className="px-5 space-y-3">
        {loading && (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
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
          return (
            <div key={d.id} className="gb-card p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm truncate">{d.title}</h3>
                  <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3 text-gold" /> ספק מאומת
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-success/10 text-success">
                  {d.status === "active" ? "פעילה" : d.status}
                </span>
              </div>

              <div className="pt-2 border-t border-border mt-2">
                <div className="font-extrabold text-primary text-base">{display.headline}</div>
                {display.savings && (
                  <div className="text-[11px] font-bold text-success mt-0.5">{display.savings}</div>
                )}
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  ככל שיותר דיירים מצטרפים — ההנחה גדלה
                </p>

                {hasTiers && (
                  <div className="mt-3 rounded-xl border border-border bg-muted/30 overflow-hidden">
                    <div className="grid grid-cols-2 gap-1 px-3 py-2 bg-muted/60 text-[10px] font-bold text-muted-foreground">
                      <span>מצטרפים</span>
                      <span className="text-left">הנחה</span>
                    </div>
                    {tiers.map((t, idx) => {
                      const td = describeTier(offerType, t);
                      const isFirst = idx === 0;
                      return (
                        <div
                          key={idx}
                          className={`grid grid-cols-2 gap-1 px-3 py-2 text-[11px] border-t border-border ${
                            isFirst ? "bg-gold/5" : ""
                          }`}
                        >
                          <span className="font-medium text-foreground">{tierRange(t)}</span>
                          <span className="text-left font-bold text-primary">{td.headline}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="text-left text-[10px] text-muted-foreground mt-2">
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
