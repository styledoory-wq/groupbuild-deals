import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Loader2, X, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/store/AppStore";
import { toast } from "sonner";

type PendingAction = () => void | Promise<void>;

interface GuestGateContextValue {
  /** Wrap a callback that requires authentication. If the user is a guest, opens a signup sheet and resumes the action after auth. */
  requireAuth: (reason: string, action: PendingAction) => void;
}

const Ctx = createContext<GuestGateContextValue | null>(null);

export function useGuestGate(): GuestGateContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useGuestGate must be used inside <GuestGateProvider>");
  return v;
}

export function GuestGateProvider({ children }: { children: ReactNode }) {
  const { user, authReady } = useApp();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const pendingRef = useRef<PendingAction | null>(null);

  const requireAuth = useCallback((r: string, action: PendingAction) => {
    if (user) { void action(); return; }
    pendingRef.current = action;
    setReason(r);
    setMode("signup");
    setOpen(true);
  }, [user]);

  // Once auth is ready and we have a user, run any pending action.
  useEffect(() => {
    if (authReady && user && pendingRef.current) {
      const fn = pendingRef.current;
      pendingRef.current = null;
      setOpen(false);
      setTimeout(() => { void fn(); }, 50);
    }
  }, [authReady, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${window.location.pathname}`,
            data: { full_name: name.trim() || null, role: "resident" },
          },
        });
        if (error) throw error;
        toast.success("נרשמת בהצלחה — ממשיכים לפעולה");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        toast.success("התחברת בהצלחה");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    pendingRef.current = null;
    setOpen(false);
  };

  const value = useMemo(() => ({ requireAuth }), [requireAuth]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center" dir="rtl">
          <button
            aria-label="סגור"
            onClick={close}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 pb-8 animate-in slide-in-from-bottom duration-200">
            <button onClick={close} className="absolute top-4 left-4 h-8 w-8 rounded-full bg-[#F7F5F0] flex items-center justify-center" aria-label="סגור">
              <X className="h-4 w-4 text-[#6B7280]" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-11 w-11 rounded-2xl bg-[#0E6B5A]/10 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-[#0E6B5A]" />
              </div>
              <div>
                <h2 className="text-[17px] font-extrabold text-[#1F2937]">הרשמה מהירה נדרשת</h2>
                <p className="text-[12px] text-[#6B7280]">{reason}</p>
              </div>
            </div>

            <div className="flex gap-2 mb-4 bg-[#F7F5F0] rounded-xl p-1">
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`flex-1 h-9 rounded-lg text-[13px] font-bold ${mode === "signup" ? "bg-white text-[#0E6B5A] shadow-sm" : "text-[#6B7280]"}`}
              >
                הרשמה
              </button>
              <button
                type="button"
                onClick={() => setMode("signin")}
                className={`flex-1 h-9 rounded-lg text-[13px] font-bold ${mode === "signin" ? "bg-white text-[#0E6B5A] shadow-sm" : "text-[#6B7280]"}`}
              >
                התחברות
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === "signup" && (
                <input
                  autoFocus
                  type="text"
                  required
                  placeholder="שם מלא"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-[#ECEEF2] text-[15px] focus:outline-none focus:border-[#0E6B5A]"
                />
              )}
              <input
                type="email"
                required
                inputMode="email"
                placeholder="דוא״ל"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-[#ECEEF2] text-[15px] focus:outline-none focus:border-[#0E6B5A]"
              />
              <input
                type="password"
                required
                minLength={6}
                placeholder="סיסמה"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-[#ECEEF2] text-[15px] focus:outline-none focus:border-[#0E6B5A]"
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full h-12 rounded-xl bg-[#0E6B5A] text-white font-bold text-[15px] flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === "signup" ? "צור חשבון והמשך" : "התחבר והמשך"}
              </button>
            </form>

            <p className="text-[11px] text-[#9CA3AF] mt-4 text-center leading-relaxed">
              חיפוש, צפייה בפרטי ספק, שיחות טלפון ו־WhatsApp — פתוחים לכולם ללא הרשמה.
            </p>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
