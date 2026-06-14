import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Tag,
  Inbox,
  EyeOff,
  Eye,
  MoreVertical,
  Sparkles,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { ScreenHeader } from "@/components/ds/ScreenHeader";
import { EmptyState } from "@/components/ds/EmptyState";
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
import { MOTION } from "@/lib/designSystem";

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
  auto_closed_at: string | null;
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

const cardStyle: React.CSSProperties = {
  background: "#FFFFFF",
  borderRadius: 20,
  boxShadow: "var(--shadow-card)",
  transition: `transform ${MOTION.base} ${MOTION.ease}, box-shadow ${MOTION.base} ${MOTION.ease}`,
};

export default function MyOffers() {
  const cached = getCachedValue<MyOfferItem[]>(CACHE_KEY, 5 * 60_000);
  const [loading, setLoading] = useState(() => !cached);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<MyOfferItem[]>(() => cached ?? []);
  const [showHidden, setShowHidden] = useState(false);
  const [hiddenLocal, setHiddenLocal] = useState<string[]>(loadHiddenLocal());

  const load = async () => {
    if (!cached) setLoading(true);
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
          .select("id,title,status,auto_closed_at,offer_type,original_price,discounted_price,discount_percentage,base_price,tiers")
          .in("id", dealIds);
        (deals ?? []).forEach((d) => { dealsMap[(d as DealRow).id] = d as DealRow; });
      }

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

      const next: MyOfferItem[] = list.map((interest) => ({
        interest,
        deal: dealsMap[interest.deal_id] ?? null,
        count: counts[interest.deal_id] ?? 0,
        deposit: depMap[interest.deal_id] ?? null,
      }));
      setItems(next);
      setCachedValue(CACHE_KEY, next);
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

  const isArchived = (it: { deal: DealRow | null }) => !it.deal || it.deal.status !== "active" || Boolean(it.deal.auto_closed_at);
  const visibleItems = items.filter((it) => {
    const archived = isArchived(it) || isHidden(it);
    return showHidden ? archived : !archived;
  });
  const hiddenCount = items.filter((it) => isArchived(it) || isHidden(it)).length;

  return (
    <MobileShell>
      <ScreenHeader
        title="ההצעות שלי"
        subtitle="כל ההצעות שהצטרפת אליהן — במקום אחד"
      />

      <div className="px-5 pb-24 space-y-3">
        {/* Toggle hidden / visible */}
        {items.length > 0 && (
          <div className="flex items-center justify-between gap-2 mb-1">
            <div
              className="inline-flex p-1 rounded-2xl bg-white"
              style={{ boxShadow: "var(--shadow-soft)" }}
            >
              <button
                onClick={() => setShowHidden(false)}
                className={`px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all ${
                  !showHidden
                    ? "bg-[#0A1F3D] text-white"
                    : "text-[#6B7280]"
                }`}
              >
                פעילות
              </button>
              <button
                onClick={() => setShowHidden(true)}
                className={`px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all ${
                  showHidden
                    ? "bg-[#0A1F3D] text-white"
                    : "text-[#6B7280]"
                }`}
              >
                ארכיון {hiddenCount > 0 && <span className="opacity-70">({hiddenCount})</span>}
              </button>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#6B7280]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
              עדכון בזמן אמת
            </span>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 space-y-3 animate-pulse" style={cardStyle}>
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-[#F4F6FA]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 bg-[#F4F6FA] rounded" />
                    <div className="h-3 w-1/2 bg-[#F4F6FA] rounded" />
                  </div>
                </div>
                <div className="h-6 w-1/3 bg-[#F4F6FA] rounded" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-6 text-center" style={cardStyle}>
            <p className="text-sm text-[#DC2626] font-bold">{error}</p>
          </div>
        ) : visibleItems.length === 0 ? (
          <EmptyState
            icon={<Inbox className="h-7 w-7 text-[#9CA3AF]" strokeWidth={2} />}
            title={showHidden ? "הארכיון ריק" : "עדיין לא הצטרפת להצעות"}
            description={
              showHidden
                ? "עסקאות שנסגרו או הוסתרו יופיעו כאן."
                : "כל מצטרף משפר את ההנחה לכולם — בואו תתחילו."
            }
            action={
              !showHidden ? (
                <Link
                  to="/resident/deals"
                  className="inline-flex items-center gap-1.5 h-11 px-5 rounded-2xl bg-[#0A1F3D] text-white text-[14px] font-bold active:scale-95 transition-transform"
                  style={{ boxShadow: "var(--shadow-soft)" }}
                >
                  <Sparkles className="h-4 w-4" strokeWidth={2.4} />
                  לעסקאות חיות
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-3">
            {visibleItems.map(({ interest, deal, count, deposit }) => {
              const hidden = (deposit?.is_hidden ?? false) || hiddenLocal.includes(interest.id);
              if (!deal) {
                return (
                  <div key={interest.id} className="p-4 opacity-70 flex items-center justify-between" style={cardStyle}>
                    <p className="text-sm text-[#6B7280]">הצעה זו אינה זמינה יותר</p>
                    <button
                      onClick={() => toggleHide({ interest, deposit }, !hidden)}
                      className="h-8 px-3 rounded-xl text-[11px] font-bold bg-[#E8ECF0] text-[#0A1F3D]"
                    >
                      {hidden ? "החזרה" : "הסתרה"}
                    </button>
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
              const dealClosed = deal.status === "closed" || Boolean(deal.auto_closed_at);
              const dealActive = deal.status === "active" && !dealClosed;

              return (
                <div
                  key={interest.id}
                  className="p-4 relative overflow-hidden active:scale-[1.01]"
                  style={cardStyle}
                >
                  {dealActive && (
                    <span className="absolute top-3 left-3 inline-flex items-center gap-1 text-[10px] font-extrabold text-[#10B981]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-pulse" /> LIVE
                    </span>
                  )}

                  <div className="flex items-start gap-3 mb-3">
                    <div className="h-11 w-11 rounded-2xl bg-[#F4F6FA] flex items-center justify-center shrink-0">
                      <Tag className="h-5 w-5 text-[#0A1F3D]" strokeWidth={2.2} />
                    </div>
                    <Link to={`/resident/deals/${deal.id}`} className="flex-1 min-w-0">
                      <h3 className="font-bold text-[14px] text-[#0A1F3D] truncate flex items-center gap-1.5">
                        {deal.title}
                        <ShieldCheck className="h-3.5 w-3.5 text-[#D4AF37] shrink-0" />
                      </h3>
                      <p className="text-[11px] text-[#6B7280] mt-0.5 inline-flex items-center gap-1 font-medium">
                        <span>{count} מצטרפים</span>
                        <span>·</span>
                        <span className={dealActive ? "text-[#10B981] font-bold" : ""}>
                          {dealClosed ? "נסגרה" : dealActive ? "פעילה" : deal.status}
                        </span>
                      </p>
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="h-8 w-8 rounded-full hover:bg-[#F4F6FA] flex items-center justify-center" aria-label="פעולות">
                          <MoreVertical className="h-4 w-4 text-[#6B7280]" />
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
                    <div className="pt-3 border-t border-[#E8ECF0] flex items-end justify-between gap-2">
                      <div>
                        <div className="text-[10px] font-bold text-[#6B7280] mb-0.5 uppercase tracking-wide">המחיר הנוכחי שלך</div>
                        <div className="text-[20px] font-extrabold text-[#0A1F3D] leading-none tracking-tight">{display.headline}</div>
                        {display.savings && (
                          <div className="text-[11px] font-bold text-[#10B981] mt-1">{display.savings}</div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        {paid && (
                          <span className="text-[10px] font-extrabold inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#10B981]/10 text-[#047857]">
                            <CheckCircle2 className="h-3 w-3" />
                            פיקדון אושר
                          </span>
                        )}
                        {pending && (
                          <span className="text-[10px] font-extrabold inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#EAF2FF] text-[#1E40AF]">
                            <Clock className="h-3 w-3" />
                            ממתין לאישור
                          </span>
                        )}
                        {refunded && (
                          <span className="text-[10px] font-extrabold inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#F4F6FA] text-[#6B7280]">
                            הוחזר
                          </span>
                        )}
                        {interest.deposit_required && interest.deposit_amount > 0 && (
                          <span className="text-[10px] font-extrabold inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#E8ECF0] text-[#0A1F3D]">
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
