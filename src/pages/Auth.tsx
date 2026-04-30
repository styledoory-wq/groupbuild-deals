import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Building2, Briefcase, Mail, Sparkles, ArrowRight, ArrowLeft, User as UserIcon, MapPin, Lock } from "lucide-react";
import { useApp } from "@/store/AppStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { isAdminEmail, setAdminSession } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Role } from "@/types";

type Mode = "signin" | "signup";

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginDemo, setUser, projects } = useApp();
  const [role, setRole] = useState<Exclude<Role, "admin">>("resident");
  const initialMode: Mode = searchParams.get("mode") === "signup" ? "signup" : "signin";
  const [mode, setMode] = useState<Mode>(initialMode);
  const [loading, setLoading] = useState(false);

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [projectId, setProjectId] = useState<string>("");

  

  // If already logged in → redirect by role
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      await routeForUser(session.user.id, session.user.email ?? "");
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        // Defer to avoid recursion
        setTimeout(() => routeForUser(session.user.id, session.user.email ?? ""), 0);
      }
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const routeForUser = async (userId: string, userEmail: string) => {
    // Load profile + roles + supplier record in parallel.
    // user_roles is the source of truth for role; profile.user_type is fallback only.
    const [{ data: profile }, { data: roles }, { data: supplierRow }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("suppliers").select("id").eq("user_id", userId).maybeSingle(),
    ]);

    // Admin access is granted ONLY by verified email match.
    const isAdmin = isAdminEmail(userEmail);

    // Determine role: prefer user_roles, then profile.user_type, then supplier-record presence.
    const roleNames = (roles ?? []).map((r) => r.role as string);
    let resolvedRole: Role = "resident";
    if (isAdmin) {
      resolvedRole = "admin";
    } else if (roleNames.includes("supplier")) {
      resolvedRole = "supplier";
    } else if (profile?.user_type === "supplier") {
      resolvedRole = "supplier";
    } else if (supplierRow?.id) {
      // Fallback: supplier record exists even though role wasn't set.
      resolvedRole = "supplier";
    } else if (profile?.user_type === "resident" || roleNames.includes("resident")) {
      resolvedRole = "resident";
    }

    setUser({
      id: userId,
      role: resolvedRole,
      name: profile?.full_name ?? profile?.business_name ?? userEmail,
      phone: profile?.phone ?? "",
      email: profile?.email ?? userEmail,
      projectId: profile?.project_id ?? undefined,
    });

    if (resolvedRole === "admin") {
      setAdminSession(true);
      navigate("/admin");
      return;
    }
    setAdminSession(false);
    if (resolvedRole === "supplier") navigate("/supplier");
    else navigate("/resident");
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // Redirect handled by onAuthStateChange
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "התחברות נכשלה");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      toast.error("הזינו אימייל ואז לחצו 'שכחתי סיסמה'");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("שלחנו אליכם קישור לאיפוס סיסמה במייל");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שליחת מייל איפוס נכשלה");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    if (role === "resident" && !city.trim()) return;
    if (role === "supplier" && !businessName.trim()) return;
    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/`;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            city,
            user_type: role,
            business_name: businessName,
            project_id: projectId || null,
          },
        },
      });
      if (error) throw error;
      // Notify admin about new signup (best effort)
      supabase.functions.invoke("notify-admin", {
        body: {
          event: role === "supplier" ? "new_supplier" : "new_resident",
          title: role === "supplier" ? "ספק חדש נרשם" : "דייר חדש נרשם",
          details: { full_name: fullName, email, phone: "", city, business_name: businessName, role },
        },
      }).catch(() => { /* ignore */ });
      toast.success("נרשמתם בהצלחה! מתחברים…");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "הרשמה נכשלה";
      if (msg.includes("already registered")) toast.error("המייל הזה כבר רשום");
      else toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = (r: Exclude<Role, "admin">) => {
    loginDemo(r);
    if (r === "resident") navigate("/resident");
    else navigate("/supplier");
  };

  const roles: { id: Exclude<Role, "admin">; label: string; icon: React.ComponentType<{ className?: string }>; desc: string }[] = [
    { id: "resident", label: "דייר", icon: Building2, desc: "הצטרפו לעסקאות" },
    { id: "supplier", label: "ספק", icon: Briefcase, desc: "צרו הצעות" },
  ];

  return (
    <div className="min-h-screen bg-gradient-hero text-primary-foreground flex justify-center">
      <div className="w-full max-w-[480px] flex flex-col">
        <div className="px-6 pt-12 pb-8 relative overflow-hidden">
          <div className="absolute -top-20 -left-20 h-64 w-64 rounded-full bg-gold/10 blur-3xl" />
          <div className="absolute -bottom-10 -right-10 h-48 w-48 rounded-full bg-gold/5 blur-2xl" />

          <div className="relative animate-fade-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 mb-6">
              <Sparkles className="h-3.5 w-3.5 text-gold" />
              <span className="text-xs font-medium">רכש קבוצתי לדיירי בנייה חדשה</span>
            </div>

            <h1 className="text-4xl font-extrabold leading-tight mb-3">
              ברוכים הבאים ל-
              <span className="block gb-gold-text mt-1" aria-label="GroupBuild">
                GroupBuild
              </span>
            </h1>
            <div className="gb-divider-gold mb-4" />
            <p className="text-primary-foreground/70 text-sm leading-relaxed max-w-sm">
              {mode === "signin"
                ? "התחברו כדי להמשיך להצטרף לעסקאות הקבוצתיות שלכם."
                : "פתחו חשבון חדש בכמה צעדים קצרים."}
            </p>
          </div>
        </div>

        <div className="flex-1 bg-background text-foreground rounded-t-[32px] px-6 pt-8 pb-8 -mt-2">
          {/* Tabs */}
          <div className="flex gap-2 p-1 bg-muted rounded-2xl mb-6">
            {(["signin", "signup"] as const).map((m) => (
              <button
                type="button"
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "flex-1 py-2 rounded-xl text-sm font-bold transition-smooth",
                  mode === m ? "bg-card shadow-soft text-primary" : "text-muted-foreground"
                )}
              >
                {m === "signin" ? "התחברות" : "הרשמה"}
              </button>
            ))}
          </div>

          {mode === "signin" ? (
            <form onSubmit={handleSignIn} className="space-y-4 animate-fade-up">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 gb-gold-text" /> אימייל
                </Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.co.il" dir="ltr" required
                  className="h-12 rounded-2xl bg-card border-border" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 gb-gold-text" /> סיסמה
                </Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  required minLength={6} dir="ltr"
                  className="h-12 rounded-2xl bg-card border-border" />
              </div>
              <Button type="submit" disabled={loading}
                className="w-full h-12 rounded-2xl bg-primary hover:bg-primary-soft text-primary-foreground font-bold flex items-center justify-center gap-2">
                {loading ? "מתחבר…" : "התחברות"}
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <button type="button" onClick={handleForgotPassword} disabled={loading}
                className="w-full text-center text-xs text-muted-foreground hover:text-primary underline-offset-4 hover:underline transition-smooth">
                שכחתי סיסמה
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-4 animate-fade-up">
              <div>
                <h2 className="text-sm font-bold mb-2">בחרו את התפקיד שלכם</h2>
                <div className="grid grid-cols-2 gap-2">
                  {roles.map(({ id, label, icon: Icon, desc }) => (
                    <button type="button" key={id} onClick={() => setRole(id)}
                      className={cn(
                        "p-3 rounded-2xl border-2 transition-smooth text-center",
                        role === id ? "border-gold bg-gradient-to-b from-gold/10 to-transparent" : "border-border bg-card"
                      )}>
                      <div className={cn(
                        "h-10 w-10 mx-auto rounded-xl flex items-center justify-center mb-2",
                        role === id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="text-sm font-bold">{label}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  <UserIcon className="h-3.5 w-3.5 gb-gold-text" /> שם מלא
                </Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)}
                  placeholder="ישראל ישראלי" required maxLength={60}
                  className="h-12 rounded-2xl bg-card border-border" />
              </div>

              {role === "resident" && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 gb-gold-text" /> עיר
                    </Label>
                    <Input value={city} onChange={(e) => setCity(e.target.value)}
                      placeholder="תל אביב" required maxLength={40}
                      className="h-12 rounded-2xl bg-card border-border" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 gb-gold-text" /> פרויקט (אופציונלי)
                    </Label>
                    <select value={projectId} onChange={(e) => setProjectId(e.target.value)}
                      className="flex h-12 w-full rounded-2xl border border-border bg-card px-3 text-sm">
                      <option value="">בחרו פרויקט</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} — {p.city}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {role === "supplier" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5 gb-gold-text" /> שם העסק
                  </Label>
                  <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="לדוגמה: מטבחי רויאל" required maxLength={80}
                    className="h-12 rounded-2xl bg-card border-border" />
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 gb-gold-text" /> אימייל
                </Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.co.il" dir="ltr" required
                  className="h-12 rounded-2xl bg-card border-border" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 gb-gold-text" /> סיסמה
                </Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  required minLength={6} dir="ltr" placeholder="לפחות 6 תווים"
                  className="h-12 rounded-2xl bg-card border-border" />
              </div>

              <Button type="submit" disabled={loading}
                className="w-full h-12 rounded-2xl bg-primary hover:bg-primary-soft text-primary-foreground font-bold mt-2">
                {loading ? "נרשם…" : "צרו חשבון"}
              </Button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
