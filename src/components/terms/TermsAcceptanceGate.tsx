import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CURRENT_TERMS_VERSION, type TermsAudience } from "@/lib/terms";
import { TermsContent } from "@/components/terms/TermsContent";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useApp } from "@/store/AppStore";

export function TermsAcceptanceGate({ children }: { children: React.ReactNode }) {
  const { user, authReady } = useApp();
  const [needsAccept, setNeedsAccept] = useState(false);
  const [audience, setAudience] = useState<TermsAudience>("resident");
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let active = true;
    const check = async () => {
      if (!authReady) return;
      if (!user) {
        if (active) { setNeedsAccept(false); setUserId(null); }
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_type, terms_accepted, terms_version")
        .eq("id", user.id)
        .maybeSingle();
      if (!active) return;
      setUserId(user.id);
      const aud: TermsAudience = profile?.user_type === "supplier" || user.role === "supplier" ? "supplier" : "resident";
      setAudience(aud);
      const ok = !!profile?.terms_accepted && profile?.terms_version === CURRENT_TERMS_VERSION;
      setNeedsAccept(!ok);
    };
    void check();
    return () => { active = false; };
  }, [authReady, user?.id, user?.role]);

  const handleAccept = async () => {
    if (!userId || !checked) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          terms_accepted: true,
          terms_accepted_at: new Date().toISOString(),
          terms_version: CURRENT_TERMS_VERSION,
        })
        .eq("id", userId);
      if (error) throw error;
      setNeedsAccept(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "שמירת האישור נכשלה");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {children}
      {needsAccept && (
        <div className="fixed inset-0 z-[100] bg-[#C9A227]/45 backdrop-blur-[6px] flex items-end md:items-center justify-center p-0 md:p-4" dir="rtl">
          <div className="w-full md:max-w-2xl bg-white rounded-t-[20px] md:rounded-[20px] shadow-[0_20px_44px_-18px_rgba(10,31,61,0.24)] max-h-[92vh] flex flex-col">
            <div className="px-6 pt-6 pb-3 shadow-[0_1px_0_rgba(10,31,61,0.06)]">
              <h2 className="text-lg font-extrabold text-primary">עודכנו תנאי השימוש במערכת</h2>
              <p className="text-xs text-muted-foreground mt-1">לצורך המשך שימוש במערכת, יש לאשר את תנאי השימוש המעודכנים.</p>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <TermsContent audience={audience} />
            </div>
            <div className="px-6 py-4 space-y-3 bg-white rounded-b-[20px] md:rounded-b-[20px] shadow-[0_-1px_0_rgba(10,31,61,0.06)]">
              <label className="flex items-start gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setChecked(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-primary"
                />
                <span>קראתי ואני מאשר את תנאי השימוש</span>
              </label>
              <Button
                onClick={handleAccept}
                disabled={!checked || submitting}
                className="w-full h-12"
              >
                {submitting ? "שומר…" : "קראתי ואני מאשר"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
