import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Sparkles, ArrowLeft, Building2, CheckCircle2, Home, Store, LogIn, UserPlus,
  ShieldCheck, Users, TrendingDown, Wallet, Tag as TagIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { isAdminEmail } from "@/lib/auth";
import { describeOffer, type OfferTier, type OfferType } from "@/lib/offerPricing";
import { BrandLogo } from "@/components/BrandLogo";

type HotDeal = {
  id: string;
  title: string;
  supplier_name: string | null;
  offer_type: string | null;
  original_price: number | null;
  discounted_price: number | null;
  discount_percentage: number | null;
  base_price: number | null;
  tiers: OfferTier[] | null;
  paid_count: number;
  next_threshold: number | null;
};

export default function Landing() {
  const navigate = useNavigate();
  const [isAuthed, setIsAuthed] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [userType, setUserType] = useState<"resident" | "supplier">("resident");
  const [hotDeals, setHotDeals] = useState<HotDeal[]>([]);

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

  // Load 3 hot deals only (no system stats)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: deals } = await supabase
          .from("deals")
          .select("id,title,offer_type,original_price,discounted_price,discount_percentage,base_price,tiers,suppliers!inner(business_name,is_active,approval_status)")
          .eq("status", "active")
          .eq("visibility_type", "public")
          .limit(6);

        if (cancelled || !deals) return;

        const visible = deals.filter((d: { suppliers?: { is_active?: boolean; approval_status?: string } | null }) => {
          const s = d.suppliers;
          return s?.is_active === true && (s.approval_status === "approved" || s.approval_status === "active");
        });

        const enriched = await Promise.all(
          visible.slice(0, 3).map(async (d) => {
            const { data: paidCount } = await supabase.rpc("get_deal_paid_count", { _deal_id: String(d.id) });
            const tiers = Array.isArray(d.tiers) ? (d.tiers as OfferTier[]) : [];
            const sortedThresholds = tiers.map((t) => t.minParticipants).sort((a, b) => a - b);
            const next = sortedThresholds.find((m) => m > (paidCount ?? 0)) ?? sortedThresholds[sortedThresholds.length - 1] ?? null;
            return {
              id: String(d.id),
              title: String(d.title ?? ""),
              supplier_name: (d.suppliers as { business_name?: string } | null)?.business_name ?? null,
              offer_type: (d.offer_type as string | null) ?? "percentage",
              original_price: d.original_price as number | null,
              discounted_price: d.discounted_price as number | null,
              discount_percentage: d.discount_percentage as number | null,
              base_price: d.base_price as number | null,
              tiers,
              paid_count: typeof paidCount === "number" ? paidCount : 0,
              next_threshold: next,
            } as HotDeal;
          }),
        );
        if (!cancelled) setHotDeals(enriched);
      } catch (e) {
        console.error("[Landing] deals load failed", e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const goToDashboard = () => {
    if (!isAuthed) { navigate("/auth"); return; }
    if (isAdminEmail(userEmail)) { navigate("/admin"); return; }
    navigate(userType === "supplier" ? "/supplier" : "/resident");
  };

  const goSignup = () => navigate("/auth?mode=signup");
  const goLogin = () => navigate("/auth?mode=signin");

  // Fixed marketing copy — no live stats during launch
  const savingsPrimary = "צפי חיסכון לדייר: ₪500–₪2,500+ לכל מוצר";
  const savingsSecondary = "עד 25% הנחה ברכישה קבוצתית";

  return (
    <div className="min-h-screen bg-primary text-primary-foreground flex justify-center">
      <div className="w-full max-w-[480px] relative">
        {/* Sticky header */}
        <header className="sticky top-0 z-40 bg-primary/95 backdrop-blur">
          <div className="flex items-center justify-between px-5 h-14">
            <Link to="/" className="flex items-center" aria-label="GroupBuild">
              <BrandLogo variant="light" size="sm" />
            </Link>
            <div className="flex items-center gap-2">
              {isAuthed ? (
                <Button
                  type="button"
                  onClick={goToDashboard}
                  className="h-9 px-4 rounded-xl bg-gradient-gold text-primary hover:opacity-90 font-bold text-xs shadow-gold"
                >
                  המשך לדשבורד
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    onClick={goLogin}
                    className="h-9 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-primary-foreground border border-white/25 font-bold text-xs"
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    התחברות
                  </Button>
                  <Button
                    type="button"
                    onClick={goSignup}
                    className="h-9 px-4 rounded-xl bg-gradient-gold text-primary hover:opacity-90 font-bold text-xs shadow-gold"
                  >
                    הרשמה
                  </Button>
                </>
              )}
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

            <h1 className="text-[34px] leading-[1.1] font-extrabold mb-4">
              קונים יחד —
              <br />
              משלמים <span className="gb-gold-text">פחות</span>
            </h1>
            <div className="gb-divider-gold mb-5" />
            <p className="text-primary-foreground/75 text-[15px] leading-relaxed mb-3">
              GroupBuild מחברת דיירים בפרויקטים חדשים לספקים מאומתים, ויוצרת כוח קנייה קבוצתי שמוריד מחירים.
            </p>
            <p className="text-gold/90 text-sm font-bold mb-8">
              {savingsPrimary} · {savingsSecondary}
            </p>

            <div className="flex flex-col gap-3">
              {isAuthed ? (
                <Button
                  onClick={goToDashboard}
                  className="h-13 py-3 rounded-2xl bg-gradient-gold text-primary hover:opacity-90 font-bold shadow-gold flex items-center justify-center gap-2"
                >
                  המשך לדשבורד שלך
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              ) : (
                <>
                  <Button
                    onClick={goSignup}
                    className="h-13 py-3 rounded-2xl bg-gradient-gold text-primary hover:opacity-90 font-bold shadow-gold flex items-center justify-center gap-2"
                  >
                    <UserPlus className="h-4 w-4" />
                    הרשמה
                  </Button>
                  <Button
                    type="button"
                    onClick={goLogin}
                    variant="outline"
                    className="h-12 rounded-2xl bg-white/10 hover:bg-white/20 text-primary-foreground border-2 border-gold/60 font-bold flex items-center justify-center gap-2"
                  >
                    <LogIn className="h-4 w-4" />
                    כבר רשום? התחבר
                  </Button>
                </>
              )}
            </div>
          </div>
        </section>

        {/* MARKETING STATS — fixed selling copy, no live small numbers */}
        <section className="bg-background text-foreground rounded-t-[32px] px-6 pt-8 pb-8 -mt-2 [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground">
          <div className="text-center mb-5">
            <div className="gb-divider-gold mx-auto mb-3" />
            <h2 className="text-xl font-extrabold mb-1">למה כדאי להצטרף</h2>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <StatCard icon={<Users className="h-4 w-4" />} value="מאות" label="דיירים כבר הצטרפו" accent />
            <StatCard icon={<Wallet className="h-4 w-4" />} value="₪500–₪2,500+" label="צפי חיסכון לדייר לכל מוצר" />
            <StatCard icon={<TrendingDown className="h-4 w-4" />} value="עד 25%" label="הנחה ברכישה קבוצתית" />
            <StatCard icon={<Users className="h-4 w-4" />} value="כוח קנייה" label="ככל שיותר דיירים מצטרפים — המחיר יורד" />
            <StatCard icon={<ShieldCheck className="h-4 w-4" />} value="ספקים מאומתים" label="דיירים מתאגדים יחד לקבלת מחירי קבלן" />
          </div>
        </section>

        {/* HOT DEALS */}
        {hotDeals.length > 0 && (
          <section className="bg-background text-foreground px-6 pb-10 [&_h2]:text-foreground [&_h3]:text-foreground">
            <div className="text-center mb-4">
              <h2 className="text-xl font-extrabold mb-1">עסקאות חמות עכשיו</h2>
              <p className="text-xs text-muted-foreground">לחצו לצפייה ולהצטרפות</p>
            </div>
            <div className="space-y-3">
              {hotDeals.map((d) => {
                const display = describeOffer(
                  {
                    offer_type: (d.offer_type ?? "percentage") as OfferType,
                    original_price: d.original_price,
                    discounted_price: d.discounted_price,
                    discount_percentage: d.discount_percentage,
                    base_price: d.base_price,
                    tiers: d.tiers ?? [],
                  },
                  d.paid_count,
                );
                const target = d.next_threshold ?? Math.max(d.paid_count, 1);
                const pct = Math.min(100, Math.round((d.paid_count / Math.max(target, 1)) * 100));
                return (
                  <Link key={d.id} to={`/resident/deals/${d.id}`} className="block">
                    <article className="gb-card p-4 hover:border-gold/40 transition-smooth">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <h3 className="font-bold text-sm text-foreground truncate">{d.title}</h3>
                          {d.supplier_name && (
                            <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1 mt-0.5">
                              <ShieldCheck className="h-3 w-3 text-gold" />
                              {d.supplier_name}
                            </p>
                          )}
                        </div>
                        <div className="text-base font-extrabold text-primary shrink-0">
                          {display.headline}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
                        {d.paid_count === 0 ? (
                          <span className="text-primary font-bold">הצעה חדשה — היה הראשון להצטרף</span>
                        ) : (
                          <span>{d.paid_count} מתוך {target} הצטרפו</span>
                        )}
                        {display.savings && (
                          <span className="text-success font-bold inline-flex items-center gap-1">
                            <TrendingDown className="h-3 w-3" />
                            {display.savings}
                          </span>
                        )}
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden mb-2">
                        <div className="h-full bg-gradient-gold rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="text-[11px] font-bold gb-gold-text text-left">צפה בהצעה ←</div>
                    </article>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* HOW IT WORKS */}
        <section className="bg-background text-foreground px-6 pb-10 [&_h2]:text-foreground [&_h3]:text-foreground">
          <div className="text-center mb-6">
            <div className="gb-divider-gold mx-auto mb-3" />
            <h2 className="text-2xl font-extrabold mb-1">שלושה צעדים פשוטים</h2>
            <p className="text-sm text-muted-foreground">ככה זה עובד אצלנו</p>
          </div>

          <div className="space-y-3">
            {[
              { n: "01", t: "נרשמים לפי פרויקט/אזור", d: "חפשו את שם הבניין או הפרויקט שרכשתם בו דירה והצטרפו לקהילת הדיירים." },
              { n: "02", t: "מצטרפים להצעות רלוונטיות", d: "עיינו בספקים מאומתים לפי קטגוריה ואזור, וראו מחיר נוכחי לפי כמות מצטרפים." },
              { n: "03", t: "ככל שיותר דיירים מצטרפים — המחיר משתפר", d: "כל שכן שמצטרף מוריד את המחיר לכולם. ככל שיותר מצטרפים — כך כולם חוסכים." },
              { n: "04", t: "סגרו עסקה בביטחון", d: "הצטרפות כרוכה בפיקדון אשר יאושר ידנית על ידי מנהל המערכת לפני שהמקום נסגר." },
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

        {/* TRUST */}
        <section className="bg-background text-foreground px-6 pb-10 [&_h2]:text-foreground [&_h3]:text-foreground">
          <div className="gb-card p-5 bg-gradient-card">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-9 w-9 rounded-xl bg-gold/15 flex items-center justify-center">
                <ShieldCheck className="h-4 w-4 text-secondary" />
              </div>
              <h2 className="text-lg font-extrabold">אמון ושקיפות</h2>
            </div>
            <ul className="space-y-2.5">
              {[
                "ספקים מאומתים בלבד",
                "פיקדון מאושר ידנית על ידי מנהל המערכת",
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
            <h2 className="text-2xl font-extrabold mb-2">מוכנים להתחיל לחסוך?</h2>
            <p className="text-sm text-primary-foreground/75 mb-6 max-w-xs mx-auto">
              צרו חשבון בחינם והתחילו לראות עסקאות באזור שלכם תוך דקה.
            </p>
            <div className="flex flex-col gap-3 max-w-xs mx-auto">
              <Button
                onClick={isAuthed ? goToDashboard : goSignup}
                className="h-12 px-8 rounded-2xl bg-gradient-gold text-primary hover:opacity-90 font-bold shadow-gold inline-flex items-center justify-center gap-2"
              >
                {isAuthed ? "המשך לדשבורד" : "הרשמה"}
                <ArrowLeft className="h-4 w-4" />
              </Button>
              {!isAuthed && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={goLogin}
                  className="h-12 rounded-2xl bg-transparent border-2 border-gold/60 text-primary-foreground hover:bg-white/10 font-bold inline-flex items-center justify-center gap-2"
                >
                  <LogIn className="h-4 w-4" />
                  כבר רשום? התחבר
                </Button>
              )}
            </div>
          </div>
        </section>

        <footer className="bg-primary text-primary-foreground/60 px-6 py-6 text-center text-[11px] border-t border-white/5">
          © {new Date().getFullYear()} GroupBuild · רכש קבוצתי לדיירי בנייה חדשה
        </footer>
      </div>
    </div>
  );
}

function StatCard({ icon, value, label, accent }: { icon: React.ReactNode; value: string; label: string; accent?: boolean }) {
  return (
    <div className={"gb-card p-4 text-center " + (accent ? "bg-gradient-card" : "")}>
      <div className="h-8 w-8 rounded-xl bg-gold/15 mx-auto flex items-center justify-center text-secondary mb-2">
        {icon}
      </div>
      <div className={"text-lg font-extrabold mb-0.5 " + (accent ? "gb-gold-text" : "text-foreground")}>{value}</div>
      <div className="text-[11px] text-muted-foreground leading-tight">{label}</div>
    </div>
  );
}
