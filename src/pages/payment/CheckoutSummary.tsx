import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Users,
  Tag,
  ExternalLink,
  Loader2,
  AlertCircle,
  Info,
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
  supplier_payment_link: string | null;
  supplier_payment_instructions: string | null;
}

interface SupplierRow {
  id: string;
  business_name: string | null;
  logo_url: string | null;
  phone: string | null;
}

const BRAND = "#0E6B5A";

type Phase = "form" | "pay";

const DISCLAIMER = "הפיקדון משולם ישירות לספק כהוכחת רצינות. GroupBuild אינה גובה או מחזיקה את כספי הפיקדון.";

export default function CheckoutSummary() {
  const { dealId } = useParams<{ dealId: string }>();
  const navigate = useNavigate();

  const [deal, setDeal] = useState<DealRow | null>(null);
  const [supplier, setSupplier] = useState<SupplierRow | null>(null);
  const [participants, setParticipants] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [marking, setMarking] = useState(false);

  const [phase, setPhase] = useState<Phase>("form");
  const [interestId, setInterestId] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [joinMode, setJoinMode] = useState<"flexible" | "conditional">("flexible");

  useEffect(() => {
    let cancel = false;
    if (!dealId) return;
    (async () => {
      setLoading(true);
      try {
        const { data: d } = await supabase
          .from("deals")
          .select(
            "id,title,description,supplier_id,offer_type,original_price,discounted_price,discount_percentage,tiers,deposit_required,deposit_amount,cover_image_url,supplier_payment_link,supplier_payment_instructions",
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
          .select("id,business_name,logo_url,phone")
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

        // If user already has an awaiting_payment interest, jump straight to pay phase
        const { data: existing } = await supabase
          .from("deal_interests")
          .select("id,direct_deposit_status")
          .eq("user_id", session.session.user.id)
          .eq("deal_id", d.id)
          .eq("is_deleted", false)
          .maybeSingle();
        if (!cancel && existing?.id) {
          setInterestId(existing.id);
          if (existing.direct_deposit_status === "awaiting_payment" || existing.direct_deposit_status === "marked_paid_by_resident") {
            setPhase("pay");
          }
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

  const tierLabel = activeTier
    ? describeTier((deal?.offer_type as "percentage" | "price_comparison" | "tiers") ?? "tiers", activeTier).headline
    : null;

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
  const supplierLink = deal?.supplier_payment_link?.trim() || null;

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

      const directStatus =
        depositAmount > 0 ? "awaiting_payment" : "not_required";

      const { data: existing } = await supabase
        .from("deal_interests")
        .select("id")
        .eq("user_id", uid)
        .eq("deal_id", deal.id)
        .eq("is_deleted", false)
        .maybeSingle();

      const interestPayload = {
        deal_id: deal.id,
        user_id: uid,
        full_name: fullName,
        phone,
        status: depositAmount > 0 ? "pending_deposit" : "interested",
        deposit_required: depositAmount > 0,
        deposit_amount: depositAmount,
        deposit_status: depositAmount > 0 ? "pending" : "none",
        direct_deposit_status: directStatus,
        direct_deposit_amount: depositAmount > 0 ? depositAmount : null,
        terms_accepted_at: new Date().toISOString(),
        lead_status: "new",
      };

      let savedId = existing?.id ?? null;
      if (savedId) {
        const { error } = await supabase.from("deal_interests").update(interestPayload).eq("id", savedId);
        if (error) throw error;
      } else {
        const { data: ins, error } = await supabase
          .from("deal_interests")
          .insert(interestPayload)
          .select("id")
          .single();
        if (error) throw error;
        savedId = ins.id;
      }
      setInterestId(savedId);

      if (depositAmount <= 0) {
        toast.success("הצטרפת בהצלחה להצעה 🎉");
        navigate(`/resident/deals/${deal.id}`, { replace: true });
        return;
      }
      setPhase("pay");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "שמירת הפרטים נכשלה");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!interestId) return;
    setMarking(true);
    try {
      const { error } = await supabase.rpc("resident_mark_deposit_paid", { _interest_id: interestId });
      if (error) throw error;
      toast.success("סימנו שהפיקדון שולם. הספק יאשר את הקבלה בקרוב.");
      navigate(`/resident/deals/${deal!.id}`, { replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "פעולה נכשלה");
    } finally {
      setMarking(false);
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
              onClick={() => (phase === "pay" ? setPhase("form") : navigate(-1))}
              className="h-10 w-10 rounded-full bg-[#F7F5F0] flex items-center justify-center active:scale-95 transition"
              aria-label="חזרה"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
            <div className="text-center">
              <div className="text-[11px] text-muted-foreground">שלב {phase === "form" ? "1" : "2"} מתוך 2</div>
              <h1 className="text-sm font-extrabold leading-tight">
                {phase === "form" ? "סיכום ההצטרפות" : "תשלום פיקדון לספק"}
              </h1>
            </div>
            <div className="h-10 w-10" />
          </div>
          <div className="px-4 pb-2">
            <div className="h-1 rounded-full bg-black/10 overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ background: BRAND, width: phase === "form" ? "50%" : "100%" }} />
            </div>
          </div>
        </header>

        <main className="px-4 pt-4 space-y-4">
          {/* Deal card */}
          <section className="bg-white rounded-[20px] p-4 shadow-sm">
            <div className="flex items-start gap-3">
              {deal.cover_image_url ? (
                <img src={deal.cover_image_url} alt="" className="h-16 w-16 rounded-2xl object-cover shrink-0" />
              ) : (
                <SupplierLogo
                  logoUrl={supplier?.logo_url ?? null}
                  name={supplier?.business_name ?? ""}
                  className="h-16 w-16 rounded-2xl shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-extrabold leading-tight line-clamp-2">{deal.title}</h2>
                {supplier?.business_name && (
                  <p className="text-xs text-muted-foreground mt-1">{supplier.business_name}</p>
                )}
                <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-[#F7F5F0] rounded-full px-2 py-0.5">
                  <Users className="h-3 w-3" />
                  {participants} כבר הצטרפו
                </div>
              </div>
            </div>
          </section>

          {phase === "form" && (
            <>
              {/* Price summary */}
              <section className="bg-white rounded-[20px] p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Tag className="h-4 w-4" style={{ color: BRAND }} />
                  <h3 className="text-sm font-extrabold">המחיר שלך</h3>
                </div>
                <div className="flex items-end gap-2">
                  {headlinePrice != null ? (
                    <>
                      <div className="text-3xl font-black" style={{ color: BRAND }}>{ils(headlinePrice)}</div>
                      {originalPrice && originalPrice > headlinePrice && (
                        <div className="text-sm text-muted-foreground line-through pb-1">{ils(originalPrice)}</div>
                      )}
                    </>
                  ) : deal.discount_percentage ? (
                    <div className="text-3xl font-black" style={{ color: BRAND }}>{deal.discount_percentage}% הנחה</div>
                  ) : (
                    <div className="text-base text-muted-foreground">לפי הצעה אישית</div>
                  )}
                </div>
                {tierLabel && <div className="mt-2 text-xs text-muted-foreground">{tierLabel}</div>}
                {savings != null && (
                  <div className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#0E6B5A] bg-[#0E6B5A]/10 rounded-full px-3 py-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    חיסכון של {ils(savings)}
                  </div>
                )}
              </section>

              {/* Deposit breakdown */}
              <section className="bg-white rounded-[20px] p-4 shadow-sm">
                <h3 className="text-sm font-extrabold mb-3">פיקדון להבטחת מקום</h3>
                {depositAmount > 0 ? (
                  <>
                    <div className="flex items-center justify-between py-2 border-b border-black/5">
                      <span className="text-sm text-muted-foreground">סכום פיקדון לספק</span>
                      <span className="text-xl font-black" style={{ color: BRAND }}>{ils(depositAmount)}</span>
                    </div>
                    <div className="mt-3 rounded-xl bg-[#FFF8E1] border border-[#E0B84A]/40 p-3 flex gap-2">
                      <Info className="h-4 w-4 shrink-0 mt-0.5 text-[#8B6914]" />
                      <p className="text-[11px] leading-relaxed text-[#5A4709] font-medium">{DISCLAIMER}</p>
                    </div>
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
                  <Label htmlFor="ck-name" className="text-xs">שם מלא</Label>
                  <Input id="ck-name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1 h-11 rounded-xl" placeholder="ישראל ישראלי" />
                </div>
                <div>
                  <Label htmlFor="ck-phone" className="text-xs">טלפון נייד</Label>
                  <Input id="ck-phone" value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" className="mt-1 h-11 rounded-xl" placeholder="05X-XXXXXXX" />
                </div>
              </section>

              {/* Refund policy */}
              {depositAmount > 0 && (
                <section className="bg-[#F0F9F6] rounded-[20px] p-4 border border-[#0E6B5A]/15">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="h-4 w-4" style={{ color: BRAND }} />
                    <h3 className="text-sm font-extrabold" style={{ color: BRAND }}>מדיניות פיקדון</h3>
                  </div>
                  <ul className="text-xs text-foreground/80 space-y-1.5 leading-relaxed">
                    <li>• הפיקדון משולם <b>ישירות לספק</b> דרך הקישור שהוא סיפק (PayBox / Bit / אחר).</li>
                    <li>• מדיניות החזר ובירורי תשלום הם בין הדייר לספק בלבד.</li>
                    <li>• אם ההצעה לא יוצאת לפועל — יש לפנות לספק לקבלת החזר.</li>
                    <li>• GroupBuild לא גובה, לא מחזיקה ולא מעבירה את הכסף.</li>
                  </ul>
                </section>
              )}

              {/* Terms */}
              <section className="bg-white rounded-[20px] p-4 shadow-sm">
                <label className="flex items-start gap-3 cursor-pointer">
                  <Checkbox checked={acceptedTerms} onCheckedChange={(v) => setAcceptedTerms(v === true)} className="mt-0.5" />
                  <span className="text-xs leading-relaxed">
                    אני מאשר/ת את{" "}
                    <Link className="underline font-bold" to="/terms/residents">תנאי השימוש</Link>{" "}
                    ו<Link className="underline font-bold" to="/privacy">מדיניות הפרטיות</Link>
                    , ומבין/ה שהפיקדון משולם <b>ישירות לספק</b> כהוכחת רצינות. GroupBuild היא פלטפורמת תיווך בלבד ואינה גובה או מחזיקה את כספי הפיקדון.
                  </span>
                </label>
              </section>
            </>
          )}

          {phase === "pay" && (
            <>
              <section className="bg-white rounded-[20px] p-5 shadow-sm text-center">
                <div className="text-xs text-muted-foreground mb-1">סכום פיקדון לתשלום</div>
                <div className="text-4xl font-black" style={{ color: BRAND }}>{ils(depositAmount)}</div>
                {supplier?.business_name && (
                  <div className="text-xs text-muted-foreground mt-2">
                    משולם ישירות לספק: <b>{supplier.business_name}</b>
                  </div>
                )}
              </section>

              <section className="bg-[#FFF8E1] rounded-[20px] p-4 border border-[#E0B84A]/40 flex gap-2">
                <Info className="h-4 w-4 shrink-0 mt-0.5 text-[#8B6914]" />
                <p className="text-[12px] leading-relaxed text-[#5A4709] font-medium">{DISCLAIMER}</p>
              </section>

              {supplierLink ? (
                <section className="bg-white rounded-[20px] p-4 shadow-sm space-y-3">
                  <h3 className="text-sm font-extrabold">מעבר לקישור התשלום של הספק</h3>
                  <Button
                    asChild
                    className="w-full h-14 rounded-2xl text-base font-extrabold shadow-lg"
                    style={{ background: BRAND, color: "white" }}
                  >
                    <a href={supplierLink} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-5 w-5 ml-2" />
                      פתח קישור תשלום
                    </a>
                  </Button>
                  <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
                    הקישור ייפתח בכרטיסייה חדשה. אחרי שתסיים, חזור לכאן וסמן שביצעת את התשלום.
                  </p>
                </section>
              ) : (
                <section className="bg-white rounded-[20px] p-4 shadow-sm flex gap-2 items-start">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs leading-relaxed">
                    הספק טרם הגדיר קישור תשלום. אנא צור איתו קשר ישירות
                    {supplier?.phone ? <> בטלפון <a href={`tel:${supplier.phone}`} className="font-bold underline">{supplier.phone}</a></> : null}
                    {" "}לקבלת פרטי התשלום.
                  </p>
                </section>
              )}

              {deal.supplier_payment_instructions && (
                <section className="bg-white rounded-[20px] p-4 shadow-sm">
                  <h3 className="text-sm font-extrabold mb-2">הוראות נוספות מהספק</h3>
                  <p className="text-xs text-foreground/80 whitespace-pre-line leading-relaxed">
                    {deal.supplier_payment_instructions}
                  </p>
                </section>
              )}

              <section className="bg-white rounded-[20px] p-4 shadow-sm">
                <h3 className="text-sm font-extrabold mb-2">איך זה ממשיך?</h3>
                <ol className="text-xs text-foreground/80 space-y-2 leading-relaxed list-decimal pr-4">
                  <li>תעביר את הפיקדון ישירות לספק דרך הקישור או ההוראות.</li>
                  <li>תחזור לכאן ותלחץ על "סימנתי ששילמתי".</li>
                  <li>הספק יקבל התראה ויאשר את קבלת הפיקדון.</li>
                  <li>ההצטרפות שלך לעסקה תושלם אוטומטית מיד אחרי האישור של הספק.</li>
                </ol>
              </section>
            </>
          )}
        </main>

        {/* Sticky CTA */}
        <div className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-black/10 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),12px)]">
          {phase === "form" ? (
            <>
              <Button
                disabled={!canSubmit}
                onClick={handleConfirm}
                className="w-full h-14 rounded-2xl text-base font-extrabold shadow-lg"
                style={{ background: BRAND, color: "white" }}
              >
                {submitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : depositAmount > 0 ? (
                  <>המשך לתשלום לספק · {ils(depositAmount)}</>
                ) : (
                  <>אישור הצטרפות</>
                )}
              </Button>
              {!acceptedTerms && (
                <p className="text-center text-[11px] text-muted-foreground mt-2">יש לאשר את התנאים כדי להמשיך</p>
              )}
            </>
          ) : (
            <Button
              disabled={marking}
              onClick={handleMarkPaid}
              className="w-full h-14 rounded-2xl text-base font-extrabold shadow-lg"
              style={{ background: BRAND, color: "white" }}
            >
              {marking ? <Loader2 className="h-5 w-5 animate-spin" /> : <>סימנתי ששילמתי לספק</>}
            </Button>
          )}
        </div>
      </div>
    </MobileShell>
  );
}
