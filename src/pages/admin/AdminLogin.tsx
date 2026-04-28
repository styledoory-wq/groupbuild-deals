import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ShieldCheck, Lock, ArrowRight, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApp } from "@/store/AppStore";
import { ADMIN_EMAIL, isAdminEmail, setAdminSession } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // If an admin session already exists, go straight to /admin
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session && isAdminEmail(data.session.user.email)) {
        setAdminSession(true);
        const from = (location.state as { from?: string } | null)?.from;
        navigate(from && from.startsWith("/admin") ? from : "/admin", { replace: true });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdminEmail(email)) {
      toast.error("אין לך הרשאה לגשת לאזור זה");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      if (!isAdminEmail(data.user?.email)) {
        await supabase.auth.signOut();
        toast.error("אין לך הרשאה לגשת לאזור זה");
        return;
      }
      setAdminSession(true);
      setUser({
        id: data.user!.id,
        role: "admin",
        name: "מנהל מערכת",
        phone: "",
        email: data.user!.email ?? "",
      });
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from && from.startsWith("/admin") ? from : "/admin", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ההתחברות נכשלה");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero text-primary-foreground flex justify-center">
      <div className="w-full max-w-[480px] flex flex-col px-6 pt-16 pb-8">
        <button
          onClick={() => navigate("/")}
          className="self-start text-xs text-primary-foreground/60 hover:text-gold transition-smooth flex items-center gap-1 mb-8"
        >
          <ArrowRight className="h-3.5 w-3.5" />
          חזרה
        </button>

        <div className="relative animate-fade-up">
          <div className="absolute -top-10 -left-10 h-48 w-48 rounded-full bg-gold/10 blur-3xl" />
          <div className="relative">
            <div className="h-16 w-16 rounded-2xl bg-gradient-gold flex items-center justify-center shadow-gold mb-6">
              <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-extrabold mb-2">כניסת ניהול</h1>
            <div className="gb-divider-gold mb-4" />
            <p className="text-primary-foreground/70 text-sm leading-relaxed">
              אזור זה מוגבל. רק חשבון המנהל המורשה יכול להיכנס.
            </p>
          </div>
        </div>

        <div className="mt-10 bg-background text-foreground rounded-3xl p-6 shadow-elevated animate-fade-up">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-2 block flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> אימייל מנהל
              </label>
              <Input
                type="email"
                placeholder={ADMIN_EMAIL}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-2xl bg-card border-border text-base"
                dir="ltr"
                autoFocus
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-2 block flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" /> סיסמה
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 rounded-2xl bg-card border-border text-base"
                dir="ltr"
                required
                minLength={6}
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-2xl bg-gradient-gold text-primary font-bold text-base shadow-gold"
            >
              {loading ? "מתחבר…" : "כניסה לפאנל הניהול"}
            </Button>
          </form>
        </div>

        <p className="text-center text-[11px] text-primary-foreground/50 mt-6">
          הגישה מתועדת ומאובטחת
        </p>
      </div>
    </div>
  );
}
