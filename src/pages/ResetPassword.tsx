import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase יצירת סשן זמני מה-recovery link
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("סיסמה חייבת להכיל לפחות 6 תווים");
    if (password !== confirm) return toast.error("הסיסמאות אינן תואמות");
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("הסיסמה עודכנה בהצלחה. התחברו עם הסיסמה החדשה.");
      await supabase.auth.signOut();
      navigate("/", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "עדכון הסיסמה נכשל");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero text-primary-foreground flex justify-center">
      <div className="w-full max-w-[480px] flex flex-col">
        <div className="px-6 pt-12 pb-8">
          <h1 className="text-3xl font-extrabold mb-2">איפוס סיסמה</h1>
          <p className="text-primary-foreground/70 text-sm">בחרו סיסמה חדשה לחשבון שלכם.</p>
        </div>
        <div className="flex-1 bg-background text-foreground rounded-t-[32px] px-6 pt-8 pb-8">
          {!ready ? (
            <p className="text-sm text-muted-foreground text-center">טוען קישור איפוס…</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 gb-gold-text" /> סיסמה חדשה
                </Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  required minLength={6} dir="ltr" placeholder="לפחות 6 תווים"
                  className="h-12 rounded-2xl bg-card border-border" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 gb-gold-text" /> אישור סיסמה
                </Label>
                <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                  required minLength={6} dir="ltr"
                  className="h-12 rounded-2xl bg-card border-border" />
              </div>
              <Button type="submit" disabled={loading}
                className="w-full h-12 rounded-2xl bg-primary hover:bg-primary-soft text-primary-foreground font-bold">
                {loading ? "מעדכן…" : "עדכון סיסמה"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
