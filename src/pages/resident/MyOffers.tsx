import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Tag,
  Inbox,
  BadgeCheck,
  EyeOff,
  Eye,
  MoreVertical,
  Sparkles,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { describeOffer, ils, type OfferTier, type OfferType } from "@/lib/offerPricing";
import { toast } from "sonner";
import { getCachedValue, setCachedValue } from "@/lib/clientCache";

type InterestRow = {
  id: string;
  deal_id: string;
  status: string;
  deposit_required: boolean;
  deposit_amount: number;
  deposit_status: string;
  created_at: string;
};

type DepositRow = {
  id: string;
  deal_id: string;
  status: string;
  amount: number;
  is_hidden: boolean;
};

type DealRow = {
  id: string;
  title: string;
  status: string;
  offer_type: string | null;
  original_price: number | null;
  discounted_price: number | null;
  discount_percentage: number | null;
  base_price: number | null;
  tiers: OfferTier[] | null;
};

const HIDDEN_KEY = "gb:hiddenInterests";
const loadHiddenLocal = (): string[] => {
  try { return JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? "[]"); } catch { return []; }
};
const saveHiddenLocal = (ids: string[]) => {
  try { localStorage.setItem(HIDDEN_KEY, JSON.stringify(ids)); } catch { /* ignore */ }
};

type MyOfferItem = {
  interest: InterestRow;
  deal: DealRow | null;
  count: number;
  deposit: DepositRow | null;
};

const CACHE_KEY = "my-offers:items";

