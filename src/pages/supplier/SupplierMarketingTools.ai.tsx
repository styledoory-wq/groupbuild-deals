import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Download, Copy, Share2, Mail, RefreshCw, Sparkles, Check, Image as ImageIcon, ChevronRight } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BackHeader, LoadingState } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type TemplateKey = "premium-dark" | "whatsapp-viral" | "luxury-minimal" | "modern-green";
type FormatKey = "square" | "story" | "banner";

const TEMPLATES: { key: TemplateKey; label: string; description: string; accent: string }[] = [
  { key: "premium-dark", label: "Premium Dark", description: "כהה • זהב • יוקרתי", accent: "from-zinc-900 to-amber-700" },
  { key: "whatsapp-viral", label: "WhatsApp Viral", description: "צבעוני • דחיפות • מותאם וואטסאפ", accent: "from-emerald-500 to-green-700" },
  { key: "luxury-minimal", label: "Luxury Minimal", description: "מינימליסטי • עדין • אופנתי", accent: "from-stone-200 to-stone-400" },
  { key: "modern-green", label: "Modern Green", description: "מאוזן • נקי • Brand", accent: "from-emerald-600 to-teal-500" },
];

const FORMAT_LABELS: Record<FormatKey, string> = {
  square: "פוסט 1080×1080",
  story: "סטורי 1080×1920",
  banner: "באנר 1200×628",
};
const FORMAT_RATIO: Record<FormatKey, string> = {
  square: "aspect-square",
  story: "aspect-[9/16]",
  banner: "aspect-[1200/628]",
};

type CardSet = Partial<Record<TemplateKey, Partial<Record<FormatKey, string>>>>;

const STAGES = [
  "AI כותב כותרת שיווקית…",
  "AI משפר את התמונה…",
  "מייצר 4 וריאציות עיצוב…",
];

