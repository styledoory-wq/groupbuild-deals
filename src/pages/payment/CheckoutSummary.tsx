import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Users,
  Tag,
  Lock,
  CreditCard,
  Smartphone,
  Loader2,
} from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SupplierLogo } from "@/components/suppliers/SupplierLogo";
import {
  getActiveTier,
  ils,
  sortTiers,
  describeTier,
  type OfferTier,
} from "@/lib/offerPricing";

interface DealRow {
  id: string;
  title: string;
  description: string | null;
  supplier_id: string;
  offer_type: string | null;
  original_price: number | null;
  discounted_price: number | null;
  discount_percentage: number | null;
  tiers: unknown;
  deposit_required: boolean | null;
  deposit_amount: number | null;
  cover_image_url: string | null;
}

interface SupplierRow {
  id: string;
  business_name: string | null;
  logo_url: string | null;
}

const BRAND = "#0E6B5A";

export default function CheckoutSummary() {
  const { dealId } = useParams<{ dealId: string }>();
  const navigate = useNavigate();

  const [deal, setDeal] = useState<DealRow | null>(null);
  const [supplier, setSupplier] = useState<SupplierRow | null>(null);
  const [participants, setParticipants] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Contact info (auto-filled from profile)
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    let cancel = false;
    if (!dealId) return;
    (async () => {
      setLoading(true);
      try {
        const { data: d } = await supabase
          .from("deals")
          .select(
            "id,title,description,supplier_id,offer_type,original_price,discounted_price,discount_percentage,tiers,deposit_required,deposit_amount,cover_image_url",
          )
          .eq("id", dealId)
          .eq("is_deleted", false)
          .maybeSingle();
        if (cancel) return;
        if (!d) {
          toast.error("העסקה לא נמצאה");
          navigate("/resident/deals", { replace: true });
          return;
        }
        setDeal(d as unknown as DealRow);

        const { data: sup } = await supabase
          .from("suppliers")
          .select("id,business_name,logo_url")
          .eq("id", (d as { supplier_id: string }).supplier_id)
          .maybeSingle();
        if (!cancel) setSupplier((sup as SupplierRow | null) ?? null);

        const { data: pc } = await supabase.rpc("get_deal_paid_count", { _deal_id: d.id });
        if (!cancel && typeof pc === "number") setParticipants(pc);

        const { data: session } = await supabase.auth.getSession();
        if (!session.session) {
          toast.error("נדרשת התחברות כדי להצטרף");
          navigate(`/auth?redirect=/checkout/${dealId}`, { replace: true });
          return;
        }
        const { data: prof } = await supabase
          .from("profiles")
          .select("full_name,phone")
          .eq("id", session.session.user.id)
          .maybeSingle();
        if (!cancel && prof) {
          setFullName(prof.full_name ?? "");
          setPhone(prof.phone ?? "");
        }
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [dealId, navigate]);

  const tiers: OfferTier[] = useMemo(() => {
    if (!deal?.tiers || !Array.isArray(deal.tiers)) return [];
    return sortTiers(deal.tiers as OfferTier[]);
  }, [deal]);

  const activeTier = useMemo(
    () => (tiers.length ? getActiveTier(tiers, participants) : null),
    [tiers, participants],
  );

  const tierLabel = activeTier ? describeTier(activeTier, deal?.offer_type ?? "tiers") : null;

  const headlinePrice = useMemo(() => {
    if (activeTier?.discounted_price) return activeTier.discounted_price;
    if (deal?.discounted_price) return deal.discounted_price;
    return null;
  }, [activeTier, deal]);

  const originalPrice = useMemo(() => {
    if (activeTier?.original_price) return activeTier.original_price;
    return deal?.original_price ?? null;
  }, [activeTier, deal]);

  const savings = useMemo(() => {
    if (originalPrice && headlinePrice && originalPrice > headlinePrice) {
      return originalPrice - headlinePrice;
    }
    return null;
  }, [originalPrice, headlinePrice]);

  const depositAmount = deal?.deposit_required ? deal.deposit_amount ?? 0 : 0;

  const canSubmit =
    !!deal && acceptedTerms && fullName.trim().length >= 2 && phone.trim().length >= 9 && !submitting;

  const handleConfirm = async () => {
    if (!deal || !canSubmit) return;
    setSubmitting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        toast.error("נדרשת התחברות");
        return;
      }
      const uid = session.session.user.id;

      // Create / upsert interest
      await supabase.from("deal_interests").upsert(
        {
          deal_id: deal.id,
          user_id: uid,
          full_name: fullName,
          phone,
          status: depositAmount > 0 ? "pending_deposit" : "interested",
          accepted_terms: true,
          accepted_terms_at: new Date().toISOString(),
        },
        { onConflict: "user_id,deal_id" },
      );

      if (depositAmount <= 0) {
        toast.success("הצטרפת בהצלחה להצעה 🎉");
        navigate(`/resident/deals/${deal.id}`, { replace: true });
        return;
      }

      const { data: paymentResponse, error: payErr } = await supabase.functions.invoke(
        "create-deposit",
        { body: { deal_id: deal.id, user_id: uid } },
      );
      if (payErr || paymentResponse?.error) {
        toast.error(paymentResponse?.message ?? "התשלום נכשל, נסה שנית");
        return;
      }
      let url: string | null =
        typeof paymentResponse?.payment_url === "string" ? paymentResponse.payment_url : null;
      const depositId =
        typeof paymentResponse?.deposit_id === "string" ? paymentResponse.deposit_id : null;
      if (!url && depositId) {
        toast.loading("ממתינים לקישור התשלום מהספק...", { id: "wait-pay-url" });
        const started = Date.now();
        while (Date.now() - started < 30000) {
          await new Promise((r) => setTimeout(r, 1500));
          const { data: depRow } = await supabase
            .from("deposits")
            .select("provider_payment_url,status")
            .eq("id", depositId)
            .maybeSingle();
          if (depRow?.provider_payment_url) {
            url = depRow.provider_payment_url;
            break;
          }
          if (depRow?.status === "failed" || depRow?.status === "cancelled") break;
        }
        toast.dismiss("wait-pay-url");
      }
      if (!url) {
        toast.error("שגיאה בחיבור לספק התשלום — פנה לתמיכה");
        return;
      }
      navigate(
        `/payment/checkout?url=${encodeURIComponent(url)}&deal_id=${encodeURIComponent(deal.id)}`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !deal) {
    return (
      <MobileShell>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <div dir="rtl" className="min-h-[100dvh] bg-[#F7F5F0] pb-32">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-black/5">
          <div className="h-14 flex items-center justify-between px-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="h-10 w-10 rounded-full bg-[#F7F5F0] flex items-center justify-center active:scale-95 transition"
              aria-label="חזרה"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
            <div className="text-center">
              <div className="text-[11px] text-muted-foreground">שלב 1 מתוך 2</div>
              <h1 className="text-sm font-extrabold leading-tight">סיכום ההצטרפות</h1>
            </div>
            <div className="h-10 w-10" />
          </div>
          {/* progress */}
          <div className="px-4 pb-2">
            <div className="h-1 rounded-full bg-black/10 overflow-hidden">
              <div className="h-full w-1/2 rounded-full" style={{ background: BRAND }} />
            </div>
          </div>
        </header>

        <main className="px-4 pt-4 space-y-4">
          {/* Deal card */}
          <section className="bg-white rounded-[20px] p-4 shadow-sm">
            <div className="flex items-start gap-3">
              {deal.cover_image_url ? (
                <img
                  src={deal.cover_image_url}
                  alt=""
                  className="h-16 w-16 rounded-2xl object-cover shrink-0"
                />
              ) : (
                <SupplierLogo
                  url={supplier?.logo_url ?? null}
                  name={supplier?.business_name ?? ""}
                  className="h-16 w-16 rounded-2xl shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-extrabold leading-tight line-clamp-2">
                  {deal.title}
                </h2>
                {supplier?.business_name && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {supplier.business_name}
                  </p>
                )}
                <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-[#F7F5F0] rounded-full px-2 py-0.5">
                  <Users className="h-3 w-3" />
                  {participants} כבר הצטרפו
                </div>
              </div>
            </div>
          </section>

          {/* Price summary */}
          <section className="bg-white rounded-[20px] p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Tag className="h-4 w-4" style={{ color: BRAND }} />
              <h3 className="text-sm font-extrabold">המחיר שלך</h3>
            </div>
            <div className="flex items-end gap-2">
              {headlinePrice != null ? (
                <>
                  <div className="text-3xl font-black" style={{ color: BRAND }}>
                    {ils(headlinePrice)}
                  </div>
                  {originalPrice && originalPrice > headlinePrice && (
                    <div className="text-sm text-muted-foreground line-through pb-1">
                      {ils(originalPrice)}
                    </div>
                  )}
                </>
              ) : deal.discount_percentage ? (
                <div className="text-3xl font-black" style={{ color: BRAND }}>
                  {deal.discount_percentage}% הנחה
                </div>
              ) : (
                <div className="text-base text-muted-foreground">לפי הצעה אישית</div>
              )}
            </div>
            {tierLabel && (
              <div className="mt-2 text-xs text-muted-foreground">{tierLabel}</div>
            )}
            {savings != null && (
              <div className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#0E6B5A] bg-[#0E6B5A]/10 rounded-full px-3 py-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                חיסכון של {ils(savings)}
              </div>
            )}
          </section>

          {/* Payment breakdown */}
          <section className="bg-white rounded-[20px] p-4 shadow-sm">
            <h3 className="text-sm font-extrabold mb-3">לתשלום עכשיו</h3>
            {depositAmount > 0 ? (
              <>
                <div className="flex items-center justify-between py-2 border-b border-black/5">
                  <span className="text-sm text-muted-foreground">פיקדון להבטחת מקום</span>
                  <span className="text-sm font-bold">{ils(depositAmount)}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-muted-foreground">יתרה לתשלום לספק*</span>
                  <span className="text-sm font-bold">
                    {headlinePrice != null ? ils(Math.max(headlinePrice - depositAmount, 0)) : "—"}
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t-2 border-black/10 flex items-center justify-between">
                  <span className="text-base font-extrabold">סה״כ עכשיו</span>
                  <span className="text-xl font-black" style={{ color: BRAND }}>
                    {ils(depositAmount)}
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">
                  *היתרה משולמת ישירות לספק במועד אספקת השירות. הפיקדון יוחזר אם
                  ההצעה לא מגיעה למינימום משתתפים.
                </p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">
                להצעה הזו אין פיקדון. ההצטרפות תהיה חינמית והספק יצור איתך קשר.
              </div>
            )}
          </section>

          {/* Contact */}
          <section className="bg-white rounded-[20px] p-4 shadow-sm space-y-3">
            <h3 className="text-sm font-extrabold">פרטים ליצירת קשר</h3>
            <div>
              <Label htmlFor="ck-name" className="text-xs">
                שם מלא
              </Label>
              <Input
                id="ck-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 h-11 rounded-xl"
                placeholder="ישראל ישראלי"
              />
            </div>
            <div>
              <Label htmlFor="ck-phone" className="text-xs">
                טלפון נייד
              </Label>
              <Input
                id="ck-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                type="tel"
                inputMode="tel"
                className="mt-1 h-11 rounded-xl"
                placeholder="05X-XXXXXXX"
              />
            </div>
          </section>

          {/* Refund policy */}
          {depositAmount > 0 && (
            <section className="bg-[#F0F9F6] rounded-[20px] p-4 border border-[#0E6B5A]/15">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="h-4 w-4" style={{ color: BRAND }} />
                <h3 className="text-sm font-extrabold" style={{ color: BRAND }}>
                  מדיניות החזר פיקדון
                </h3>
              </div>
              <ul className="text-xs text-foreground/80 space-y-1.5 leading-relaxed">
                <li>• אם ההצעה לא מגיעה למינימום המשתתפים — הפיקדון מוחזר אוטומטית</li>
                <li>• ביטול עד 24 שעות מההצטרפות — החזר מלא</li>
                <li>• הפיקדון נכלל במחיר הסופי של השירות</li>
              </ul>
            </section>
          )}

          {/* Terms */}
          <section className="bg-white rounded-[20px] p-4 shadow-sm">
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={acceptedTerms}
                onCheckedChange={(v) => setAcceptedTerms(v === true)}
                className="mt-0.5"
              />
              <span className="text-xs leading-relaxed">
                אני מאשר/ת את{" "}
                <a className="underline font-bold" href="/terms" target="_blank">
                  תנאי השימוש
                </a>{" "}
                ו
                <a className="underline font-bold" href="/privacy" target="_blank">
                  מדיניות הפרטיות
                </a>
                , ומסכים/ה שגרופבילד תיצור קשר בנוגע להצעה.
              </span>
            </label>
          </section>

          {/* Payment methods preview */}
          {depositAmount > 0 && (
            <section className="bg-white rounded-[20px] p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  תשלום מאובטח SSL — בעמוד הבא
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="border border-black/10 rounded-xl py-2.5 flex flex-col items-center gap-1 text-[10px] font-bold">
                  <CreditCard className="h-4 w-4" />
                  אשראי
                </div>
                <div className="border border-black/10 rounded-xl py-2.5 flex flex-col items-center gap-1 text-[10px] font-bold">
                  <Smartphone className="h-4 w-4" />
                  ביט
                </div>
                <div className="border border-black/10 rounded-xl py-2.5 flex flex-col items-center gap-1 text-[10px] font-bold">
                  <Smartphone className="h-4 w-4" />
                  Apple / Google Pay
                </div>
              </div>
            </section>
          )}
        </main>

        {/* Sticky CTA */}
        <div className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-black/10 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),12px)]">
          <Button
            disabled={!canSubmit}
            onClick={handleConfirm}
            className="w-full h-14 rounded-2xl text-base font-extrabold shadow-lg"
            style={{ background: BRAND, color: "white" }}
          >
            {submitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : depositAmount > 0 ? (
              <>המשך לתשלום מאובטח · {ils(depositAmount)}</>
            ) : (
              <>אישור הצטרפות</>
            )}
          </Button>
          {!acceptedTerms && (
            <p className="text-center text-[11px] text-muted-foreground mt-2">
              יש לאשר את התנאים כדי להמשיך
            </p>
          )}
        </div>
      </div>
    </MobileShell>
  );
}
