import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Download, Copy, Share2, Mail, RefreshCw, Image as ImageIcon, Sparkles } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BackHeader, LoadingState } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type FormatKey = "square" | "story" | "banner";
const FORMAT_LABELS: Record<FormatKey, string> = {
  square: "פוסט (1080×1080)",
  story: "סטורי (1080×1920)",
  banner: "באנר (1200×628)",
};
const FORMAT_RATIO: Record<FormatKey, string> = {
  square: "aspect-square",
  story: "aspect-[9/16]",
  banner: "aspect-[1200/628]",
};

export default function SupplierMarketingTools() {
  const { dealId } = useParams<{ dealId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [urls, setUrls] = useState<Partial<Record<FormatKey, string>>>({});
  const [dealUrl, setDealUrl] = useState("");
  const [dealTitle, setDealTitle] = useState("");
  const [activeFormat, setActiveFormat] = useState<FormatKey>("square");
  const [sending, setSending] = useState(false);

  const generate = async () => {
    if (!dealId) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-marketing-card", {
        body: { dealId },
      });
      if (error) throw error;
      const d = data as { ok?: boolean; dealUrl?: string; urls?: Record<string, string>; error?: string };
      if (!d.ok) throw new Error(d.error || "generation_failed");
      setUrls(d.urls as Record<FormatKey, string>);
      setDealUrl(d.dealUrl || "");
      toast.success("התמונות נוצרו בהצלחה");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "יצירה נכשלה");
    } finally {
      setGenerating(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!dealId) return;
    (async () => {
      const { data } = await supabase.from("deals").select("title").eq("id", dealId).maybeSingle();
      setDealTitle(data?.title ?? "");
      await generate();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId]);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("הועתק");
    } catch { toast.error("העתקה נכשלה"); }
  };

  const download = async () => {
    const url = urls[activeFormat];
    if (!url) return;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `groupbuild-${dealId}-${activeFormat}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch { toast.error("הורדה נכשלה"); }
  };

  const waText = encodeURIComponent(
    `${dealTitle ? `🔥 ${dealTitle}\n` : ""}הצטרפו לרכישה קבוצתית — ככל שיותר מצטרפים, המחיר יורד!\n${dealUrl}`
  );
  const waUrl = `https://wa.me/?text=${waText}`;

  const sendSelfEmail = async () => {
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) { toast.error("אין כתובת מייל בחשבון"); return; }
      const { error } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "marketing-card-ready",
          recipientEmail: user.email,
          idempotencyKey: `mkt-self-${dealId}-${Date.now()}`,
          templateData: {
            name: user.user_metadata?.full_name || "",
            dealTitle, dealUrl,
            cardImageUrl: urls.square,
            whatsappUrl: waUrl,
          },
        },
      });
      if (error) throw error;
      toast.success("נשלח אליך במייל");
    } catch (e) { toast.error(e instanceof Error ? e.message : "שליחה נכשלה"); }
    finally { setSending(false); }
  };

  if (loading) {
    return (
      <MobileShell>
        <BackHeader title="כלי שיווק" subtitle="מייצר עבורך תמונות..." />
        <LoadingState />
      </MobileShell>
    );
  }

  const current = urls[activeFormat];

  return (
    <MobileShell>
      <BackHeader title="כלי שיווק" subtitle={dealTitle || "תמונה שיווקית מוכנה"} />
      <div className="px-5 -mt-4 relative z-10 space-y-4 pb-32">
        {/* Banner */}
        <div className="rounded-[16px] bg-gradient-to-br from-[#0E6B5A] to-[#34A88E] text-white p-4 flex items-start gap-3">
          <div className="h-9 w-9 rounded-[12px] bg-white/15 flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="text-sm leading-relaxed">
            <div className="font-extrabold mb-0.5">מוכן לפרסום בלחיצה</div>
            <p className="opacity-90">בחרו פורמט, הורידו או שתפו ישירות בוואטסאפ — נכלל QR וקישור ישיר להצעה.</p>
          </div>
        </div>

        {/* Format tabs */}
        <div className="flex gap-2">
          {(Object.keys(FORMAT_LABELS) as FormatKey[]).map((f) => (
            <button
              key={f}
              onClick={() => setActiveFormat(f)}
              className={`flex-1 h-10 rounded-xl text-xs font-bold border transition ${activeFormat === f ? "bg-[#0E6B5A] text-white border-[#0E6B5A]" : "bg-white text-[#1F2937] border-[#ECEEF2]"}`}
            >
              {FORMAT_LABELS[f]}
            </button>
          ))}
        </div>

        {/* Preview */}
        <div className="gb-card p-3">
          <div className={`w-full ${FORMAT_RATIO[activeFormat]} rounded-xl overflow-hidden bg-[#F4F6FA] flex items-center justify-center`}>
            {current ? (
              <img src={current} alt={FORMAT_LABELS[activeFormat]} className="w-full h-full object-contain" />
            ) : (
              <div className="text-[#6B7280] text-sm flex flex-col items-center gap-2">
                <ImageIcon className="h-8 w-8" />
                <span>אין תמונה</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={download} disabled={!current} className="h-12 rounded-[14px] bg-[#0E6B5A] text-white">
            <Download className="h-4 w-4 ml-2" /> הורדה
          </Button>
          <a href={waUrl} target="_blank" rel="noreferrer" className="contents">
            <Button type="button" className="h-12 rounded-[14px] bg-[#25D366] text-white hover:bg-[#1ebe5a] w-full">
              <Share2 className="h-4 w-4 ml-2" /> שיתוף בוואטסאפ
            </Button>
          </a>
          <Button onClick={() => copy(dealUrl)} variant="outline" className="h-12 rounded-[14px]">
            <Copy className="h-4 w-4 ml-2" /> העתקת קישור
          </Button>
          <Button onClick={sendSelfEmail} disabled={sending} variant="outline" className="h-12 rounded-[14px]">
            <Mail className="h-4 w-4 ml-2" /> {sending ? "שולח..." : "שלח לעצמי במייל"}
          </Button>
        </div>

        <Button onClick={generate} disabled={generating} variant="ghost" className="w-full h-11 rounded-[12px] text-[#6B7280]">
          <RefreshCw className={`h-4 w-4 ml-2 ${generating ? "animate-spin" : ""}`} /> צור מחדש
        </Button>

        <Button onClick={() => navigate(-1)} variant="ghost" className="w-full h-11 rounded-[12px]">חזרה</Button>
      </div>
    </MobileShell>
  );
}
