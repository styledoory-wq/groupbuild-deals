import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ShieldCheck, Users, Sparkles, TrendingDown, Tag as TagIcon, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { describeOffer, ils, type OfferTier, type OfferType } from "@/lib/offerPricing";
import { SupplierLogo } from "@/components/suppliers/SupplierLogo";

interface SharedDealRow {
  id: string;
  title: string;
  description: string | null;
  offer_type: string | null;
  original_price: number | null;
  discounted_price: number | null;
  discount_percentage: number | null;
  base_price: number | null;
  tiers: OfferTier[] | null;
  cover_image_url: string | null;
  ends_at: string | null;
  supplier_id: string;
}

interface SupplierLite {
  business_name: string;
  logo_url: string | null;
}

export default function SharedDeal() {
  const { dealId } = useParams();
  const [loading, setLoading] = useState(true);
  const [deal, setDeal] = useState<SharedDealRow | null>(null);
  const [supplier, setSupplier] = useState<SupplierLite | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!dealId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("deals")
        .select(
          "id,title,description,offer_type,original_price,discounted_price,discount_percentage,base_price,tiers,cover_image_url,ends_at,supplier_id,suppliers(business_name,logo_url)",
        )
        .eq("id", dealId)
        .eq("is_deleted", false)
        .maybeSingle();
      if (cancelled) return;
      if (!data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const row = data as unknown as SharedDealRow & { suppliers: SupplierLite | null };
      setDeal(row);
      setSupplier(row.suppliers ?? null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [dealId]);

  const redirectPath = `/resident/deals/${dealId}`;
  const authHref = `/auth?redirect=${encodeURIComponent(redirectPath)}`;

  const offerType = ((deal?.offer_type as OfferType | null) ?? "percentage") as OfferType;
  const tiers = Array.isArray(deal?.tiers) ? deal!.tiers! : [];
  const display = deal
    ? describeOffer(
        {
          offer_type: offerType,
          original_price: deal.original_price,
          discounted_price: deal.discounted_price,
          discount_percentage: deal.discount_percentage,
          base_price: deal.base_price,
          tiers,
        },
        0,
      )
    : null;

  const savings = (() => {
    if (!deal) return null;
    if (offerType === "price_comparison" && tiers.length) {
      const list = tiers
        .map((t) => (t.original_price && t.discounted_price ? Number(t.original_price) - Number(t.discounted_price) : 0))
        .filter((s) => s > 0);
      return list.length ? Math.max(...list) : null;
    }
    if (deal.original_price && deal.discounted_price) {
      return Number(deal.original_price) - Number(deal.discounted_price);
    }
    return null;
  })();

  return (
    <div dir="rtl" className="min-h-screen bg-[#FCFBF8]">
      <div className="mx-auto max-w-xl px-5 pt-8 pb-24">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          GroupBuild
        </Link>

        {loading && (
          <div className="mt-10 space-y-4">
            <div className="h-48 rounded-[20px] gb-skeleton" />
            <div className="h-6 w-3/4 rounded gb-skeleton" />
            <div className="h-24 rounded-xl gb-skeleton" />
          </div>
        )}

        {!loading && notFound && (
          <div className="mt-16 text-center space-y-4">
            <h1 className="text-2xl font-bold">העסקה לא נמצאה</h1>
            <p className="text-sm text-muted-foreground">ייתכן שההצעה הסתיימה. גלו עסקאות פעילות נוספות.</p>
            <Button asChild><Link to="/">לדף הבית</Link></Button>
          </div>
        )}

        {!loading && deal && (
          <>
            <div className="mt-6 mb-3 inline-flex items-center gap-1.5 text-fs-xs font-extrabold px-3 py-1 rounded-full bg-white text-[#1F2937] shadow-[0_1px_3px_rgba(10,31,61,0.06)]">
              <Sparkles className="h-3 w-3" />
              שכן שיתף אתכם בעסקה קבוצתית
            </div>

            <h1 className="text-2xl md:text-3xl font-bold leading-tight tracking-tight text-foreground">
              {deal.title}
            </h1>
            {supplier?.business_name && (
              <p className="text-sm text-muted-foreground mt-2 inline-flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-[#0E6B5A]" />
                {supplier.business_name}
              </p>
            )}

            {deal.cover_image_url && (
              <div className="mt-5 overflow-hidden rounded-[20px] shadow-[0_8px_20px_-10px_rgba(10,31,61,0.18),0_2px_4px_-2px_rgba(10,31,61,0.05)]">
                <img src={deal.cover_image_url} alt={deal.title} className="w-full h-56 object-cover" />
              </div>
            )}

            {/* Price / savings card */}
            {display && (
              <div className="mt-5 gb-card p-5">
                <div className="flex items-start gap-3">
                  <div className="h-11 w-11 rounded-[12px] bg-[#F4F6FA] flex items-center justify-center">
                    <TagIcon className="h-5 w-5 text-[#0E6B5A]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xl font-extrabold text-primary leading-tight">{display.headline}</div>
                    {savings && savings > 0 && (
                      <div className="text-sm font-bold text-success mt-1 inline-flex items-center gap-1">
                        <TrendingDown className="h-4 w-4" />
                        חוסכים עד {ils(savings)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {deal.description && (
              <p className="mt-5 text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                {deal.description}
              </p>
            )}

            {/* App pitch */}
            <div className="mt-7 gb-card p-5">
              <div className="inline-flex items-center gap-2 text-sm font-bold text-primary">
                <Users className="h-4 w-4" />
                איך זה עובד?
              </div>
              <ul className="mt-3 space-y-2 text-sm text-foreground/90">
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" /> מצטרפים יחד עם שכנים להזמנה משותפת</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" /> ככל שיותר דיירים מצטרפים – המחיר יורד</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" /> ספקים מאומתים בלבד, ללא התחייבות עד אישור המחיר</li>
              </ul>
            </div>

            {/* CTA */}
            <div className="mt-7 space-y-2 sticky bottom-4">
              <Button asChild size="lg" className="w-full h-12 text-base font-bold">
                <Link to={authHref}>הצטרפו לעסקה הקבוצתית</Link>
              </Button>
              <p className="text-fs-xs text-center text-muted-foreground">
                הרשמה מהירה • ללא עלות • סודיות מובטחת
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