export default function MyOffers() {
  const cached = getCachedValue<MyOfferItem[]>(CACHE_KEY, 60_000);
  const [loading, setLoading] = useState(() => !cached);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<MyOfferItem[]>(() => cached ?? []);
  const [showHidden, setShowHidden] = useState(false);
  const [hiddenLocal, setHiddenLocal] = useState<string[]>(loadHiddenLocal());

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        setError("יש להתחבר כדי לראות את ההצעות שלך.");
        setLoading(false);
        return;
      }
      const uid = session.session.user.id;

      const [{ data: ints, error: iErr }, { data: deps }] = await Promise.all([
        supabase
          .from("deal_interests")
          .select("id,deal_id,status,deposit_required,deposit_amount,deposit_status,created_at")
          .eq("user_id", uid)
          .order("created_at", { ascending: false }),
        supabase
          .from("deposits")
          .select("id,deal_id,status,amount,is_hidden")
          .eq("user_id", uid),
      ]);
      if (iErr) throw iErr;

      const list = (ints ?? []) as InterestRow[];
      const depMap: Record<string, DepositRow> = {};
      (deps ?? []).forEach((d) => { depMap[(d as DepositRow).deal_id] = d as DepositRow; });

      const dealIds = Array.from(new Set(list.map((i) => i.deal_id)));
      const dealsMap: Record<string, DealRow> = {};
      if (dealIds.length) {
        const { data: deals } = await supabase
          .from("deals")
          .select("id,title,status,offer_type,original_price,discounted_price,discount_percentage,base_price,tiers")
          .in("id", dealIds);
        (deals ?? []).forEach((d) => { dealsMap[(d as DealRow).id] = d as DealRow; });
      }

      // Batch paid-count fetch (was N+1 RPC calls before)
      const counts: Record<string, number> = {};
      if (dealIds.length) {
        const { data: paidRows } = await supabase
          .from("deposits")
          .select("deal_id,user_id")
          .in("deal_id", dealIds)
          .eq("status", "paid")
          .eq("is_deleted", false);
        const seen: Record<string, Set<string>> = {};
        (paidRows ?? []).forEach((r: { deal_id: string; user_id: string }) => {
          if (!seen[r.deal_id]) seen[r.deal_id] = new Set();
          seen[r.deal_id].add(r.user_id);
        });
        dealIds.forEach((id) => { counts[id] = seen[id]?.size ?? 0; });
      }

      setItems(
        list.map((interest) => ({
          interest,
          deal: dealsMap[interest.deal_id] ?? null,
          count: counts[interest.deal_id] ?? 0,
          deposit: depMap[interest.deal_id] ?? null,
        })),
      );
    } catch (e) {
      console.error("[MyOffers] load error", e);
      setError(e instanceof Error ? e.message : "שגיאה בטעינה");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const isHidden = (it: { interest: InterestRow; deposit: DepositRow | null }) =>
    (it.deposit?.is_hidden ?? false) || hiddenLocal.includes(it.interest.id);

  const toggleHide = async (it: { interest: InterestRow; deposit: DepositRow | null }, hide: boolean) => {
    if (it.deposit) {
      const { error } = await supabase
        .from("deposits")
        .update({ is_hidden: hide })
        .eq("id", it.deposit.id);
      if (error) {
        toast.error("הפעולה נכשלה");
        return;
      }
      setItems((prev) => prev.map((x) =>
        x.interest.id === it.interest.id && x.deposit
          ? { ...x, deposit: { ...x.deposit, is_hidden: hide } }
          : x
      ));
    } else {
      const next = hide
        ? [...hiddenLocal, it.interest.id]
        : hiddenLocal.filter((id) => id !== it.interest.id);
      setHiddenLocal(next);
      saveHiddenLocal(next);
    }
    toast.success(hide ? "הוסתר מהארכיון שלך" : "הוחזר לתצוגה");
  };

  // Hide unavailable deals (deal missing or not active) from default view; admins/archive can still see hidden manually-archived ones
  const isUnavailable = (it: { deal: DealRow | null }) => !it.deal || it.deal.status !== "active";
  const visibleItems = items.filter((it) => {
    if (isUnavailable(it)) return false;
    return showHidden ? isHidden(it) : !isHidden(it);
  });
  const hiddenCount = items.filter((it) => !isUnavailable(it) && isHidden(it)).length;

  return (
    <MobileShell>
      <PageHeader
        title="ההצעות שלי"
        subtitle="כל ההצעות שהצטרפת אליהן — במקום אחד"
        back={false}
      />

      <div className="px-5 -mt-4 relative z-10 pb-24 space-y-3">
        {/* Toggle hidden / visible */}
        {items.length > 0 && (
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex rounded-2xl bg-card border border-border p-1 shadow-sm">
              <button
                onClick={() => setShowHidden(false)}
                className={`px-3 py-1.5 rounded-xl text-[12px] font-bold transition-smooth ${
                  !showHidden ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                פעילות
              </button>
              <button
                onClick={() => setShowHidden(true)}
                className={`px-3 py-1.5 rounded-xl text-[12px] font-bold transition-smooth ${
                  showHidden ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                ארכיון {hiddenCount > 0 && <span className="opacity-70">({hiddenCount})</span>}
              </button>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
              <span className="gb-live-dot" />
              עדכון בזמן אמת
            </span>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="gb-card-premium p-4 space-y-3 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 bg-muted rounded" />
                    <div className="h-3 w-1/2 bg-muted rounded" />
                  </div>
                </div>
                <div className="h-6 w-1/3 bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="gb-card p-6 text-center">
            <p className="text-sm text-destructive font-bold">{error}</p>
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="gb-card-premium p-8 flex flex-col items-center text-center">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/30 flex items-center justify-center mb-3">
              <Inbox className="h-7 w-7 text-gold" />
            </div>
            <h3 className="font-bold text-base mb-1">
              {showHidden ? "הארכיון ריק" : "עדיין לא הצטרפת להצעות"}
            </h3>
            <p className="text-xs text-muted-foreground mb-4 max-w-xs">
              {showHidden
                ? "כשתסתיר פיקדונות, הם יופיעו כאן."
                : "כל מצטרף משפר את ההנחה לכולם — בואו תתחילו."}
            </p>
            {!showHidden && (
              <Link to="/resident/deals">
                <Button className="rounded-xl bg-gradient-gold text-primary font-bold shadow-gold">
                  <Sparkles className="h-4 w-4 ml-1.5" />
                  לעסקאות חיות
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {visibleItems.map(({ interest, deal, count, deposit }) => {
              const hidden = (deposit?.is_hidden ?? false) || hiddenLocal.includes(interest.id);
              if (!deal) {
                return (
                  <div key={interest.id} className="gb-card p-4 opacity-70 flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">הצעה זו אינה זמינה יותר</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleHide({ interest, deposit }, !hidden)}
                      className="h-8 rounded-xl text-[11px]"
                    >
                      {hidden ? "החזרה" : "הסתרה"}
                    </Button>
                  </div>
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
                count,
              );
              const paid = deposit?.status === "paid" || interest.deposit_status === "paid";
              const pending = deposit?.status === "pending" || interest.deposit_status === "pending";
              const refunded = deposit?.status === "refunded";
              const dealActive = deal.status === "active";

              return (
                <div key={interest.id} className="gb-card-premium p-4 relative overflow-hidden">
                  {/* live indicator */}
                  {dealActive && (
                    <span className="absolute top-3 left-3 inline-flex items-center gap-1 text-[10px] font-bold text-success">
                      <span className="gb-live-dot" /> LIVE
                    </span>
                  )}

                  <div className="flex items-start gap-3 mb-3">
                    <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-gold/25 via-gold/10 to-transparent border border-gold/30 flex items-center justify-center shrink-0">
                      <Tag className="h-5 w-5 text-gold" />
                    </div>
                    <Link to={`/resident/deals/${deal.id}`} className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm text-foreground truncate flex items-center gap-1.5">
                        {deal.title}
                        <ShieldCheck className="h-3.5 w-3.5 text-gold shrink-0" />
                      </h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5 inline-flex items-center gap-1">
                        <span>{count} מצטרפים</span>
                        <span>·</span>
                        <span className={dealActive ? "text-success font-bold" : ""}>
                          {dealActive ? "פעילה" : deal.status}
                        </span>
                      </p>
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="h-8 w-8 rounded-full hover:bg-muted flex items-center justify-center" aria-label="פעולות">
                          <MoreVertical className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => toggleHide({ interest, deposit }, !hidden)}>
                          {hidden ? (
                            <><Eye className="h-4 w-4 ml-2" /> החזרה לתצוגה</>
                          ) : (
                            <><EyeOff className="h-4 w-4 ml-2" /> הסתרה / העברה לארכיון</>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <Link to={`/resident/deals/${deal.id}`} className="block">
                    <div className="pt-3 border-t border-border/60 flex items-end justify-between gap-2">
                      <div>
                        <div className="text-[10px] font-bold text-muted-foreground mb-0.5">המחיר הנוכחי שלך</div>
                        <div className="text-[20px] font-extrabold text-primary leading-none">{display.headline}</div>
                        {display.savings && (
                          <div className="text-[11px] font-bold text-success mt-1">{display.savings}</div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        {paid && (
                          <span className="text-[10px] font-bold inline-flex items-center gap-1 px-2 py-1 rounded-full bg-success/10 text-success border border-success/30">
                            <CheckCircle2 className="h-3 w-3" />
                            פיקדון אושר
                          </span>
                        )}
                        {pending && (
                          <span className="text-[10px] font-bold inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gold/15 text-primary border border-gold/40">
                            <Clock className="h-3 w-3" />
                            ממתין לאישור
                          </span>
                        )}
                        {refunded && (
                          <span className="text-[10px] font-bold inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-muted-foreground border border-border">
                            הוחזר
                          </span>
                        )}
                        {interest.deposit_required && interest.deposit_amount > 0 && (
                          <span className="text-[10px] font-bold inline-flex items-center gap-1 px-2 py-1 rounded-full bg-card text-primary border border-gold/30">
                            <BadgeCheck className="h-3 w-3" />
                            {ils(Number(interest.deposit_amount))}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav role="resident" />
    </MobileShell>
  );
}
