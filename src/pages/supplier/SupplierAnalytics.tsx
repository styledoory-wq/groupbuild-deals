import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, TrendingUp, TrendingDown, Eye, Phone, MessageCircle, Navigation, Share2, Rocket, Globe, Search as SearchIcon } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip as ReTooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { LoadingState, ErrorState } from "@/components/ds";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentSupplier } from "@/lib/supplierAuth";
import { getFriendlyLoadError } from "@/lib/safeAsync";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const BG = "#F7F8FA";
const INK = "#0F172A";
const MUTED = "#8E95A2";
const GREEN = "#0E6B5A";

type RangeKey = "7d" | "30d" | "90d";

type SummaryRow = { event_type: string; current_count: number; previous_count: number };
type TimeseriesRow = { day: string; views: number; calls: number; whatsapp: number };
type SourceRow = { source: string; count: number };
type TermRow = { query: string; count: number };

const RANGES: { key: RangeKey; label: string; days: number }[] = [
  { key: "7d", label: "7 ימים", days: 7 },
  { key: "30d", label: "30 ימים", days: 30 },
  { key: "90d", label: "90 ימים", days: 90 },
];

const SOURCE_LABELS: Record<string, string> = {
  internal_search: "חיפוש ב־GroupBuild",
  google: "Google",
  direct: "כניסה ישירה",
  share: "שיתוף",
  category: "עמוד קטגוריה",
  city_category: "עיר + קטגוריה",
  internal: "ניווט פנימי",
  referral: "אתרים אחרים",
};

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit" });
}

