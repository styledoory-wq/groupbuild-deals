import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus, Briefcase, Pencil, Eye, Heart, Users, TrendingUp,
  Wallet, Calendar, Flame, ChevronDown, SlidersHorizontal, Tag, Coins, Clock,
} from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { ScreenHeader, LoadingState, ErrorState, EmptyState } from "@/components/ds";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentSupplier } from "@/lib/supplierAuth";
import { describeOffer, type OfferTier, type OfferType } from "@/lib/offerPricing";
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
  cover_image_url: string | null;
  created_at: string;
};

type StatusKey = "all" | "active" | "closed";

// ---------- helpers ----------
function extractPriceNum(headline: string): number {
  const m = headline.replace(/,/g, "").match(/[\d.]+/);
  return m ? parseFloat(m[0]) : 0;
}

// sparkline seed from deterministic id hash (visual decoration only)
function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

// generate a smooth sparkline path
function sparkPath(seed: number, w = 64, h = 22): string {
  const pts: number[] = [];
  let v = 0.5;
  for (let i = 0; i < 12; i++) {
    const r = (Math.sin(seed * 0.13 + i * 1.7) + 1) / 2;
    v = v * 0.55 + r * 0.45;
    pts.push(v);
  }
  // trend up bias
  pts.sort((a, b) => a - b - 0.02);
  const step = w / (pts.length - 1);
  return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${(i * step).toFixed(1)} ${(h - p * (h - 2) - 1).toFixed(1)}`).join(" ");
}

const ILS = (n: number) => `₪${Math.round(n).toLocaleString("he-IL")}`;
const compact = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` :
  n >= 1_000 ? `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K` :
  `${n}`;

function daysAgo(iso: string): number {
  const diff = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

// ---------- small UI ----------
function StatCard({
  label, value, subtitle, tone, icon, seed, className = "",
}: {
  label: string; value: string; subtitle: string; tone: "violet" | "amber" | "emerald" | "sky";
  icon: React.ReactNode; seed: number; className?: string;
}) {
  const tones = {
    violet: { bg: "bg-violet-50", fg: "text-violet-600", stroke: "stroke-violet-500" },
    amber:  { bg: "bg-amber-50",  fg: "text-amber-600",  stroke: "stroke-amber-500" },
    emerald:{ bg: "bg-emerald-50",fg: "text-emerald-600",stroke: "stroke-emerald-500" },
    sky:    { bg: "bg-sky-50",    fg: "text-sky-600",    stroke: "stroke-sky-500" },
  }[tone];
  return (
    <div className={`rounded-[14px] bg-white border border-[#EEF0F4] p-2.5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-12px_rgba(16,24,40,0.08)] flex-1 min-w-0 ${className}`}>
      <div className={`h-7 w-7 rounded-full ${tones.bg} ${tones.fg} flex items-center justify-center mb-2`}>
        {icon}
      </div>
      <div className="text-[16px] leading-none font-extrabold text-[#0F172A] tracking-tight">
        {value}
      </div>
      <div className="mt-1 text-[10px] text-[#6B7280] font-medium leading-tight truncate">{label}</div>
      <div className="mt-1 text-[9.5px] font-semibold text-[#6B7280] truncate">
        {subtitle}
      </div>
      <svg viewBox="0 0 64 22" className="mt-1.5 w-full h-4 overflow-visible">
        <path d={sparkPath(seed)} fill="none" strokeWidth="1.6" className={tones.stroke} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function ProgressBar({ pct, tone = "emerald" }: { pct: number; tone?: "emerald" | "amber" }) {
  const color = tone === "amber" ? "from-amber-400 to-amber-500" : "from-emerald-400 to-emerald-600";
  return (
    <div className="h-1.5 w-full rounded-full bg-[#F1F3F7] overflow-hidden">
      <div
        className={`h-full rounded-full bg-gradient-to-l ${color} transition-[width] duration-700 ease-out`}
        style={{ width: `${Math.max(4, Math.min(100, pct))}%` }}
      />
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  if (status === "active")
    return (
      <span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> פעילה
      </span>
    );
  if (status === "closed")
    return (
      <span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-600">
        הסתיימה
      </span>
    );
  if (status === "pending")
    return (
      <span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold px-2 py-1 rounded-full bg-amber-50 text-amber-700">
        ממתינה
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-600">
      {status}
    </span>
  );
}

// ---------- page ----------
export default function SupplierOffers() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [participantsByDeal, setParticipantsByDeal] = useState<Record<string, number>>({});
  const [savesByDeal, setSavesByDeal] = useState<Record<string, number>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusKey>("all");

  const loadDeals = useCallback(async (sid: string) => {
    const { data, error: dErr } = await supabase
      .from("deals")
      .select("id, title, status, original_price, discounted_price, discount_percentage, base_price, offer_type, tiers, cover_image_url, created_at")
      .eq("supplier_id", sid)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });
    if (dErr) throw dErr;
    const rows = ((data ?? []) as unknown) as DealRow[];
    setDeals(rows);

    const ids = rows.map((r) => r.id);
    if (ids.length > 0) {
      const [{ data: interests }, { data: favs }] = await Promise.all([
        supabase
          .from("deal_interests")
          .select("deal_id")
          .in("deal_id", ids)
          .eq("is_deleted", false),
        supabase
          .from("favorites")
          .select("deal_id")
          .in("deal_id", ids),
      ]);
      const counts: Record<string, number> = {};
      (interests ?? []).forEach((row: { deal_id: string }) => {
        counts[row.deal_id] = (counts[row.deal_id] ?? 0) + 1;
      });
      setParticipantsByDeal(counts);
      const saves: Record<string, number> = {};
      (favs ?? []).forEach((row: { deal_id: string }) => {
        saves[row.deal_id] = (saves[row.deal_id] ?? 0) + 1;
      });
      setSavesByDeal(saves);
    } else {
      setParticipantsByDeal({});
      setSavesByDeal({});
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { session, supplier } = await getCurrentSupplier<{ id: string }>("id");
        if (!session) {
          if (!cancelled) { setError("יש להתחבר כספק."); setLoading(false); }
          return;
        }
        const sid = supplier?.id ?? null;
        if (!cancelled) setSupplierId(sid);
        if (!sid) { if (!cancelled) setLoading(false); return; }
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
    if (d.discount_percentage && base > 0) return base * (1 - Number(d.discount_percentage) / 100);
    const tiers = Array.isArray(d.tiers) ? d.tiers : [];
    if (tiers.length > 0) {
      const display = describeOffer({
        offer_type: ((d.offer_type as OfferType | null) ?? "percentage") as OfferType,
        original_price: d.original_price, discounted_price: d.discounted_price,
        discount_percentage: d.discount_percentage, base_price: d.base_price, tiers,
      }, 0);
      return extractPriceNum(display.headline);
    }
    return base;
  };

  // Top stats — real data only
  const totals = useMemo(() => {
    const active = deals.filter((d) => d.status === "active");
    const closed = deals.filter((d) => d.status === "closed");
    const newLeads = deals.reduce((s, d) => s + (participantsByDeal[d.id] ?? 0), 0);
    const totalSaves = deals.reduce((s, d) => s + (savesByDeal[d.id] ?? 0), 0);
    const potential = active.reduce(
      (s, d) => s + unitPriceForDeal(d) * Math.max(0, participantsByDeal[d.id] ?? 0),
      0,
    );
    return {
      activeCount: active.length,
      closedCount: closed.length,
      newLeads,
      totalSaves,
      potential,
    };
  }, [deals, participantsByDeal, savesByDeal]);

  const filtered = useMemo(() => {
    if (filter === "all") return deals;
    return deals.filter((d) => d.status === filter);
  }, [deals, filter]);


  // ---------- render ----------
  return (
    <MobileShell className="bg-[#F7F8FA]">
      <ScreenHeader title="ההצעות שלי" subtitle="נהל ונתח את כל ההצעות הפעילות שלך" />

      {/* CTA */}
      <div className="px-5 -mt-3 relative z-10">
        <Link to="/supplier/offers/new">
          <Button className="h-11 px-4 rounded-[14px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-[0_8px_22px_-10px_rgba(5,150,105,0.6)]">
            <Plus className="h-4 w-4 ml-1.5" /> הצעה חדשה
          </Button>
        </Link>
      </div>

      {/* Stats — real-time aggregates */}
      {!loading && !error && supplierId && deals.length > 0 && (
        <div className="px-5 mt-4 flex gap-2">
          <StatCard
            label="מצטרפים" value={`${totals.newLeads}`}
            subtitle={`ב-${deals.length} הצעות`}
            tone="amber" icon={<Users className="h-3.5 w-3.5" />} seed={27}
          />
          <StatCard
            label="שמירות" value={`${totals.totalSaves}`}
            subtitle="סה״כ עניין"
            tone="violet" icon={<Heart className="h-3.5 w-3.5" />} seed={11}
          />
          <StatCard
            label="הכנסה צפויה" value={ILS(totals.potential)}
            subtitle="לפי מצטרפים בפועל"
            tone="emerald" icon={<Wallet className="h-3.5 w-3.5" />} seed={43}
          />
          <StatCard
            label="פעילות" value={`${totals.activeCount}`}
            subtitle={`${totals.closedCount} הסתיימו`}
            tone="sky" icon={<Briefcase className="h-3.5 w-3.5" />} seed={59}
          />
        </div>
      )}

      {/* Filter row */}
      {!loading && !error && supplierId && deals.length > 0 && (
        <div className="px-5 mt-5 flex items-center gap-2">
          <button className="h-9 px-3 rounded-full bg-white border border-[#EEF0F4] text-[12px] font-bold text-[#1F2937] inline-flex items-center gap-1.5 shadow-sm">
            <SlidersHorizontal className="h-3.5 w-3.5" /> סינון
          </button>
          <div className="ml-auto inline-flex items-center bg-white border border-[#EEF0F4] rounded-full p-1 shadow-sm">
            {([
              { k: "closed", label: "הסתיימו" },
              { k: "active", label: "פעילות" },
              { k: "all",    label: "הכל" },
            ] as { k: StatusKey; label: string }[]).map((t) => (
              <button
                key={t.k}
                onClick={() => setFilter(t.k)}
                className={`h-7 px-3 text-[12px] font-bold rounded-full transition-colors ${
                  filter === t.k ? "bg-emerald-50 text-emerald-700" : "text-[#6B7280]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* List */}
      <div className="px-5 mt-4 space-y-4 pb-8">
        {loading && <LoadingState />}
        {!loading && error && <ErrorState title="שגיאה בטעינה" description={error} onRetry={refresh} />}
        {!loading && !error && !supplierId && (
          <EmptyState icon={<Briefcase className="h-7 w-7 text-[#9CA3AF]" />} title="חסר פרופיל ספק"
            description="השלם את פרטי הספק לפני יצירת הצעות." />
        )}
        {!loading && !error && supplierId && deals.length === 0 && (
          <EmptyState
            icon={<Briefcase className="h-7 w-7 text-[#9CA3AF]" />}
            title="אין הצעות עדיין"
            description="צור את ההצעה הראשונה שלך ותתחיל לקבל לידים."
            action={
              <Link to="/supplier/offers/new">
                <Button className="h-11 px-5 rounded-2xl bg-emerald-600 text-white font-bold">
                  <Plus className="h-4 w-4 ml-2" /> צרו הצעה חדשה
                </Button>
              </Link>
            }
          />
        )}

        {/* Deals — compact by default; expand on tap to full view */}
        {!loading && !error && filtered.map((d, i) => {
          const isExpanded = expandedId === d.id;
          const commonProps = {
            deal: d,
            participants: participantsByDeal[d.id] ?? 0,
            saves: savesByDeal[d.id] ?? 0,
            unitPrice: unitPriceForDeal(d),
            onChanged: refresh,
            onToggle: () => setExpandedId(isExpanded ? null : d.id),
          };
          return isExpanded
            ? <FeaturedDealCard key={d.id} {...commonProps} />
            : <CompactDealCard key={d.id} {...commonProps} featured={i === 0} />;
        })}
      </div>
      <BottomNav role="supplier" />
    </MobileShell>
  );
}

// ---------- Featured (expanded) card ----------
function FeaturedDealCard({
  deal: d, participants, saves, unitPrice, onChanged, onToggle,
}: {
  deal: DealRow; participants: number; saves: number; unitPrice: number;
  onChanged: () => void; onToggle: () => void;
}) {
  const offerType = ((d.offer_type as OfferType | null) ?? "percentage") as OfferType;
  const tiers = Array.isArray(d.tiers) ? d.tiers : [];
  const display = describeOffer({
    offer_type: offerType, original_price: d.original_price, discounted_price: d.discounted_price,
    discount_percentage: d.discount_percentage, base_price: d.base_price, tiers,
  }, 0);
  const goal = Math.max(participants + 1, tiers[0]?.minParticipants ?? 2);
  const pct = Math.min(100, Math.round((participants / goal) * 100));
  const potential = unitPrice * Math.max(0, participants);
  const nextDrop = tiers[1]?.discounted_price ?? null;
  const cover = d.cover_image_url || `https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=70`;
  const ageDays = daysAgo(d.created_at);
  const savingsPerUnit = Math.max(0, (d.original_price ?? 0) - unitPrice);

  return (
    <article className="rounded-[22px] bg-white border border-[#EEF0F4] overflow-hidden shadow-[0_2px_8px_rgba(16,24,40,0.04),0_16px_40px_-18px_rgba(16,24,40,0.12)]">
      <div className="flex gap-3 p-3">
        {/* Image */}
        <div className="relative w-[44%] shrink-0 rounded-[16px] overflow-hidden bg-[#F1F3F7] self-stretch">
          <img src={cover} alt={d.title} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/55 to-transparent" />
          <div className="absolute top-2.5 right-2.5">
            <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-1 rounded-full bg-white/95 backdrop-blur text-orange-600 shadow-sm">
              <Flame className="h-3 w-3 fill-orange-500 text-orange-500" /> הצעה מובילה
            </span>
          </div>
          <div className="absolute bottom-2.5 right-2.5 left-2.5 flex items-center gap-2 bg-black/55 backdrop-blur-sm text-white rounded-full pl-2.5 pr-1 py-1">
            <div className="flex -space-x-1.5 rtl:space-x-reverse">
              {Array.from({ length: Math.min(3, Math.max(0, participants)) }).map((_, i) => (
                <div key={i} className="h-6 w-6 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 border-2 border-white/90" />
              ))}
              {participants > 3 && (
                <div className="h-6 w-6 rounded-full bg-emerald-500 border-2 border-white/90 flex items-center justify-center text-[9px] font-bold">
                  +{participants - 3}
                </div>
              )}
            </div>
            <span className="text-[10.5px] font-semibold pr-1 truncate">{participants} מצטרפים</span>
          </div>
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1 flex flex-col">
          <div className="flex items-center justify-between gap-2">
            <StatusPill status={d.status} />
            <DealActionsMenu dealId={d.id} status={d.status} onChanged={onChanged} />
          </div>

          <h3 className="mt-1.5 text-[15px] font-extrabold text-[#0F172A] leading-snug line-clamp-2">{d.title}</h3>

          <div className="mt-2.5 flex items-start justify-between gap-2">
            <div className="text-right">
              <div className="text-[22px] font-extrabold text-emerald-600 leading-none tracking-tight">
                {display.headline}
              </div>
              <div className="text-[10px] text-[#6B7280] font-medium mt-1">מחיר נוכחי</div>
            </div>
            {d.original_price ? (
              <div className="text-left">
                <div className="text-[12px] text-[#9CA3AF] line-through">
                  ₪{d.original_price.toLocaleString("he-IL")}
                </div>
                <div className="text-[10px] text-[#6B7280] mt-0.5">מחיר רגיל</div>
              </div>
            ) : null}
          </div>

          <div className="mt-3">
            <div className="flex items-center justify-between text-[10.5px] text-[#6B7280] mb-1.5">
              <span className="font-bold text-emerald-700">{pct}%</span>
              <span>{participants} מתוך {goal} מצטרפים</span>
            </div>
            <ProgressBar pct={pct} />
          </div>

          {nextDrop && (
            <div className="mt-2.5 rounded-[10px] bg-emerald-50 border border-emerald-100 px-2.5 py-1.5 text-[10.5px] text-emerald-800 font-semibold flex items-center gap-1.5">
              <TrendingUp className="h-3 w-3 shrink-0" />
              <span className="truncate">עוד מצטרף 1 והמחיר ירד ל-₪{Math.round(Number(nextDrop)).toLocaleString("he-IL")}</span>
            </div>
          )}

          {/* Real metrics: saves, participants, days active */}
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {[
              { icon: <Heart className="h-3 w-3" />, value: compact(saves), label: "שמירות", color: "text-rose-600 bg-rose-50" },
              { icon: <Users className="h-3 w-3" />, value: `${participants}`, label: "מצטרפים", color: "text-emerald-600 bg-emerald-50" },
              { icon: <Clock className="h-3 w-3" />, value: `${ageDays}`, label: "ימי פעילות", color: "text-sky-600 bg-sky-50" },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className={`h-6 w-6 mx-auto rounded-full flex items-center justify-center ${s.color}`}>{s.icon}</div>
                <div className="mt-1 text-[12px] font-extrabold text-[#0F172A] leading-none">{s.value}</div>
                <div className="mt-0.5 text-[9px] text-[#6B7280] font-medium">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="mt-2.5 rounded-[12px] bg-emerald-50/70 border border-emerald-100 p-2 grid grid-cols-2 gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <Coins className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <div className="min-w-0">
                <div className="text-[11.5px] font-extrabold text-emerald-700 leading-none truncate">{ILS(potential)}</div>
                <div className="text-[9px] text-emerald-700/70 mt-0.5">הכנסה ממצטרפים</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <Tag className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <div className="min-w-0">
                <div className="text-[11.5px] font-extrabold text-amber-700 leading-none truncate">
                  {ILS(savingsPerUnit)}
                </div>
                <div className="text-[9px] text-amber-700/70 mt-0.5">חיסכון לדיירים</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 pb-4 pt-1 flex items-center justify-between gap-2">
        <button
          onClick={onToggle}
          className="h-9 px-3 rounded-[10px] text-[11px] font-bold text-[#6B7280] hover:bg-[#F1F3F7] inline-flex items-center gap-1"
        >
          <ChevronDown className="h-3.5 w-3.5 rotate-180" /> סגירה
        </button>
        <div className="flex items-center gap-2">
          <Link
            to={`/supplier/offers/${d.id}/edit`}
            className="h-10 px-3 rounded-[12px] bg-white border border-[#EEF0F4] text-[#1F2937] text-[12px] font-bold inline-flex items-center gap-1.5"
          >
            <Pencil className="h-3.5 w-3.5" /> ניהול הצעה
          </Link>
          <Link
            to={`/deals/${d.id}`}
            className="h-10 px-4 rounded-[12px] bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-bold inline-flex items-center gap-1.5 shadow-[0_8px_18px_-10px_rgba(5,150,105,0.6)]"
          >
            <Eye className="h-3.5 w-3.5" /> צפייה בהצעה
          </Link>
        </div>
      </div>
    </article>
  );
}

// ---------- Compact card (default) ----------
function CompactDealCard({
  deal: d, participants, saves, unitPrice: _unitPrice, onChanged, onToggle, featured = false,
}: {
  deal: DealRow; participants: number; saves: number; unitPrice: number;
  onChanged: () => void; onToggle: () => void; featured?: boolean;
}) {
  const offerType = ((d.offer_type as OfferType | null) ?? "percentage") as OfferType;
  const tiers = Array.isArray(d.tiers) ? d.tiers : [];
  const display = describeOffer({
    offer_type: offerType, original_price: d.original_price, discounted_price: d.discounted_price,
    discount_percentage: d.discount_percentage, base_price: d.base_price, tiers,
  }, 0);
  const goal = Math.max(participants + 1, tiers[0]?.minParticipants ?? 3);
  const pct = Math.min(100, Math.round((participants / goal) * 100));
  const cover = d.cover_image_url || `https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=400&q=70`;
  const highPerf = saves >= 5 || participants >= 3;

  const stop = (e: React.MouseEvent) => { e.stopPropagation(); };

  return (
    <article
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } }}
      className="cursor-pointer rounded-[20px] bg-white border border-[#EEF0F4] p-3 flex gap-3 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_24px_-16px_rgba(16,24,40,0.12)] hover:shadow-[0_12px_32px_-14px_rgba(16,24,40,0.18)] hover:-translate-y-0.5 transition-all duration-300"
    >
      {/* Image */}
      <div className="relative w-[110px] shrink-0 aspect-square rounded-[14px] overflow-hidden bg-[#F1F3F7]">
        <img src={cover} alt={d.title} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute top-1.5 right-1.5">
          <StatusPill status={d.status} />
        </div>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {featured && (
          <span className="mb-1.5 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600">
            <Flame className="h-3 w-3 fill-orange-500 text-orange-500" /> הצעה מובילה
          </span>
        )}
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-[14px] font-bold text-[#0F172A] leading-snug line-clamp-2 flex-1">{d.title}</h4>
          <div onClick={stop}>
            <DealActionsMenu dealId={d.id} status={d.status} onChanged={onChanged} />
          </div>
        </div>

        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="text-[18px] font-extrabold text-emerald-600 leading-none">{display.headline}</span>
          {d.original_price ? (
            <span className="text-[11px] text-[#9CA3AF] line-through">
              ₪{d.original_price.toLocaleString("he-IL")}
            </span>
          ) : null}
        </div>

        <div className="mt-2">
          <div className="flex items-center justify-between text-[10.5px] text-[#6B7280] mb-1">
            <span className="font-bold text-emerald-700">{pct}%</span>
            <span>{participants} מתוך {goal} מצטרפים</span>
          </div>
          <ProgressBar pct={pct} />
        </div>

        <div className="mt-2 flex items-center gap-3 text-[11px] text-[#6B7280]">
          <span className="inline-flex items-center gap-1 text-rose-500"><Heart className="h-3 w-3" /> {compact(saves)}</span>
          <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {participants}</span>
          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {daysAgo(d.created_at)} ימים</span>
          {highPerf ? (
            <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
              <TrendingUp className="h-2.5 w-2.5" /> ביצועים גבוהים
            </span>
          ) : (
            <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold text-[#6B7280]">
              פתיחה מורחבת <ChevronDown className="h-3 w-3" />
            </span>
          )}
        </div>

        <div className="mt-2.5 flex items-center justify-end gap-2" onClick={stop}>
          <Link
            to={`/supplier/offers/${d.id}/edit`}
            className="h-8 px-3 rounded-[10px] bg-white border border-[#EEF0F4] text-[#1F2937] text-[11px] font-bold inline-flex items-center gap-1.5 hover:bg-[#F7F8FA]"
          >
            <Pencil className="h-3 w-3" /> ניהול הצעה
          </Link>
        </div>
      </div>
    </article>
  );
}
