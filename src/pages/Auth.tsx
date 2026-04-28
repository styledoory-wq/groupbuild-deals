import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Briefcase, Phone, Mail, Sparkles, ArrowRight, ArrowLeft, User as UserIcon, MapPin } from "lucide-react";
import { useApp } from "@/store/AppStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { resolveRoleForIdentifier, setAdminSession, isAdminIdentifier } from "@/lib/auth";
import { useHiddenAdminGesture } from "@/hooks/useHiddenAdminGesture";
import type { Role } from "@/types";

type Step = "identify" | "register";

export default function Auth() {
  const navigate = useNavigate();
  const { loginDemo, setUser, projects } = useApp();
  const [role, setRole] = useState<Exclude<Role, "admin">>("resident");
  const [method, setMethod] = useState<"phone" | "email">("phone");
  const [value, setValue] = useState("");
  const [step, setStep] = useState<Step>("identify");

  // Registration fields
  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [projectId, setProjectId] = useState<string>("");

  const hiddenAdmin = useHiddenAdminGesture();

  const goRole = (r: Role) => {
    if (r === "resident") navigate("/resident");
    else if (r === "supplier") navigate("/supplier");
    else if (r === "admin") navigate("/admin");
  };

  const handleDemo = (r: Exclude<Role, "admin">) => {
    loginDemo(r);
    goRole(r);
  };

  const handleIdentifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;

    // Admin shortcut — bypass registration entirely.
    if (isAdminIdentifier(value)) {
      setAdminSession(true);
      setUser({
        id: "u_admin",
        role: "admin",
        name: "מנהל מערכת",
        phone: method === "phone" ? value : "",
        email: method === "email" ? value : "",
      });
      navigate("/admin");
      return;
    }

    // Pre-fill the matching contact field for the registration step.
    if (method === "phone") {
      setPhone(value);
      setEmail("");
    } else {
      setEmail(value);
      setPhone("");
    }
    setStep("register");
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    if (role === "resident" && (!city.trim() || !email.trim())) return;
    if (role === "supplier" && !businessName.trim()) return;

    const resolved = resolveRoleForIdentifier(role, method === "phone" ? phone : email);
    setUser({
      id: `u_${Date.now()}`,
      role: resolved,
      name: role === "supplier" ? businessName : fullName,
      phone,
      email,
      projectId: role === "resident" ? (projectId || "p1") : undefined,
    });
    goRole(resolved);
  };

  const roles: { id: Exclude<Role, "admin">; label: string; icon: React.ComponentType<{ className?: string }>; desc: string }[] = [
    { id: "resident", label: "דייר", icon: Building2, desc: "הצטרפו לעסקאות" },
    { id: "supplier", label: "ספק", icon: Briefcase, desc: "צרו הצעות" },
  ];

  return (
    <div className="min-h-screen bg-gradient-hero text-primary-foreground flex justify-center">
      <div className="w-full max-w-[480px] flex flex-col">
        {/* Decorative top */}
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
              <span
                className="block gb-gold-text mt-1 cursor-pointer select-none"
                {...hiddenAdmin}
                aria-label="GroupBuild"
              >
                GroupBuild
              </span>
            </h1>
            <div className="gb-divider-gold mb-4" />
            <p className="text-primary-foreground/70 text-sm leading-relaxed max-w-sm">
              {step === "identify"
                ? "חברו את הדיירים בפרויקט שלכם, השיגו מחירים ספקים פרימיום וחסכו אלפי שקלים בשדרוגי הדירה."
                : "עוד כמה פרטים קצרים ונסיים את ההרשמה."}
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="flex-1 bg-background text-foreground rounded-t-[32px] px-6 pt-8 pb-8 -mt-2">
          {step === "identify" ? (
            <div className="space-y-6 animate-fade-up">
              <div>
                <h2 className="text-lg font-bold mb-3">בחרו את התפקיד שלכם</h2>
                <div className="grid grid-cols-2 gap-2">
                  {roles.map(({ id, label, icon: Icon, desc }) => (
                    <button
                      key={id}
                      onClick={() => setRole(id)}
                      className={cn(
                        "p-3 rounded-2xl border-2 transition-smooth text-center",
                        role === id
                          ? "border-gold bg-gradient-to-b from-gold/10 to-transparent shadow-soft"
                          : "border-border bg-card hover:border-gold/40"
                      )}
                    >
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

              <form onSubmit={handleIdentifySubmit} className="space-y-4">
                <div className="flex gap-2 p-1 bg-muted rounded-2xl">
                  {(["phone", "email"] as const).map((m) => (
                    <button
                      type="button"
                      key={m}
                      onClick={() => setMethod(m)}
                      className={cn(
                        "flex-1 py-2 rounded-xl text-sm font-bold transition-smooth flex items-center justify-center gap-2",
                        method === m ? "bg-card shadow-soft text-primary" : "text-muted-foreground"
                      )}
                    >
                      {m === "phone" ? <Phone className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                      {m === "phone" ? "טלפון" : "אימייל"}
                    </button>
                  ))}
                </div>

                <Input
                  type={method === "phone" ? "tel" : "email"}
                  placeholder={method === "phone" ? "050-0000000" : "name@example.co.il"}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="h-12 rounded-2xl bg-card border-border text-base"
                  dir={method === "phone" ? "ltr" : "rtl"}
                />

                <Button
                  type="submit"
                  className="w-full h-12 rounded-2xl bg-primary hover:bg-primary-soft text-primary-foreground font-bold text-base shadow-card flex items-center justify-center gap-2"
                >
                  המשך
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-background px-3 text-xs text-muted-foreground">או נסו במצב הדגמה</span>
                </div>
              </div>

              <div className="space-y-2">
                {roles.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => handleDemo(id)}
                    className="w-full p-3 rounded-2xl bg-card border border-border hover:border-gold hover:shadow-soft transition-smooth flex items-center gap-3 group"
                  >
                    <div className="h-10 w-10 rounded-xl bg-gradient-gold flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 text-right">
                      <div className="font-bold text-sm">דמו {label}</div>
                      <div className="text-[11px] text-muted-foreground">היכנסו מיד עם נתוני דמו</div>
                    </div>
                    <span className="gb-gold-text font-bold text-sm group-hover:translate-x-[-4px] transition-transform">←</span>
                  </button>
                ))}
              </div>

              <p className="text-center text-[11px] text-muted-foreground pt-2">
                בכניסה אתם מאשרים את <span className="gb-gold-text font-medium">תנאי השימוש</span> ו-<span className="gb-gold-text font-medium">מדיניות הפרטיות</span>
              </p>
            </div>
          ) : (
            <div className="space-y-6 animate-fade-up">
              <button
                type="button"
                onClick={() => setStep("identify")}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-smooth"
              >
                <ArrowRight className="h-3.5 w-3.5" />
                חזרה
              </button>

              <div>
                <h2 className="text-lg font-bold mb-1">
                  {role === "resident" ? "פרטי דייר חדש" : "פרטי ספק חדש"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {role === "resident"
                    ? "כדי לשייך אתכם לפרויקט הנכון ולעדכן אתכם בעסקאות."
                    : "כדי שנציג את העסק שלכם בצורה מקצועית."}
                </p>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold flex items-center gap-1.5">
                    <UserIcon className="h-3.5 w-3.5 gb-gold-text" />
                    שם מלא
                  </Label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="ישראל ישראלי"
                    className="h-12 rounded-2xl bg-card border-border"
                    maxLength={60}
                    required
                  />
                </div>

                {role === "resident" && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 gb-gold-text" />
                        עיר
                      </Label>
                      <Input
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="תל אביב"
                        className="h-12 rounded-2xl bg-card border-border"
                        maxLength={40}
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 gb-gold-text" />
                        אימייל
                      </Label>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.co.il"
                        className="h-12 rounded-2xl bg-card border-border"
                        dir="ltr"
                        maxLength={120}
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 gb-gold-text" />
                        פרויקט (אופציונלי)
                      </Label>
                      <select
                        value={projectId}
                        onChange={(e) => setProjectId(e.target.value)}
                        className="flex h-12 w-full rounded-2xl border border-border bg-card px-3 text-sm"
                      >
                        <option value="">בחרו פרויקט</option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} — {p.city}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {role === "supplier" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5 gb-gold-text" />
                      שם העסק
                    </Label>
                    <Input
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="לדוגמה: מטבחי רויאל"
                      className="h-12 rounded-2xl bg-card border-border"
                      maxLength={80}
                      required
                    />
                  </div>
                )}

                {method === "phone" && role === "resident" ? null : method === "email" ? (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 gb-gold-text" />
                      טלפון (אופציונלי)
                    </Label>
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="050-0000000"
                      className="h-12 rounded-2xl bg-card border-border"
                      dir="ltr"
                      maxLength={20}
                    />
                  </div>
                ) : null}

                <Button
                  type="submit"
                  className="w-full h-12 rounded-2xl bg-primary hover:bg-primary-soft text-primary-foreground font-bold text-base shadow-card mt-2"
                >
                  סיום הרשמה
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