function KpiCard({
  icon: Icon,
  label,
  value,
  delta,
}: {
  icon: typeof Eye;
  label: string;
  value: number;
  delta: number | null;
}) {
  const up = delta != null && delta > 0;
  const down = delta != null && delta < 0;
  return (
    <div className="bg-white rounded-2xl border border-[#EEF0F3] p-4 flex flex-col gap-2 min-w-[140px]">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-xl bg-[#F4F6F9] flex items-center justify-center">
          <Icon className="h-4 w-4 text-[#0F172A]" strokeWidth={2} />
        </div>
        <div className="text-[11px] text-[#8E95A2] font-medium truncate">{label}</div>
      </div>
      <div className="text-[22px] font-extrabold text-[#0F172A] leading-none tracking-tight">
        {value.toLocaleString("he-IL")}
      </div>
      {delta == null ? (
        <div className="text-[11px] text-[#B0B6C1]">אין נתוני השוואה</div>
      ) : (
        <div
          className={cn(
            "text-[11px] font-semibold flex items-center gap-1",
            up && "text-[#0E6B5A]",
            down && "text-[#DC2626]",
            !up && !down && "text-[#8E95A2]",
          )}
        >
          {up && <TrendingUp className="h-3 w-3" />}
          {down && <TrendingDown className="h-3 w-3" />}
          {delta > 0 ? "+" : ""}
          {delta}% מול תקופה קודמת
        </div>
      )}
    </div>
  );
}

export default function SupplierAnalytics() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [range, setRange] = useState<RangeKey>(RANGES[1].key);
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [series, setSeries] = useState<TimeseriesRow[]>([]);
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [terms, setTerms] = useState<TermRow[]>([]);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { supplier } = await getCurrentSupplier();
        if (!supplier) {
          setErr("לא נמצא פרופיל ספק פעיל.");
          setLoading(false);
          return;
        }
        setSupplierId(supplier.id);
      } catch (e) {
        setErr(getFriendlyLoadError(e));
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!supplierId) return;
    const days = RANGES.find((r) => r.key === range)!.days;
    const to = new Date();
    const from = new Date(to.getTime() - days * 86400_000);
    setLoading(true);
    setErr(null);
    (async () => {
      try {
        const [sum, ts, src, tr] = await Promise.all([
          supabase.rpc("supplier_analytics_summary", {
            _supplier_id: supplierId,
            _from: from.toISOString(),
            _to: to.toISOString(),
          }),
          supabase.rpc("supplier_analytics_timeseries", {
            _supplier_id: supplierId,
            _from: from.toISOString(),
            _to: to.toISOString(),
          }),
          supabase.rpc("supplier_analytics_sources", {
            _supplier_id: supplierId,
            _from: from.toISOString(),
            _to: to.toISOString(),
          }),
          supabase.rpc("supplier_analytics_search_terms", {
            _supplier_id: supplierId,
            _from: from.toISOString(),
            _to: to.toISOString(),
            _limit: 10,
          }),
        ]);
        if (sum.error) throw sum.error;
        if (ts.error) throw ts.error;
        if (src.error) throw src.error;
        if (tr.error) throw tr.error;
        setSummary((sum.data ?? []) as SummaryRow[]);
        setSeries((ts.data ?? []) as TimeseriesRow[]);
        setSources((src.data ?? []) as SourceRow[]);
        setTerms((tr.data ?? []) as TermRow[]);
        setUpdatedAt(new Date());
      } catch (e) {
        setErr(getFriendlyLoadError(e));
        toast.error("שגיאה בטעינת האנליטיקס");
      } finally {
        setLoading(false);
      }
    })();
  }, [supplierId, range]);

  const map = useMemo(() => {
    const m: Record<string, SummaryRow> = {};
    summary.forEach((r) => (m[r.event_type] = r));
    return m;
  }, [summary]);

  const get = (t: string) => Number(map[t]?.current_count ?? 0);
  const getPrev = (t: string) => Number(map[t]?.previous_count ?? 0);

  const views = get("view");
  const calls = get("call") + get("reveal_phone");
  const wa = get("whatsapp");
  const nav = get("navigate");
  const shares = get("share");
  const opens = get("open_project");
  const website = get("website");

  const totalEvents = summary.reduce((s, r) => s + Number(r.current_count), 0);

  // Funnel
  const contacts = calls + wa;
  const contactRate = views > 0 ? Math.round((contacts / views) * 100) : 0;
  const openRate = views > 0 ? Math.round((opens / views) * 100) : 0;
  const phoneCtr = views > 0 ? Math.round((calls / views) * 100) : 0;
  const waCtr = views > 0 ? Math.round((wa / views) * 100) : 0;

  // Insights (2-3 short)
  const insights: string[] = [];
  if (contacts > 0) {
    if (wa > calls) insights.push("רוב הפניות מגיעות דרך WhatsApp — כדאי להבליט את הכפתור.");
    else if (calls > wa) insights.push("רוב הפניות מגיעות דרך שיחת טלפון.");
  }
  if (views > 20 && contactRate < 5) insights.push("יש הרבה צפיות אבל מעט פניות — כדאי לשפר את התיאור והגלריה.");
  if (sources[0]) {
    const label = SOURCE_LABELS[sources[0].source] ?? sources[0].source;
    insights.push(`רוב התנועה מגיעה מ־${label}.`);
  }
  const viewsDelta = pctChange(views, getPrev("view"));
  if (viewsDelta != null && viewsDelta >= 25) insights.push(`הצפיות בפרופיל עלו ב־${viewsDelta}% מול התקופה הקודמת.`);

  const emptyActions = [
    { label: "הוסף תמונות לגלריה", to: "/supplier/profile/edit" },
    { label: "השלם תיאור עסקי", to: "/supplier/profile/edit" },
    { label: "הוסף אזורי שירות", to: "/supplier/profile/edit" },
    { label: "צור מבצע חדש", to: "/supplier/offers" },
  ];

  return (
    <MobileShell>
      <div className="min-h-screen pb-8" style={{ background: BG }} dir="rtl">
        {/* Header */}
        <header className="px-5 pt-6 pb-4">
          <button
            onClick={() => navigate("/supplier")}
            className="flex items-center gap-1 text-[13px] text-[#8E95A2] mb-3"
          >
            <ChevronLeft className="h-4 w-4" /> חזרה
          </button>
          <h1 className="text-[22px] font-bold text-[#0F172A] tracking-tight">אנליטיקס</h1>
          <p className="text-[13px] text-[#8E95A2] mt-1">
            הביצועים שלך ב־GroupBuild
            {updatedAt && (
              <span className="mr-1">
                · עודכן {updatedAt.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </p>
        </header>

        {/* Range picker */}
        <div className="px-5">
          <div className="inline-flex bg-white border border-[#EEF0F3] rounded-2xl p-1">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={cn(
                  "px-3 py-1.5 text-[12px] font-semibold rounded-xl transition",
                  range === r.key ? "bg-[#0F172A] text-white" : "text-[#0F172A]",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {err && (
          <div className="px-5 mt-4">
            <ErrorState title="שגיאה" message={err} />
          </div>
        )}

        {loading && !err ? (
          <div className="px-5 mt-8">
            <LoadingState />
          </div>
        ) : !err && totalEvents === 0 ? (
          <section className="px-5 mt-6">
            <div className="bg-white rounded-3xl border border-[#EEF0F3] p-6 text-center">
              <div className="text-[16px] font-bold text-[#0F172A]">אין עדיין מספיק נתונים</div>
              <p className="text-[13px] text-[#8E95A2] mt-2">
                ברגע שגולשים יצפו בפרופיל שלך תראה כאן צפיות, פניות ומקורות תנועה.
              </p>
              <div className="mt-4 space-y-2">
                {emptyActions.map((a) => (
                  <button
                    key={a.label}
                    onClick={() => navigate(a.to)}
                    className="w-full h-11 rounded-xl bg-[#F4F6F9] text-[13px] font-semibold text-[#0F172A] active:scale-[0.99]"
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          </section>
        ) : !err ? (
          <>
            {/* KPI row */}
            <section className="mt-4">
              <div className="flex gap-3 overflow-x-auto px-5 pb-2 scrollbar-none lg:grid lg:grid-cols-4 lg:gap-3">
                <KpiCard icon={Eye} label="צפיות בפרופיל" value={views} delta={pctChange(views, getPrev("view"))} />
                <KpiCard icon={Phone} label="שיחות" value={calls} delta={pctChange(calls, getPrev("call") + getPrev("reveal_phone"))} />
                <KpiCard icon={MessageCircle} label="WhatsApp" value={wa} delta={pctChange(wa, getPrev("whatsapp"))} />
                <KpiCard icon={Navigation} label="ניווט" value={nav} delta={pctChange(nav, getPrev("navigate"))} />
                <KpiCard icon={Globe} label="אתר" value={website} delta={pctChange(website, getPrev("website"))} />
                <KpiCard icon={Share2} label="שיתופים" value={shares} delta={pctChange(shares, getPrev("share"))} />
                <KpiCard icon={Rocket} label="פתיחת פרויקט" value={opens} delta={pctChange(opens, getPrev("open_project"))} />
              </div>
            </section>

            {/* Funnel */}
            <section className="px-5 mt-4">
              <div className="bg-white rounded-3xl border border-[#EEF0F3] p-5">
                <div className="text-[13px] font-bold text-[#0F172A]">משפך המרה</div>
                <div className="mt-4 space-y-3">
                  <FunnelBar label="צפייה בפרופיל" value={views} max={views} tone="ink" hint="100%" />
                  <FunnelBar label="יצירת קשר" value={contacts} max={views} tone="green" hint={`${contactRate}%`} />
                  <FunnelBar label="פתיחת פרויקט" value={opens} max={views} tone="amber" hint={`${openRate}%`} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-center">
                  <div className="rounded-xl bg-[#F4F6F9] py-2">
                    <div className="text-[16px] font-extrabold text-[#0F172A]">{phoneCtr}%</div>
                    <div className="text-[10px] text-[#8E95A2]">CTR טלפון</div>
                  </div>
                  <div className="rounded-xl bg-[#F4F6F9] py-2">
                    <div className="text-[16px] font-extrabold text-[#0F172A]">{waCtr}%</div>
                    <div className="text-[10px] text-[#8E95A2]">CTR WhatsApp</div>
                  </div>
                </div>
              </div>
            </section>

            {/* Insights */}
            {insights.length > 0 && (
              <section className="px-5 mt-4">
                <div className="bg-white rounded-3xl border border-[#EEF0F3] p-5">
                  <div className="text-[13px] font-bold text-[#0F172A] mb-2">תובנות אוטומטיות</div>
                  <ul className="space-y-2">
                    {insights.slice(0, 3).map((t, i) => (
                      <li key={i} className="text-[13px] text-[#0F172A] leading-relaxed flex gap-2">
                        <span className="text-[#0E6B5A]">•</span>
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}

            {/* Chart: views */}
            <section className="px-5 mt-4">
              <div className="bg-white rounded-3xl border border-[#EEF0F3] p-4">
                <div className="text-[13px] font-bold text-[#0F172A] mb-2">מגמת צפיות</div>
                <div className="h-[180px] w-full">
                  <ResponsiveContainer>
                    <LineChart data={series.map((r) => ({ ...r, day: fmtDate(r.day) }))}>
                      <CartesianGrid stroke="#F1F3F6" vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 10, fill: MUTED }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: MUTED }} axisLine={false} tickLine={false} width={24} />
                      <ReTooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: "1px solid #EEF0F3" }} />
                      <Line type="monotone" dataKey="views" stroke={INK} strokeWidth={2} dot={false} name="צפיות" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            {/* Chart: calls + whatsapp */}
            <section className="px-5 mt-4">
              <div className="bg-white rounded-3xl border border-[#EEF0F3] p-4">
                <div className="text-[13px] font-bold text-[#0F172A] mb-2">שיחות ו־WhatsApp</div>
                <div className="h-[180px] w-full">
                  <ResponsiveContainer>
                    <LineChart data={series.map((r) => ({ ...r, day: fmtDate(r.day) }))}>
                      <CartesianGrid stroke="#F1F3F6" vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 10, fill: MUTED }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: MUTED }} axisLine={false} tickLine={false} width={24} />
                      <ReTooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: "1px solid #EEF0F3" }} />
                      <Line type="monotone" dataKey="calls" stroke={GREEN} strokeWidth={2} dot={false} name="שיחות" />
                      <Line type="monotone" dataKey="whatsapp" stroke="#25D366" strokeWidth={2} dot={false} name="WhatsApp" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            {/* Sources */}
            <section className="px-5 mt-4">
              <div className="bg-white rounded-3xl border border-[#EEF0F3] p-5">
                <div className="text-[13px] font-bold text-[#0F172A] mb-3">מקורות תנועה</div>
                {sources.length === 0 ? (
                  <div className="text-[12px] text-[#8E95A2]">אין נתונים עדיין</div>
                ) : (
                  <div className="space-y-2">
                    {sources.map((s) => {
                      const total = sources.reduce((a, b) => a + Number(b.count), 0);
                      const pct = total > 0 ? Math.round((Number(s.count) / total) * 100) : 0;
                      return (
                        <div key={s.source}>
                          <div className="flex justify-between text-[12px] text-[#0F172A]">
                            <span>{SOURCE_LABELS[s.source] ?? s.source}</span>
                            <span className="text-[#8E95A2]">{s.count} · {pct}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-[#F1F3F6] mt-1 overflow-hidden">
                            <div className="h-full bg-[#0F172A]" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            {/* Search terms */}
            <section className="px-5 mt-4">
              <div className="bg-white rounded-3xl border border-[#EEF0F3] p-5">
                <div className="flex items-center gap-2 mb-3">
                  <SearchIcon className="h-4 w-4 text-[#0F172A]" />
                  <div className="text-[13px] font-bold text-[#0F172A]">מילים שהובילו לפרופיל</div>
                </div>
                {terms.length === 0 ? (
                  <div className="text-[12px] text-[#8E95A2]">אין נתונים עדיין</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {terms.map((t) => (
                      <div
                        key={t.query}
                        className="px-3 py-1.5 rounded-full bg-[#F4F6F9] text-[12px] text-[#0F172A] font-medium"
                      >
                        {t.query} <span className="text-[#8E95A2]">· {t.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </>
        ) : null}
      </div>
      <BottomNav role="supplier" />
    </MobileShell>
  );
}

function FunnelBar({
  label,
  value,
  max,
  tone,
  hint,
}: {
  label: string;
  value: number;
  max: number;
  tone: "ink" | "green" | "amber";
  hint: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const bg = tone === "ink" ? "#0F172A" : tone === "green" ? "#0E6B5A" : "#D97706";
  return (
    <div>
      <div className="flex justify-between text-[12px] text-[#0F172A]">
        <span className="font-semibold">{label}</span>
        <span className="text-[#8E95A2]">{value.toLocaleString("he-IL")} · {hint}</span>
      </div>
      <div className="h-2 rounded-full bg-[#F1F3F6] mt-1 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.max(pct, 2)}%`, background: bg }} />
      </div>
    </div>
  );
}
