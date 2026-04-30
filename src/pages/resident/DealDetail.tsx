import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Star, Shield, Sparkles, Loader2, ArrowRight, ShieldCheck, Tag, Users, TrendingUp, MessageCircle, Phone } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { normalizeWhatsappUrl } from "@/lib/whatsapp";
import { SupplierLogo } from "@/components/suppliers/SupplierLogo";
import { SupplierRatingBadge } from "@/components/reviews/SupplierRatingBadge";
import { useApp } from "@/store/AppStore";
import {
  describeOffer,
  describeTier,
  getActiveTier,
  getNextTier,
  ils,
  tierRange,
  tierShortValue,
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
  deposit_required: boolean | null;
  deposit_amount: number | null;
}

interface SupplierRow {
  id: string;
  business_name: string;
  logo_url: string | null;
  approval_status: string;
  service_areas: string[] | null;
  phone: string | null;
  whatsapp_url: string | null;
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
  const [participantCount, setParticipantCount] = useState<number>(0);

  // Join modal state
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [joinForm, setJoinForm] = useState({
    full_name: "",
    phone: "",
    city: "",
    project_name: "",
    notes: "",
    estimated_quantity: "",
  });

  const loadParticipantCount = async (id: string) => {
    const { data, error: rpcErr } = await supabase.rpc("get_deal_interest_count", { _deal_id: id });
    if (!rpcErr && typeof data === "number") setParticipantCount(data);
  };

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
            "id,title,description,status,category_id,supplier_id,offer_type,original_price,discounted_price,discount_percentage,base_price,tiers,ends_at,deposit_required,deposit_amount",
          )
          .eq("id", dealId)
          .eq("is_deleted", false)
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
          .select("id,business_name,logo_url,approval_status,service_areas,phone,whatsapp_url")
          .eq("id", d.supplier_id)
          .maybeSingle();
        if (!cancelled) setSupplier((supData as SupplierRow | null) ?? null);

        await loadParticipantCount(d.id);

        const { data: session } = await supabase.auth.getSession();
        if (session.session) {
          const { data: interest } = await supabase
            .from("deal_interests")
            .select("id")
            .eq("user_id", session.session.user.id)
            .eq("deal_id", d.id)
            .eq("is_deleted", false)
            .maybeSingle();
          if (!cancelled && interest) setInterested(true);

          // Prefill form from profile
          const { data: prof } = await supabase
            .from("profiles")
            .select("full_name,phone,city")
            .eq("id", session.session.user.id)
            .maybeSingle();
          if (!cancelled && prof) {
            setJoinForm((f) => ({
              ...f,
              full_name: f.full_name || (prof.full_name ?? ""),
              phone: f.phone || (prof.phone ?? ""),
              city: f.city || (prof.city ?? ""),
            }));
          }
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

  const handleJoinClick = async () => {
    if (!deal) return;
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      toast.error("יש להתחבר כדי להצטרף להצעה");
      return;
    }
    setAcceptedTerms(false);
    setShowJoinModal(true);
  };

  const submitJoin = async () => {
    if (!deal) return;
    if (!joinForm.full_name.trim() || !joinForm.phone.trim()) {
      toast.error("נא למלא שם וטלפון");
      return;
    }
    if (!acceptedTerms) {
      toast.error("יש לאשר את התקנון ותנאי השימוש");
      return;
    }
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      toast.error("יש להתחבר כדי להצטרף להצעה");
      return;
    }
    const depositRequired = !!deal.deposit_required && Number(deal.deposit_amount ?? 0) > 0;
    setSubmittingInterest(true);
    try {
      const qty = joinForm.estimated_quantity.trim()
        ? Number(joinForm.estimated_quantity)
        : null;
      const payload = {
        user_id: session.session.user.id,
        deal_id: deal.id,
        status: depositRequired ? "pending_deposit" : "interested",
        deposit_required: depositRequired,
        deposit_amount: depositRequired ? Number(deal.deposit_amount ?? 0) : 0,
        deposit_status: depositRequired ? "pending" : "none",
        full_name: joinForm.full_name.trim(),
        phone: joinForm.phone.trim(),
        city: joinForm.city.trim() || null,
        project_name: joinForm.project_name.trim() || null,
        notes: joinForm.notes.trim() || null,
        estimated_quantity: qty && !Number.isNaN(qty) ? qty : null,
        terms_accepted_at: new Date().toISOString(),
        lead_status: "new",
      };
      const { error: insErr } = await supabase.from("deal_interests").insert(payload);
      if (insErr && !insErr.message.toLowerCase().includes("duplicate")) throw insErr;
      setInterested(true);
      setShowJoinModal(false);
      toast.success(
        depositRequired
          ? "נקלטה הצטרפות — סטטוס פיקדון: ממתין"
          : "נרשמת בהצלחה להצעה",
      );
      await loadParticipantCount(deal.id);
      supabase.functions
        .invoke("notify-admin", {
          body: {
            event: "deal_interest",
            title: depositRequired ? "הצטרפות להצעה (ממתין לפיקדון)" : "מתעניין חדש בעסקה",
            details: {
              deal_id: deal.id,
              deal_title: deal.title,
              deposit_required: depositRequired,
              deposit_amount: depositRequired ? Number(deal.deposit_amount ?? 0) : 0,
              user_id: session.session.user.id,
              user_email: session.session.user.email,
              full_name: payload.full_name,
              phone: payload.phone,
              city: payload.city,
              project_name: payload.project_name,
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
    participantCount,
  );
  const activeTier = tiers.length > 0 ? getActiveTier(tiers, participantCount) : null;
  const nextTier = tiers.length > 0 ? getNextTier(tiers, participantCount) : null;
  const peopleNeeded = nextTier ? Math.max(0, nextTier.minParticipants - participantCount) : 0;
  const category = categories.find((c) => c.id === deal.category_id);
  const depositRequired = !!deal.deposit_required && Number(deal.deposit_amount ?? 0) > 0;

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
      <div className="px-5 -mt-6 relative z-10 mb-4">
        <div className="gb-card p-5 bg-gradient-card">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">המחיר/הנחה הנוכחיים</div>
          <div className="text-2xl font-extrabold text-primary leading-tight">{display.headline}</div>
          <p className="text-[11px] text-muted-foreground mt-2">
            ככל שיותר דיירים מצטרפים — ההנחה גדלה
          </p>
        </div>
      </div>

      {/* Live progress */}
      <div className="px-5 mb-4">
        <div className="gb-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Users className="h-4 w-4 text-gold" />
              כמות מצטרפים כרגע
            </div>
            <div className="text-lg font-extrabold text-primary">{participantCount}</div>
          </div>
          {nextTier ? (
            <div className="rounded-xl bg-gold/10 border border-gold/30 px-3 py-2 flex items-start gap-2">
              <TrendingUp className="h-4 w-4 text-gold mt-0.5 shrink-0" />
              <div className="text-[12px] text-foreground leading-relaxed">
                עוד <span className="font-extrabold text-primary">{peopleNeeded}</span>{" "}
                {peopleNeeded === 1 ? "דייר" : "דיירים"} וההנחה עולה ל-
                <span className="font-extrabold text-primary">{tierShortValue(offerType, nextTier)}</span>
              </div>
            </div>
          ) : tiers.length > 0 ? (
            <div className="rounded-xl bg-success/10 border border-success/30 px-3 py-2 text-[12px] font-bold text-success">
              ✓ הגעתם למדרגה הטובה ביותר
            </div>
          ) : null}
        </div>
      </div>

      {/* Deposit notice */}
      {depositRequired && (
        <div className="px-5 mb-4">
          <div className="rounded-2xl border border-gold/40 bg-gold/5 px-4 py-3 text-[12px] text-foreground">
            <div className="font-bold mb-0.5">נדרש פיקדון להצטרפות: {ils(Number(deal.deposit_amount))}</div>
            <div className="text-muted-foreground">
              הפיקדון מהווה התחייבות בלבד — בשלב זה לא תתבצע גבייה בפועל.
            </div>
          </div>
        </div>
      )}

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
        <section className="px-5 mb-28">
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
          <div className="gb-card p-3 shadow-elevated space-y-2">
            {interested ? (
              <div className="text-center text-xs font-bold text-success bg-success/10 rounded-xl py-3">
                ✓ כבר הצטרפת להצעה — נחזור אליך עם פרטים
              </div>
            ) : (
              <Button
                onClick={handleJoinClick}
                disabled={submittingInterest}
                className="w-full h-12 rounded-2xl bg-gradient-gold text-primary font-bold shadow-gold"
              >
                {submittingInterest ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : depositRequired ? (
                  `הצטרף להצעה · פיקדון ${ils(Number(deal.deposit_amount))}`
                ) : (
                  "אני מעוניין להצטרף להצעה"
                )}
              </Button>
            )}
            {supplier && (() => {
              const wa = normalizeWhatsappUrl(supplier.whatsapp_url || supplier.phone);
              const tel = supplier.phone ? `tel:${supplier.phone.replace(/\s+/g, "")}` : null;
              if (!wa && !tel) return null;
              return (
                <div className="grid grid-cols-2 gap-2">
                  {wa ? (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-10 rounded-xl border border-border bg-card text-foreground text-xs font-bold flex items-center justify-center gap-1.5 hover:border-gold/40 transition-smooth"
                    >
                      <MessageCircle className="h-3.5 w-3.5 text-gold" />
                      וואטסאפ
                    </a>
                  ) : <div />}
                  {tel ? (
                    <a
                      href={tel}
                      className="h-10 rounded-xl border border-border bg-card text-foreground text-xs font-bold flex items-center justify-center gap-1.5 hover:border-gold/40 transition-smooth"
                    >
                      <Phone className="h-3.5 w-3.5 text-gold" />
                      התקשר לספק
                    </a>
                  ) : <div />}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Join modal */}
      <Dialog open={showJoinModal} onOpenChange={setShowJoinModal}>
        <DialogContent dir="rtl" className="text-right max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>הצטרפות להצעה</DialogTitle>
            <DialogDescription className="text-right leading-relaxed">
              <span className="block font-bold text-foreground">{deal.title}</span>
              {supplier?.business_name && (
                <span className="block text-[12px] text-muted-foreground mt-0.5">{supplier.business_name}</span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-[12px] mb-1 block">שם מלא *</Label>
              <Input
                value={joinForm.full_name}
                onChange={(e) => setJoinForm({ ...joinForm, full_name: e.target.value })}
                placeholder="ישראל ישראלי"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[12px] mb-1 block">טלפון *</Label>
                <Input
                  type="tel"
                  value={joinForm.phone}
                  onChange={(e) => setJoinForm({ ...joinForm, phone: e.target.value })}
                  placeholder="0501234567"
                />
              </div>
              <div>
                <Label className="text-[12px] mb-1 block">עיר</Label>
                <Input
                  value={joinForm.city}
                  onChange={(e) => setJoinForm({ ...joinForm, city: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[12px] mb-1 block">פרויקט</Label>
                <Input
                  value={joinForm.project_name}
                  onChange={(e) => setJoinForm({ ...joinForm, project_name: e.target.value })}
                  placeholder="שם הפרויקט"
                />
              </div>
              <div>
                <Label className="text-[12px] mb-1 block">כמות משוערת</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={joinForm.estimated_quantity}
                  onChange={(e) => setJoinForm({ ...joinForm, estimated_quantity: e.target.value })}
                  placeholder="לדוגמה 8"
                />
              </div>
            </div>
            <div>
              <Label className="text-[12px] mb-1 block">הערות / מה אני צריך</Label>
              <Textarea
                rows={3}
                value={joinForm.notes}
                onChange={(e) => setJoinForm({ ...joinForm, notes: e.target.value })}
                placeholder="פרטים נוספים שיעזרו לספק להכין הצעת מחיר אישית"
              />
            </div>

            {depositRequired && (
              <div className="rounded-xl border border-gold/40 bg-gold/5 px-3 py-2 text-[12px] text-foreground">
                <div className="font-bold mb-0.5">פיקדון נדרש: {ils(Number(deal.deposit_amount ?? 0))}</div>
                <div className="text-muted-foreground">
                  ההצטרפות תישמר עם סטטוס פיקדון "ממתין". בשלב זה לא מתבצעת גבייה בפועל.
                </div>
              </div>
            )}

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="h-4 w-4 mt-0.5 accent-primary shrink-0"
              />
              <span className="text-[12px] text-foreground leading-relaxed">
                אני מאשר/ת קריאת התקנון ותנאי השימוש, ויצירת קשר מצד הספק או מנהל המערכת.
                ההצטרפות אינה מחייבת רכישה — המחיר הסופי, האחריות והאספקה ייקבעו ישירות מול הספק.
              </span>
            </label>
          </div>

          <DialogFooter className="gap-2 sm:gap-2 mt-2">
            <Button
              variant="outline"
              onClick={() => setShowJoinModal(false)}
              className="rounded-xl"
              disabled={submittingInterest}
            >
              ביטול
            </Button>
            <Button
              onClick={submitJoin}
              disabled={!acceptedTerms || submittingInterest}
              className="rounded-xl bg-gradient-gold text-primary font-bold"
            >
              {submittingInterest ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : depositRequired ? (
                "אישור הצטרפות + שמירת פיקדון"
              ) : (
                "אשר הצטרפות"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav role="resident" />
    </MobileShell>
  );
}
