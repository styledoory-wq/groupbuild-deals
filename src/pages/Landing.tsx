import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles, ArrowLeft, Building2, Briefcase, Users, TrendingDown,
  ShieldCheck, MapPin, Phone, User as UserIcon, CheckCircle2, Layers,
  Handshake, BarChart3, Home, Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { isAdminEmail } from "@/lib/auth";
import { toast } from "sonner";

type LeadType = "resident" | "supplier";
type Region = { id: string; name_he: string };
type City = { id: string; name_he: string; region_id: string };

export default function Landing() {
  const navigate = useNavigate();
  const formRef = useRef<HTMLDivElement>(null);
  const [isAuthed, setIsAuthed] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [userType, setUserType] = useState<"resident" | "supplier">("resident");

  // Detect session WITHOUT auto-redirecting. Landing always renders.
  useEffect(() => {
    let cancelled = false;
    const load = async (session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]) => {
      if (cancelled) return;
      if (!session) {
        setIsAuthed(false);
        setUserEmail("");
        return;
      }
      setIsAuthed(true);
      setUserEmail(session.user.email ?? "");
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_type")
        .eq("id", session.user.id)
        .maybeSingle();
      if (cancelled) return;
      setUserType((profile?.user_type as "resident" | "supplier") ?? "resident");
    };
    supabase.auth.getSession().then(({ data: { session } }) => load(session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => load(session));
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const goToDashboard = () => {
    if (!isAuthed) {
      navigate("/auth");
      return;
    }
    if (isAdminEmail(userEmail)) {
      navigate("/admin");
      return;
    }
    navigate(userType === "supplier" ? "/supplier" : "/resident");
  };

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Waitlist form
  const [leadType, setLeadType] = useState<LeadType>("resident");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [regionId, setRegionId] = useState("");
  const [cityId, setCityId] = useState("");
  const [projectName, setProjectName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [supplierRegionId, setSupplierRegionId] = useState("");
  const [category, setCategory] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Real regions & cities from DB
  const [regions, setRegions] = useState<Region[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  useEffect(() => {
    (async () => {
      const [r, c] = await Promise.all([
        supabase.from("regions").select("id,name_he").order("display_order"),
        supabase.from("cities").select("id,name_he,region_id").order("name_he"),
      ]);
      if (r.data) setRegions(r.data as Region[]);
      if (c.data) setCities(c.data as City[]);
    })();
  }, []);

  const filteredCities = regionId
    ? cities.filter((c) => c.region_id === regionId)
    : [];

  const submitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      toast.error("נא למלא שם וטלפון");
      return;
    }
    if (leadType === "resident" && (!regionId || !cityId)) {
      toast.error("נא לבחור אזור ועיר מהרשימה");
      return;
    }
    if (leadType === "supplier" && !supplierRegionId) {
      toast.error("נא לבחור אזור שירות מהרשימה");
      return;
    }

    // Resolve names from selected IDs (only real values can be saved)
    const selectedRegion = regions.find((r) => r.id === regionId);
    const selectedCity = cities.find((c) => c.id === cityId);
    const selectedSupplierRegion = regions.find((r) => r.id === supplierRegionId);

    setSubmitting(true);
    try {
      const { error } = await supabase.from("waitlist_leads").insert({
        lead_type: leadType,
        full_name: fullName.trim(),
        phone: phone.trim(),
        city: leadType === "resident" ? selectedCity?.name_he ?? null : null,
        project_name: leadType === "resident" ? projectName.trim() || null : null,
        business_name: leadType === "supplier" ? businessName.trim() || null : null,
        service_areas: leadType === "supplier" ? selectedSupplierRegion?.name_he ?? null : null,
        category: leadType === "supplier" ? category.trim() || null : null,
      });
      if (error) throw error;
      // Notify admin (best effort, don't block on failure)
      supabase.functions.invoke("notify-admin", {
        body: {
          event: "waitlist_lead",
          title: leadType === "resident" ? "דייר חדש ברשימת המתנה" : "ספק חדש ברשימת המתנה",
          details: {
            full_name: fullName.trim(),
            phone: phone.trim(),
            lead_type: leadType,
            city: selectedCity?.name_he,
            region: selectedRegion?.name_he,
            business_name: businessName,
            category,
          },
        },
      }).catch(() => { /* ignore */ });
      setFullName(""); setPhone(""); setRegionId(""); setCityId(""); setProjectName("");
      setBusinessName(""); setSupplierRegionId(""); setCategory("");
      navigate("/thank-you");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שליחה נכשלה, נסו שוב");
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <div className="min-h-screen bg-primary text-primary-foreground flex justify-center">
      <div className="w-full max-w-[480px] relative">
        {/* Sticky header */}
        <header className="sticky top-0 z-40 bg-primary/95 backdrop-blur border-b border-white/5">
          <div className="flex items-center justify-between px-5 h-14">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-gradient-gold flex items-center justify-center">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              <span className="font-extrabold text-base">
                <span className="gb-gold-text">Group</span>Build
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={goToDashboard}
                variant="ghost"
                className="h-9 px-3 rounded-xl text-primary-foreground hover:text-gold hover:bg-white/5 font-bold text-xs"
              >
                {isAuthed ? "המשך לדשבורד" : "כניסה לחשבון"}
              </Button>
              <Button
                type="button"
                onClick={scrollToForm}
                className="h-9 px-4 rounded-xl bg-gradient-gold text-primary hover:opacity-90 font-bold text-xs shadow-gold"
              >
                הצטרף לרשימה
              </Button>
            </div>
          </div>
        </header>

        {/* HERO */}
        <section className="relative px-6 pt-10 pb-12 overflow-hidden">
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-gold/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-gold/5 blur-3xl pointer-events-none" />

          <div className="relative animate-fade-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/8 border border-white/12 mb-6">
              <Sparkles className="h-3.5 w-3.5 text-gold" />
              <span className="text-xs font-medium text-primary-foreground/90">
                מצטרפים לפרויקטים בכל הארץ
              </span>
            </div>

            <h1 className="text-[34px] leading-[1.15] font-extrabold mb-4">
              קנה את הדירה שלך
              <br />
              במחיר{" "}
              <span className="gb-gold-text">קבוצתי</span>
            </h1>
            <div className="gb-divider-gold mb-5" />
            <p className="text-primary-foreground/75 text-[15px] leading-relaxed mb-8">
              פלטפורמת רכישה קבוצתית לדיירי פרויקטים חדשים. הצטרף לשכנים שלך,
              אסוף כוח קנייה — וקבל מחירים שאי אפשר לקבל לבד.
            </p>

            <div className="flex flex-col gap-3">
              <Button
                onClick={scrollToForm}
                className="h-13 py-3 rounded-2xl bg-gradient-gold text-primary hover:opacity-90 font-bold shadow-gold flex items-center justify-center gap-2"
              >
                הצטרף לרשימה
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <button
                type="button"
                onClick={goToDashboard}
                className="text-xs text-primary-foreground/70 hover:text-gold underline-offset-4 hover:underline transition-smooth"
              >
                {isAuthed ? "המשך לדשבורד שלך ←" : "כבר יש לך חשבון? התחבר"}
              </button>
            </div>
          </div>
        </section>

        {/* WAITLIST FORM */}
        <section
          ref={formRef}
          className="bg-background text-foreground rounded-t-[32px] px-6 pt-8 pb-10 -mt-2 relative [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground"
        >
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold/15 text-foreground mb-3">
              <Sparkles className="h-3 w-3 text-secondary" />
              <span className="text-[11px] font-bold">הרשמה מהירה</span>
            </div>
            <h2 className="text-2xl font-extrabold mb-2">שמור לי מקום ברשימה</h2>
            <p className="text-sm text-muted-foreground">
              ללא עלות. ללא התחייבות. תקבל עדכון ראשון.
            </p>
          </div>

          {/* Lead type toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-2xl mb-5">
            {([
              { id: "resident" as const, label: "אני דייר", icon: Home },
              { id: "supplier" as const, label: "אני ספק", icon: Store },
            ]).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setLeadType(id)}
                className={cn(
                  "flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-smooth",
                  leadType === id
                    ? "bg-card shadow-soft text-primary"
                    : "text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={submitLead} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold flex items-center gap-1.5">
                <UserIcon className="h-3.5 w-3.5 gb-gold-text" /> שם מלא
              </Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="ישראל ישראלי"
                required
                className="h-12 rounded-2xl bg-card border-border"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 gb-gold-text" /> מספר טלפון
              </Label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="050-0000000"
                dir="ltr"
                required
                className="h-12 rounded-2xl bg-card border-border"
              />
            </div>

            {leadType === "resident" ? (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 gb-gold-text" /> אזור
                  </Label>
                  <select
                    value={regionId}
                    onChange={(e) => { setRegionId(e.target.value); setCityId(""); }}
                    className="h-12 w-full rounded-2xl bg-card border border-border px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold"
                  >
                    <option value="">בחר אזור</option>
                    {regions.map((r) => (
                      <option key={r.id} value={r.id}>{r.name_he}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 gb-gold-text" /> עיר / יישוב
                  </Label>
                  <select
                    value={cityId}
                    onChange={(e) => setCityId(e.target.value)}
                    disabled={!regionId}
                    className="h-12 w-full rounded-2xl bg-card border border-border px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold disabled:opacity-50"
                  >
                    <option value="">{regionId ? "בחר עיר" : "בחר אזור קודם"}</option>
                    {filteredCities.map((c) => (
                      <option key={c.id} value={c.id}>{c.name_he}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 gb-gold-text" /> שם הפרויקט / הבניין
                  </Label>
                  <Input
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="לדוגמה: מגדלי הים"
                    className="h-12 rounded-2xl bg-card border-border"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5 gb-gold-text" /> שם העסק
                  </Label>
                  <Input
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="לדוגמה: מטבחי רויאל"
                    className="h-12 rounded-2xl bg-card border-border"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 gb-gold-text" /> אזור שירות
                  </Label>
                  <select
                    value={supplierRegionId}
                    onChange={(e) => setSupplierRegionId(e.target.value)}
                    className="h-12 w-full rounded-2xl bg-card border border-border px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold"
                  >
                    <option value="">בחר אזור שירות</option>
                    {regions.map((r) => (
                      <option key={r.id} value={r.id}>{r.name_he}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 gb-gold-text" /> קטגוריית שירות
                  </Label>
                  <Input
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="מטבחים / מזגנים / פרקטים…"
                    className="h-12 rounded-2xl bg-card border-border"
                  />
                </div>
              </>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-13 py-3 rounded-2xl bg-gradient-gold text-primary hover:opacity-90 font-bold shadow-gold flex items-center justify-center gap-2"
            >
              {submitting ? "שולח…" : "שמור לי מקום ברשימה"}
              <ArrowLeft className="h-4 w-4" />
            </Button>

            <p className="text-center text-[11px] text-muted-foreground">
              אין עלות · ללא התחייבות · תקבל עדכון ראשון
            </p>

            <div className="pt-3 border-t border-border space-y-2 text-center">
              <button
                type="button"
                onClick={() => navigate("/auth")}
                className="block w-full text-sm font-bold text-primary hover:gb-gold-text transition-smooth"
              >
                צור חשבון מלא ←
              </button>
              <button
                type="button"
                onClick={() => navigate("/auth")}
                className="block w-full text-xs text-muted-foreground hover:text-primary transition-smooth"
              >
                כבר יש לך חשבון? התחבר
              </button>
            </div>
          </form>
        </section>

        {/* STATS */}
        <section className="bg-background text-foreground px-6 pb-10">
          <div className="grid grid-cols-2 gap-3">
            {[
              { v: "+240", l: "דירות בפרויקט הדגמה" },
              { v: "₪34K", l: "חיסכון ממוצע לדירה" },
              { v: "+5", l: "קטגוריות פעילות" },
              { v: "29%", l: "הנחה קבוצתית ממוצעת" },
            ].map((s, i) => (
              <div
                key={i}
                className="gb-card p-4 text-center"
              >
                <div className="text-xl font-extrabold gb-gold-text mb-1">{s.v}</div>
                <div className="text-[11px] text-muted-foreground leading-tight">{s.l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="bg-background text-foreground px-6 pb-10 [&_h2]:text-foreground [&_h3]:text-foreground">
          <div className="text-center mb-6">
            <div className="gb-divider-gold mx-auto mb-3" />
            <h2 className="text-2xl font-extrabold mb-1">שלושה צעדים פשוטים</h2>
            <p className="text-sm text-muted-foreground">ככה זה עובד אצלנו</p>
          </div>

          <div className="space-y-3">
            {[
              {
                n: "01",
                t: "הצטרף לפרויקט שלך",
                d: "חפש את שם הבניין או הפרויקט שרכשת בו דירה והצטרף לקהילת הדיירים.",
              },
              {
                n: "02",
                t: "בחר ספקים ועסקאות",
                d: "עיין בספקים מאומתים לפי קטגוריה ואזור, ראה מחיר נוכחי לפי כמות — והצטרף לעסקה.",
              },
              {
                n: "03",
                t: "המחיר יורד אוטומטית",
                d: "כל שכן שמצטרף מוריד את המחיר לכולם. ככל שיותר מצטרפים — כך כולם חוסכים.",
              },
              {
                n: "04",
                t: "סגור עסקה בביטחון",
                d: "שוחח עם הספק, עקוב אחרי ההתקדמות, ושלם פיקדון מאובטח כשמערכת התשלומים פעילה.",
              },
            ].map((step) => (
              <div key={step.n} className="gb-card p-4 flex gap-3">
                <div className="shrink-0 h-10 w-10 rounded-xl bg-primary text-gold flex items-center justify-center font-extrabold text-sm">
                  {step.n}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm mb-1">{step.t}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{step.d}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* RESIDENTS BENEFITS */}
        <section className="bg-background text-foreground px-6 pb-10 [&_h2]:text-foreground [&_h3]:text-foreground">
          <div className="gb-card p-5 bg-gradient-card">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-9 w-9 rounded-xl bg-gold/15 flex items-center justify-center">
                <Home className="h-4 w-4 text-secondary" />
              </div>
              <h2 className="text-lg font-extrabold">למה זה משתלם לדיירים?</h2>
            </div>
            <ul className="space-y-2.5">
              {[
                "כוח קנייה של כל הבניין",
                "ספקים לפי אזור מגורים",
                "מחירים שמתעדכנים לפי מצטרפים אמיתיים",
                "פחות כאב ראש מול ספקים",
                "שקיפות במחיר ובמדרגות ההנחה",
              ].map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
                  <span className="text-foreground/85">{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* SUPPLIERS BENEFITS */}
        <section className="bg-background text-foreground px-6 pb-12 [&_h2]:text-foreground [&_h3]:text-foreground">
          <div className="gb-card p-5 bg-gradient-card">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-9 w-9 rounded-xl bg-gold/15 flex items-center justify-center">
                <Store className="h-4 w-4 text-secondary" />
              </div>
              <h2 className="text-lg font-extrabold">למה ספקים ירצו להצטרף?</h2>
            </div>
            <ul className="space-y-2.5">
              {[
                "לידים איכותיים מפרויקטים חדשים",
                "לקוחות לפי אזור שירות",
                "עסקאות בכמות במקום לקוח בודד",
                "ניהול הצעות ומבצעים ממקום אחד",
                "חשיפה לקהילות דיירים רלוונטיות",
              ].map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
                  <span className="text-foreground/85">{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="bg-gradient-hero text-primary-foreground px-6 py-12 text-center relative overflow-hidden">
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 h-64 w-64 rounded-full bg-gold/10 blur-3xl pointer-events-none" />
          <div className="relative">
            <div className="gb-divider-gold mx-auto mb-4" />
            <h2 className="text-2xl font-extrabold mb-2">מוכן להתחיל לחסוך?</h2>
            <p className="text-sm text-primary-foreground/75 mb-6 max-w-xs mx-auto">
              הצטרף עכשיו לרשימת הממתינים — נחזור אליך עם פרטי הפרויקט שלך.
            </p>
            <Button
              onClick={scrollToForm}
              className="h-12 px-8 rounded-2xl bg-gradient-gold text-primary hover:opacity-90 font-bold shadow-gold inline-flex items-center gap-2"
            >
              הצטרף עכשיו
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
        </section>

        <footer className="bg-primary text-primary-foreground/60 px-6 py-6 text-center text-[11px] border-t border-white/5">
          © {new Date().getFullYear()} GroupBuild · רכש קבוצתי לדיירי בנייה חדשה
        </footer>
      </div>
    </div>
  );
}
