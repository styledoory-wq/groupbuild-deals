import { useParams } from "react-router-dom";
import { useState } from "react";
import { Star, Shield, Clock, TrendingDown, Users, Check, Sparkles, Loader2 } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatILS, getActiveTier, getNextTier, useApp } from "@/store/AppStore";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function DealDetail() {
  const { dealId } = useParams();
  const { deals, suppliers, categories, joinDeal, deposits, user } = useApp();
  const deal = deals.find((d) => d.id === dealId);
  const [joined, setJoined] = useState(false);
  const [paying, setPaying] = useState(false);

  if (!deal) {
    return (
      <MobileShell>
        <PageHeader title="עסקה לא נמצאה" />
        <BottomNav role="resident" />
      </MobileShell>
    );
  }

  const supplier = suppliers.find((s) => s.id === deal.supplierId);
  const category = categories.find((c) => c.id === deal.categoryId);
  const tier = getActiveTier(deal);
  const next = getNextTier(deal);
  const savings = Math.round(((deal.originalPrice - tier.price) / deal.originalPrice) * 100);
  const paidByMe = deposits.some((d) => d.dealId === deal.id && d.userId === user?.id);

  const handleJoin = () => {
    joinDeal(deal.id);
    setJoined(true);
    toast.success("הצטרפת לעסקה! עכשיו שלמו פיקדון להבטחת המקום.");
  };

  const handleDeposit = async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      toast.error("יש להתחבר עם חשבון אמיתי כדי לשלם פיקדון");
      return;
    }
    setPaying(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-deposit", {
        body: { deal_id: deal.id, amount: deal.depositAmount },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.message || "שגיאה ביצירת תשלום");
        setPaying(false);
        return;
      }
      if (!data?.payment_url) {
        toast.error("לא התקבל קישור תשלום מהספק");
        setPaying(false);
        return;
      }
      window.location.href = data.payment_url;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "שגיאה ביצירת תשלום";
      toast.error(msg);
      setPaying(false);
    }
  };

  return (
    <MobileShell>
      {/* Hero */}
      <div className="bg-gradient-hero text-primary-foreground px-5 pt-6 pb-10 rounded-b-[32px] relative overflow-hidden">
        <div className="absolute -top-12 -left-12 h-40 w-40 rounded-full bg-gold/10 blur-3xl" />
        <PageHeader title="" subtitle="" back variant="navy" />
        <div className="-mt-10 relative">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center text-xl">{category?.icon}</div>
            <span className="text-xs text-primary-foreground/70">{category?.name}</span>
            {deal.status === "closing-soon" && (
              <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-destructive/20 text-destructive-foreground">נסגר בקרוב</span>
            )}
          </div>
          <h1 className="text-2xl font-extrabold leading-tight mb-2">{deal.title}</h1>
          <div className="gb-divider-gold mb-3" />
          <p className="text-primary-foreground/75 text-sm leading-relaxed">{deal.description}</p>

          <div className="flex flex-wrap gap-2 mt-4">
            {deal.highlights.map((h) => (
              <span key={h} className="text-[11px] font-medium px-3 py-1.5 rounded-full bg-white/10 border border-white/15 inline-flex items-center gap-1">
                <Check className="h-3 w-3 text-gold" /> {h}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing card */}
      <div className="px-5 -mt-6 relative z-10 mb-5">
        <div className="gb-card p-5 bg-gradient-card">
          <div className="flex items-end justify-between mb-3">
            <div>
              <div className="text-xs text-muted-foreground line-through">מחיר מחירון: {formatILS(deal.originalPrice)}</div>
              <div className="text-3xl font-extrabold text-primary leading-none mt-1">{formatILS(tier.price)}</div>
              <div className="text-[11px] text-muted-foreground mt-1">{tier.label}</div>
            </div>
            <div className="text-center bg-success/10 px-3 py-2 rounded-2xl">
              <TrendingDown className="h-5 w-5 mx-auto text-success" />
              <div className="text-lg font-extrabold text-success leading-none mt-1">{savings}%</div>
              <div className="text-[10px] text-success">חיסכון</div>
            </div>
          </div>

          <div className="pt-3 border-t border-border">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-muted-foreground inline-flex items-center gap-1">
                <Users className="h-3 w-3" />
                {deal.paidParticipants} שילמו פיקדון · {deal.joinedParticipants} הצטרפו
              </span>
              {next && (
                <span className="font-bold text-primary">
                  עוד {next.minParticipants - deal.paidParticipants} לדרגה הבאה
                </span>
              )}
            </div>
            <ProgressBar value={deal.paidParticipants} max={next ? next.minParticipants : deal.paidParticipants} />
          </div>
        </div>
      </div>

      {/* Tiers */}
      <section className="px-5 mb-5">
        <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-gold" />
          דרגות מחיר
        </h2>
        <div className="space-y-2">
          {deal.tiers.map((t) => {
            const active = t.minParticipants === tier.minParticipants;
            const reached = deal.paidParticipants >= t.minParticipants;
            const range = t.maxParticipants ? `${t.minParticipants}–${t.maxParticipants}` : `${t.minParticipants}+`;
            return (
              <div
                key={t.minParticipants}
                className={cn(
                  "rounded-2xl p-3 flex items-center justify-between border-2 transition-smooth",
                  active ? "border-gold bg-gradient-to-l from-gold/10 to-transparent" : "border-border bg-card"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-10 w-10 rounded-xl flex items-center justify-center font-bold text-sm",
                    active ? "bg-gradient-gold text-primary" : reached ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {reached ? <Check className="h-5 w-5" /> : range}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-foreground">{t.label}</div>
                    <div className="text-[11px] text-muted-foreground">{range} משתתפים</div>
                  </div>
                </div>
                <div className="text-left">
                  <div className="font-extrabold text-primary">{formatILS(t.price)}</div>
                  {active && <div className="text-[10px] gb-gold-text font-bold">פעיל עכשיו</div>}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Supplier */}
      <section className="px-5 mb-5">
        <h2 className="text-sm font-bold text-foreground mb-3">הספק</h2>
        <div className="gb-card p-4 flex items-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-gradient-hero flex items-center justify-center text-2xl">{supplier?.logoEmoji}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <h3 className="font-bold text-foreground truncate">{supplier?.businessName}</h3>
              {supplier?.verified && <Shield className="h-4 w-4 text-gold" />}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="h-3.5 w-3.5 fill-gold text-gold" />
              <span className="font-bold text-foreground">{supplier?.rating}</span>
              <span>· {supplier?.reviewsCount} ביקורות</span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">אזור שירות: {supplier?.serviceArea}</div>
          </div>
        </div>
      </section>

      {/* Action sticky */}
      <div className="fixed bottom-0 inset-x-0 z-30 flex justify-center pointer-events-none">
        <div className="pointer-events-auto w-full max-w-[480px] px-4 pb-4 pt-3 bg-gradient-to-t from-background via-background to-background/0">
          <div className="gb-card p-3 flex items-center gap-2 shadow-elevated mb-2">
            {paidByMe ? (
              <Button disabled className="w-full h-12 rounded-2xl bg-success text-success-foreground font-bold">
                <Check className="h-5 w-5 ml-2" /> הפיקדון שלך התקבל
              </Button>
            ) : joined ? (
              <Button onClick={handleDeposit} disabled={paying} className="w-full h-12 rounded-2xl bg-gradient-gold hover:opacity-90 text-primary font-bold shadow-gold">
                {paying ? <Loader2 className="h-5 w-5 animate-spin" /> : `שלמו פיקדון ${formatILS(deal.depositAmount)}`}
              </Button>
            ) : (
              <>
                <Button onClick={handleJoin} variant="outline" className="flex-1 h-12 rounded-2xl border-2 border-primary text-primary font-bold">
                  הצטרפו לעסקה
                </Button>
                <Button onClick={handleDeposit} disabled={paying} className="flex-1 h-12 rounded-2xl bg-primary hover:bg-primary-soft text-primary-foreground font-bold">
                  {paying ? <Loader2 className="h-5 w-5 animate-spin" /> : `פיקדון ${formatILS(deal.depositAmount)}`}
                </Button>
              </>
            )}
          </div>
          <div className="text-center text-[10px] text-muted-foreground inline-flex items-center gap-1 w-full justify-center">
            <Clock className="h-3 w-3" /> נסגר בתאריך {new Date(deal.endsAt).toLocaleDateString("he-IL")}
          </div>
        </div>
      </div>
    </MobileShell>
  );
}
