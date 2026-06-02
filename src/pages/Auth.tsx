import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
import { getFriendlyLoadError, withTimeout } from "@/lib/safeAsync";
import { CURRENT_TERMS_VERSION } from "@/lib/terms";
import { resolveSupplierForUser } from "@/lib/supplierAuth";

type Mode = "signin" | "signup";

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser, projects } = useApp();
  const [role, setRole] = useState<Exclude<Role, "admin">>("resident");
  const initialMode: Mode = searchParams.get("mode") === "signup" ? "signup" : "signin";
  const [mode, setMode] = useState<Mode>(initialMode);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [termsAccepted, setTermsAccepted] = useState(false);


  // If already logged in → redirect by role
  useEffect(() => {
    withTimeout(supabase.auth.getSession(), "בדיקת התחברות").then(async ({ data: { session } }) => {
      if (!session) return;
      await routeForUser(session.user.id, session.user.email ?? "");
    }).catch((error) => setAuthError(getFriendlyLoadError(error, "לא הצלחנו לבדוק את מצב ההתחברות.")));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        // Defer to avoid recursion
        setTimeout(() => {
          routeForUser(session.user.id, session.user.email ?? "")
            .catch((error) => setAuthError(getFriendlyLoadError(error, "לא הצלחנו לטעון את החשבון.")));
        }, 0);
      }
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const routeForUser = async (userId: string, userEmail: string) => {
    // Load profile + roles + supplier record in parallel.
    // user_roles is the source of truth for role; profile.user_type is fallback only.
    setAuthError(null);
    const [{ data: profile }, { data: roles }] = await Promise.all([
      withTimeout(supabase.from("profiles").select("*").eq("id", userId).maybeSingle(), "טעינת פרופיל"),
      withTimeout(supabase.from("user_roles").select("role").eq("user_id", userId), "טעינת הרשאות"),
    ]);
    const supplierRow = await withTimeout(resolveSupplierForUser(userId, userEmail, "id"), "טעינת ספק");

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
    if (!termsAccepted) {
      toast.error("יש לאשר את תנאי השימוש כדי להמשיך");
      return;
    }
    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/`;
      const { data, error } = await supabase.auth.signUp({
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
      // Persist terms acceptance on profile (best-effort, after trigger creates profile)
      const newUserId = data.user?.id;
      if (newUserId) {
        supabase.from("profiles").update({
          terms_accepted: true,
          terms_accepted_at: new Date().toISOString(),
          terms_version: CURRENT_TERMS_VERSION,
        }).eq("id", newUserId).then(() => { /* ignore */ });
      }
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


  const roles: { id: Exclude<Role, "admin">; label: string; icon: React.ComponentType<{ className?: string }>; desc: string }[] = [
    { id: "resident", label: "דייר", icon: Building2, desc: "הצטרפו לעסקאות" },
    { id: "supplier", label: "ספק", icon: Briefcase, desc: "צרו הצעות" },
  ];

  return (
    <div
      dir="rtl"
      className="min-h-screen min-h-[100dvh] flex justify-center text-white relative overflow-hidden"
      style={{ background: "linear-gradient(180deg, #0A1F3D 0%, #0D2748 55%, #07172E 100%)" }}
    >
      {/* Ambient gold orbs — Blink/Welcome style */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -right-24 h-80 w-80 rounded-full bg-[#C9A961]/15 blur-3xl" />
        <div className="absolute top-1/3 -left-24 h-96 w-96 rounded-full bg-[#C9A961]/8 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-72 w-72 rounded-full bg-[#0A1F3D]/40 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-screen-sm flex flex-col safe-top">
        <div className="px-6 pt-12 pb-8 relative">
          <div className="relative animate-fade-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 mb-6 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-[#C9A961]" />
              <span className="text-xs font-medium">רכש קבוצתי לדיירי בנייה חדשה</span>
            </div>

            <h1 className="text-[clamp(2rem,7vw,2.75rem)] leading-[1.05] font-extrabold tracking-tight text-white mb-3">
              ברוכים הבאים
              <br />
              ל־<span className="bg-gradient-to-l from-[#E8C97D] via-[#C9A961] to-[#E8C97D] bg-clip-text text-transparent">GroupBuild</span>
            </h1>
            <div className="h-[2px] w-16 rounded-full bg-gradient-to-l from-transparent via-[#C9A961] to-transparent mb-4" />
            <p className="text-white/70 text-sm leading-relaxed max-w-sm">
              {mode === "signin"
                ? "התחברו כדי להמשיך להצטרף לעסקאות הקבוצתיות שלכם."
                : "פתחו חשבון חדש בכמה צעדים קצרים."}
            </p>
          </div>
        </div>

        <div className="flex-1 bg-background text-foreground rounded-t-[32px] px-6 pt-8 pb-8 -mt-2 shadow-[0_-12px_40px_-12px_rgba(0,0,0,0.3)]">
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

          {authError && (
            <div className="mb-4 rounded-2xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive leading-relaxed">
              {authError}
            </div>
          )}


          {mode === "signin" ? (
            <form onSubmit={handleSignIn} className="space-y-4 animate-fade-up">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 gb-gold-text" /> אימייל
                </Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.co.il" dir="ltr" required
                  className="h-12 bg-white border-[1.5px] border-[#e2e8f0] rounded-xl px-4 py-3.5 text-sm focus:border-[#1e3a5f] focus:shadow-[0_0_0_3px_rgba(30,58,95,0.1)] focus:outline-none focus:ring-0 transition-all duration-200" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 gb-gold-text" /> סיסמה
                </Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  required minLength={6} dir="ltr" placeholder="הזינו את הסיסמה"
                  className="h-12 bg-white border-[1.5px] border-[#e2e8f0] rounded-xl px-4 py-3.5 text-sm focus:border-[#1e3a5f] focus:shadow-[0_0_0_3px_rgba(30,58,95,0.1)] focus:outline-none focus:ring-0 transition-all duration-200" />
              </div>
              <Button type="submit" disabled={loading}
                className="w-full h-14 rounded-2xl bg-gradient-to-l from-[#E8C97D] via-[#C9A961] to-[#E8C97D] text-[#0A1F3D] font-bold text-base shadow-[0_12px_40px_-12px_rgba(201,169,97,0.7)] hover:brightness-105 flex items-center justify-center gap-2">
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
                      <div className="text-fs-xs text-muted-foreground mt-0.5">{desc}</div>
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
                  className="h-12 bg-white border-[1.5px] border-[#e2e8f0] rounded-xl px-4 py-3.5 text-sm focus:border-[#1e3a5f] focus:shadow-[0_0_0_3px_rgba(30,58,95,0.1)] focus:outline-none focus:ring-0 transition-all duration-200" />
              </div>

              {role === "resident" && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 gb-gold-text" /> עיר
                    </Label>
                    <Input value={city} onChange={(e) => setCity(e.target.value)}
                      placeholder="תל אביב" required maxLength={40}
                      className="h-12 bg-white border-[1.5px] border-[#e2e8f0] rounded-xl px-4 py-3.5 text-sm focus:border-[#1e3a5f] focus:shadow-[0_0_0_3px_rgba(30,58,95,0.1)] focus:outline-none focus:ring-0 transition-all duration-200" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 gb-gold-text" /> פרויקט (אופציונלי)
                    </Label>
                    <select value={projectId} onChange={(e) => setProjectId(e.target.value)}
                      className="flex h-12 w-full rounded-xl border-[1.5px] border-[#e2e8f0] bg-white px-4 text-sm focus:border-[#1e3a5f] focus:shadow-[0_0_0_3px_rgba(30,58,95,0.1)] focus:outline-none transition-all duration-200">
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
                    className="h-12 bg-white border-[1.5px] border-[#e2e8f0] rounded-xl px-4 py-3.5 text-sm focus:border-[#1e3a5f] focus:shadow-[0_0_0_3px_rgba(30,58,95,0.1)] focus:outline-none focus:ring-0 transition-all duration-200" />
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 gb-gold-text" /> אימייל
                </Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.co.il" dir="ltr" required
                  className="h-12 bg-white border-[1.5px] border-[#e2e8f0] rounded-xl px-4 py-3.5 text-sm focus:border-[#1e3a5f] focus:shadow-[0_0_0_3px_rgba(30,58,95,0.1)] focus:outline-none focus:ring-0 transition-all duration-200" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 gb-gold-text" /> סיסמה
                </Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  required minLength={6} dir="ltr" placeholder="לפחות 6 תווים"
                  className="h-12 bg-white border-[1.5px] border-[#e2e8f0] rounded-xl px-4 py-3.5 text-sm focus:border-[#1e3a5f] focus:shadow-[0_0_0_3px_rgba(30,58,95,0.1)] focus:outline-none focus:ring-0 transition-all duration-200" />
              </div>

              <label className="flex items-start gap-2 text-xs cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-primary"
                />
                <span>
                  קראתי ואני מאשר את{" "}
                  <Link
                    to={role === "supplier" ? "/terms/suppliers" : "/terms/residents"}
                    target="_blank"
                    className="font-bold gb-gold-text underline-offset-2 hover:underline"
                  >
                    תנאי השימוש
                  </Link>
                </span>
              </label>

              <Button type="submit" disabled={loading || !termsAccepted}
                className="w-full h-12 rounded-2xl font-bold mt-2">
                {loading ? "נרשם…" : "צרו חשבון"}
              </Button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