export default function SupplierMarketingTools() {
  const { dealId } = useParams<{ dealId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState(0);
  const [dealTitle, setDealTitle] = useState("");
  const [dealUrl, setDealUrl] = useState("");
  const [recommended, setRecommended] = useState<TemplateKey>("whatsapp-viral");
  const [cards, setCards] = useState<CardSet>({});
  const [selected, setSelected] = useState<TemplateKey | null>(null);
  const [format, setFormat] = useState<FormatKey>("square");
  const [sending, setSending] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const run = async (force = false) => {
    if (!dealId) return;
    setLoading(true);
    setStage(0);
    try {
      // Stage 1+2: AI enhance (text + image)
      setStage(0);
      const aiRes = await supabase.functions.invoke("ai-enhance-deal", { body: { dealId, force } });
      if (aiRes.error) throw aiRes.error;
      const aiData = (aiRes.data as { ok?: boolean; data?: { recommended_template?: TemplateKey } })?.data;
      const rec = (aiData?.recommended_template as TemplateKey) ?? "whatsapp-viral";
      setRecommended(rec);

      // Stage 3: render 4 templates in square first (gallery)
      setStage(2);
      const results = await Promise.all(
        TEMPLATES.map((t) =>
          supabase.functions.invoke("generate-marketing-card", { body: { dealId, format: "square", template: t.key } })
        )
      );
      const next: CardSet = {};
      results.forEach((res, i) => {
        const key = TEMPLATES[i].key;
        if (res.error) {
          console.error("render failed", key, res.error);
          return;
        }
        const d = res.data as { ok?: boolean; url?: string; dealUrl?: string };
        if (d?.ok && d.url) {
          next[key] = { ...(cards[key] ?? {}), square: d.url };
          if (d.dealUrl) setDealUrl(d.dealUrl);
        }
      });
      setCards(next);
      setSelected((prev) => prev ?? rec);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "יצירה נכשלה");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!dealId) return;
    (async () => {
      const { data } = await supabase.from("deals").select("title").eq("id", dealId).maybeSingle();
      setDealTitle(data?.title ?? "");
      await run(false);
      if (searchParams.get("welcome") === "1") {
        searchParams.delete("welcome");
        setSearchParams(searchParams, { replace: true });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId]);

  // When user opens a template detail, fetch story+banner lazily
  const ensureFormat = async (template: TemplateKey, fmt: FormatKey) => {
    if (!dealId) return;
    if (cards[template]?.[fmt]) return;
    try {
      const res = await supabase.functions.invoke("generate-marketing-card", { body: { dealId, format: fmt, template } });
      if (res.error) throw res.error;
      const d = res.data as { ok?: boolean; url?: string };
      if (d?.ok && d.url) {
        setCards((c) => ({ ...c, [template]: { ...(c[template] ?? {}), [fmt]: d.url! } }));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "טעינת פורמט נכשלה");
    }
  };

  // Cycle the stage indicator while loading for nicer UX (purely visual).
  useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => setStage((s) => (s < STAGES.length - 1 ? s + 1 : s)), 1800);
    return () => clearInterval(id);
  }, [loading]);

  const regenerate = async () => {
    setRegenerating(true);
    setCards({});
    await run(true);
    setRegenerating(false);
    toast.success("נוצרו וריאציות חדשות");
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("הועתק");
    } catch {
      toast.error("העתקה נכשלה");
    }
  };

  const download = async () => {
    if (!selected) return;
    const url = cards[selected]?.[format];
    if (!url) return;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `groupbuild-${dealId}-${selected}-${format}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      toast.error("הורדה נכשלה");
    }
  };

  const waText = encodeURIComponent(
    `${dealTitle ? `🔥 ${dealTitle}\n` : ""}הצטרפו לרכישה קבוצתית — ככל שיותר מצטרפים, המחיר יורד!\n${dealUrl}`
  );
  const waUrl = `https://wa.me/?text=${waText}`;

  const sendSelfEmail = async () => {
    if (!selected) return;
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) { toast.error("אין כתובת מייל בחשבון"); return; }
      const { error } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "marketing-card-ready",
          recipientEmail: user.email,
          idempotencyKey: `mkt-self-${dealId}-${selected}-${Date.now()}`,
          templateData: {
            name: user.user_metadata?.full_name || "",
            dealTitle, dealUrl,
            cardImageUrl: cards[selected]?.square,
            whatsappUrl: waUrl,
          },
        },
      });
      if (error) throw error;
      toast.success("נשלח אליך במייל");
    } catch (e) { toast.error(e instanceof Error ? e.message : "שליחה נכשלה"); }
    finally { setSending(false); }
  };

  // ============ Loading state with progressive stages ============
  if (loading) {
    return (
      <MobileShell>
        <BackHeader title="כלי שיווק AI" subtitle={dealTitle} />
        <div className="px-5 -mt-4 relative z-10 pb-32">
          <div className="rounded-[20px] bg-gradient-to-br from-[#0E6B5A] to-[#34A88E] text-white p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-2xl bg-white/15 flex items-center justify-center">
                <Sparkles className="h-6 w-6 animate-pulse" />
              </div>
              <div>
                <div className="text-lg font-extrabold">AI יוצר עבורך מודעה</div>
                <div className="text-xs opacity-90">תוך כמה שניות</div>
              </div>
            </div>
            <div className="space-y-2">
              {STAGES.map((label, i) => (
                <div key={i} className={`flex items-center gap-2 text-sm transition-opacity ${i <= stage ? "opacity-100" : "opacity-40"}`}>
                  {i < stage ? <Check className="h-4 w-4" /> : i === stage ? <RefreshCw className="h-4 w-4 animate-spin" /> : <div className="h-4 w-4" />}
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {TEMPLATES.map((t) => (
              <div key={t.key} className={`aspect-square rounded-2xl bg-gradient-to-br ${t.accent} animate-pulse opacity-50`} />
            ))}
          </div>
        </div>
      </MobileShell>
    );
  }

  // ============ Detail view ============
  if (selected) {
    const url = cards[selected]?.[format];
    const tplMeta = TEMPLATES.find((t) => t.key === selected)!;
    return (
      <MobileShell>
        <BackHeader title={tplMeta.label} subtitle={dealTitle} />
        <div className="px-5 -mt-4 relative z-10 space-y-4 pb-32">
          <button onClick={() => setSelected(null)} className="text-xs text-[#6B7280] flex items-center gap-1">
            <ChevronRight className="h-3 w-3" /> חזרה לגלריה
          </button>

          {/* Format tabs */}
          <div className="flex gap-2">
            {(Object.keys(FORMAT_LABELS) as FormatKey[]).map((f) => (
              <button
                key={f}
                onClick={async () => { setFormat(f); await ensureFormat(selected, f); }}
                className={`flex-1 h-10 rounded-xl text-xs font-bold border transition ${format === f ? "bg-[#0E6B5A] text-white border-[#0E6B5A]" : "bg-white text-[#1F2937] border-[#ECEEF2]"}`}
              >
                {FORMAT_LABELS[f]}
              </button>
            ))}
          </div>

          {/* Preview */}
          <div className="gb-card p-3">
            <div className={`w-full ${FORMAT_RATIO[format]} rounded-xl overflow-hidden bg-[#F4F6FA] flex items-center justify-center`}>
              {url ? (
                <img src={url} alt={tplMeta.label} className="w-full h-full object-contain" />
              ) : (
                <div className="text-[#6B7280] text-sm flex flex-col items-center gap-2">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                  <span>מייצר {FORMAT_LABELS[format]}…</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={download} disabled={!url} className="h-12 rounded-[14px] bg-[#0E6B5A] text-white">
              <Download className="h-4 w-4 ml-2" /> הורדה
            </Button>
            <a href={waUrl} target="_blank" rel="noreferrer" className="contents">
              <Button type="button" className="h-12 rounded-[14px] bg-[#25D366] text-white hover:bg-[#1ebe5a] w-full">
                <Share2 className="h-4 w-4 ml-2" /> וואטסאפ
              </Button>
            </a>
            <Button onClick={() => copy(dealUrl)} variant="outline" className="h-12 rounded-[14px]">
              <Copy className="h-4 w-4 ml-2" /> העתק קישור
            </Button>
            <Button onClick={sendSelfEmail} disabled={sending} variant="outline" className="h-12 rounded-[14px]">
              <Mail className="h-4 w-4 ml-2" /> {sending ? "שולח…" : "שלח במייל"}
            </Button>
          </div>
        </div>
      </MobileShell>
    );
  }

  // ============ Gallery view ============
  return (
    <MobileShell>
      <BackHeader title="כלי שיווק AI" subtitle={dealTitle || "בחרו את העיצוב המועדף"} />
      <div className="px-5 -mt-4 relative z-10 space-y-4 pb-32">
        {/* Banner */}
        <div className="rounded-[16px] bg-gradient-to-br from-[#0E6B5A] to-[#34A88E] text-white p-4 flex items-start gap-3">
          <div className="h-9 w-9 rounded-[12px] bg-white/15 flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="text-sm leading-relaxed flex-1">
            <div className="font-extrabold mb-0.5">4 וריאציות מקצועיות מוכנות</div>
            <p className="opacity-90">AI יצר עבורך כותרת שיווקית, שיפר את התמונה והפיק 4 עיצובים. בחרו את המועדף.</p>
          </div>
        </div>

        {/* Gallery grid */}
        <div className="grid grid-cols-2 gap-3">
          {TEMPLATES.map((t) => {
            const url = cards[t.key]?.square;
            const isRec = t.key === recommended;
            return (
              <button
                key={t.key}
                onClick={() => { setSelected(t.key); setFormat("square"); }}
                className="text-right group relative"
              >
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-[#F4F6FA] border border-[#ECEEF2] shadow-sm group-hover:shadow-md transition">
                  {url ? (
                    <img src={url} alt={t.label} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-[#9CA3AF]">
                      <ImageIcon className="h-6 w-6" />
                      <span className="text-xs">לא נטען</span>
                    </div>
                  )}
                  {isRec && (
                    <div className="absolute top-2 right-2 bg-amber-400 text-amber-950 text-[10px] font-extrabold px-2 py-1 rounded-full flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> מומלץ AI
                    </div>
                  )}
                </div>
                <div className="mt-2">
                  <div className="text-sm font-extrabold text-[#1F2937]">{t.label}</div>
                  <div className="text-[11px] text-[#6B7280]">{t.description}</div>
                </div>
              </button>
            );
          })}
        </div>

        <Button onClick={regenerate} disabled={regenerating} variant="ghost" className="w-full h-11 rounded-[12px] text-[#6B7280]">
          <RefreshCw className={`h-4 w-4 ml-2 ${regenerating ? "animate-spin" : ""}`} /> צור מחדש עם AI
        </Button>

        <Button onClick={() => navigate(-1)} variant="ghost" className="w-full h-11 rounded-[12px]">חזרה</Button>
      </div>
    </MobileShell>
  );
}
