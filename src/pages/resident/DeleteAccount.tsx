import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Trash2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/store/AppStore";

const CONFIRM_PHRASE = "מחק";

export default function DeleteAccount() {
  const navigate = useNavigate();
  const { logout } = useApp();
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const canDelete = confirm.trim() === CONFIRM_PHRASE && !loading;

  const handleDelete = async () => {
    if (!canDelete) return;
    setLoading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("לא מחובר");

      const { data, error } = await supabase.functions.invoke("delete-account", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);

      try { await supabase.auth.signOut(); } catch { /* ignore */ }
      try { logout(); } catch { /* ignore */ }
      toast.success("החשבון נמחק");
      navigate("/", { replace: true });
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "מחיקה נכשלה");
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen min-h-[100dvh] w-full" style={{ background: "#F7F5F0" }}>
      <div className="mx-auto w-full max-w-[var(--app-max-w)] pt-[env(safe-area-inset-top)] pb-12">
        <div className="px-5 pt-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-[14px] font-semibold text-[#0E6B5A]"
          >
            <ChevronRight className="h-4 w-4" />
            חזרה
          </button>
        </div>

        <div className="px-5 pt-6">
          <div className="bg-white rounded-[24px] border border-[#FECACA] shadow-[0_8px_24px_-12px_rgba(220,38,38,0.18)] p-6">
            <div className="flex flex-col items-center text-center">
              <div className="h-14 w-14 rounded-full bg-[#FEE2E2] flex items-center justify-center">
                <AlertTriangle className="h-7 w-7 text-[#DC2626]" strokeWidth={2.2} />
              </div>
              <h1 className="mt-4 text-[22px] font-extrabold text-[#1F2937] tracking-tight">
                מחיקת חשבון
              </h1>
              <p className="mt-2 text-[14px] text-[#6B7280] leading-relaxed">
                פעולה זו תמחק את החשבון שלך לצמיתות, יחד עם כל הנתונים האישיים,
                ההתראות, המועדפים, התמונה והגישה לאפליקציה. לא ניתן לבטל את הפעולה.
              </p>
            </div>

            <ul className="mt-6 space-y-2 text-[13px] text-[#374151] leading-relaxed">
              <li>• הפרופיל שלך יימחק מהמערכת</li>
              <li>• יוסרו כל ההתראות, המועדפים והעדפות שלך</li>
              <li>• רישומי תשלום והפיקדונות יישמרו לצרכי חשבונאות בלבד, ללא קישור אליך</li>
              <li>• האימייל שלך יוכל לשמש להרשמה מחדש בעתיד</li>
            </ul>

            <div className="mt-6">
              <label className="block text-[13px] font-semibold text-[#1F2937] mb-2">
                כדי לאשר, הקלד <span className="text-[#DC2626] font-extrabold">{CONFIRM_PHRASE}</span> בשדה הבא:
              </label>
              <input
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder={CONFIRM_PHRASE}
                className="w-full h-12 rounded-2xl border border-[#ECEEF2] px-4 text-right text-[15px] font-semibold text-[#1F2937] focus:outline-none focus:border-[#DC2626]"
                autoComplete="off"
              />
            </div>

            <button
              onClick={handleDelete}
              disabled={!canDelete}
              className="tap-target mt-5 w-full h-[52px] rounded-2xl flex items-center justify-center gap-2 bg-[#DC2626] text-white font-bold text-[15px] tracking-tight active:scale-[0.99] transition-transform disabled:opacity-40 disabled:active:scale-100"
            >
              {loading ? (
                <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Trash2 className="h-[18px] w-[18px]" strokeWidth={2.2} />
              )}
              <span>{loading ? "מוחק..." : "מחק את החשבון שלי לצמיתות"}</span>
            </button>

            <button
              onClick={() => navigate(-1)}
              className="mt-3 w-full h-[48px] rounded-2xl flex items-center justify-center bg-[#F7F5F0] text-[#1F2937] font-bold text-[14px]"
            >
              ביטול
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
