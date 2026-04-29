import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, TrendingUp, Users, DollarSign, Plus, LogOut, Pencil, Clock, AlertCircle, type LucideIcon } from "lucide-react";
import { SupplierRatingBadge } from "@/components/reviews/SupplierRatingBadge";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { formatILS, getActiveTier, useApp } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type DbSupplier = {
  id: string;
  business_name: string;
  approval_status: string;
  is_active: boolean;
  user_id?: string | null;
  email?: string | null;
};

export default function SupplierDashboard() {
  const navigate = useNavigate();
  const { user, deals, logout } = useApp();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dbSupplier, setDbSupplier] = useState<DbSupplier | null>(null);

  useEffect(() => {
    let cancelled = false;
    const safety = window.setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 8000);

    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData.session;
        if (!session) {
          if (!cancelled) {
            setLoading(false);
            navigate("/auth", { replace: true });
          }
          return;
        }

        const email = session.user.email ?? "";

        // Try to find existing supplier records for this user.
        // If an admin created/approved a supplier before signup, it may match by email only.
        const byUser = await supabase
          .from("suppliers")
          .select("id, business_name, approval_status, is_active, user_id, email")
          .eq("user_id", session.user.id)
          .order("updated_at", { ascending: false });

        const byEmail = email
          ? await supabase
            .from("suppliers")
            .select("id, business_name, approval_status, is_active, user_id, email")
            .ilike("email", email)
            .order("updated_at", { ascending: false })
          : { data: [], error: null };

        const fetchErr = byUser.error ?? byEmail.error;
        const candidates = [...(byUser.data ?? []), ...(byEmail.data ?? [])];
        const existing = candidates.find((s) => ["approved", "active"].includes(s.approval_status)) ?? candidates[0] ?? null;

        if (fetchErr) throw fetchErr;

        if (existing) {
          if (!existing.user_id || !existing.email) {
            await supabase
              .from("suppliers")
              .update({ user_id: session.user.id, email: email || existing.email })
              .eq("id", existing.id);
          }
          if (!cancelled) setDbSupplier(existing as DbSupplier);
        } else {
          // Auto-create a pending supplier so the dashboard never breaks
          const meta = (session.user.user_metadata ?? {}) as Record<string, string>;
          const businessName =
            meta.business_name?.trim() ||
            meta.full_name?.trim() ||
            session.user.email ||
            "ספק חדש";

          const { data: created, error: insertErr } = await supabase
            .from("suppliers")
            .insert({
              user_id: session.user.id,
              business_name: businessName,
              contact_name: meta.full_name ?? null,
              email: session.user.email ?? null,
              phone: meta.phone ?? null,
              approval_status: "pending",
              is_active: true,
            })
            .select("id, business_name, approval_status, is_active")
            .maybeSingle();

          if (insertErr) throw insertErr;
          if (!cancelled && created) setDbSupplier(created as DbSupplier);
        }
      } catch (e) {
        console.error("[SupplierDashboard] load error", e);
        if (!cancelled) setError(e instanceof Error ? e.message : "שגיאה בטעינת פרופיל הספק");
      } finally {
        if (!cancelled) setLoading(false);
        window.clearTimeout(safety);
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(safety);
    };
  }, [navigate]);

  const handleLogout = async () => {
    try { await supabase.auth.signOut(); } catch (e) { console.warn(e); }
    logout();
    toast.success("התנתקת בהצלחה");
    navigate("/", { replace: true });
  };

  if (loading) {
    return (
      <MobileShell>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <div className="h-10 w-10 mx-auto rounded-full border-2 border-primary border-t-transparent animate-spin mb-3" />
            <div className="text-sm text-muted-foreground">טוען את החשבון…</div>
          </div>
        </div>
      </MobileShell>
    );
  }

  if (error) {
    return (
      <MobileShell>
        <div className="min-h-[60vh] flex items-center justify-center px-6">
          <div className="text-center max-w-sm">
            <div className="h-12 w-12 mx-auto rounded-full bg-destructive/10 flex items-center justify-center mb-3">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <h2 className="font-bold text-base mb-2">שגיאה בטעינה</h2>
            <p className="text-sm text-muted-foreground mb-5">{error}</p>
            <Button onClick={handleLogout} variant="outline" className="w-full rounded-2xl">
              חזרה למסך התחברות
            </Button>
          </div>
        </div>
      </MobileShell>
    );
  }

  const isPending = dbSupplier?.approval_status === "pending";
  const isRejected = dbSupplier?.approval_status === "rejected";
  const businessName = dbSupplier?.business_name || user?.name || "החשבון שלי";

  // Pending / rejected — show clear state, do NOT render mock-dependent dashboard
  if (!dbSupplier || isPending || isRejected) {
    return (
      <MobileShell>
        <header className="bg-gradient-hero text-primary-foreground px-5 pt-9 pb-10 rounded-b-[24px] relative overflow-hidden">
          <div className="flex items-center justify-between mb-6 relative">
            <div>
              <p className="text-primary-foreground/55 text-[11px] uppercase tracking-wider">איזור ספק</p>
              <h1 className="text-[22px] font-semibold mt-1 tracking-tight">{businessName}</h1>
            </div>
            <button
              onClick={handleLogout}
              className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 flex items-center justify-center transition-smooth"
              aria-label="יציאה"
            >
              <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </button>
          </div>
        </header>

        <div className="px-5 -mt-6 relative z-10">
          <div className="gb-card p-6 text-center">
            <div className="h-14 w-14 mx-auto rounded-full bg-gold/15 flex items-center justify-center mb-4">
              <Clock className="h-7 w-7 text-gold" strokeWidth={1.75} />
            </div>
            <h2 className="font-bold text-base mb-2">
              {isRejected ? "ההרשמה נדחתה" : "ההרשמה התקבלה וממתינה לאישור"}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-5">
              {isRejected
                ? "לצערנו ההרשמה לא אושרה כרגע. ניתן לפנות לתמיכה לפרטים נוספים."
                : "החשבון שלך ממתין לאישור מנהל. נעדכן אותך לאחר האישור ותוכל להתחיל לפרסם הצעות."}
            </p>
            <Button
              onClick={() => navigate("/supplier/profile/edit")}
              variant="outline"
              className="w-full h-11 rounded-xl border-border"
            >
              <Pencil className="h-4 w-4 ml-2" /> השלמת פרטי הספק
            </Button>
          </div>
        </div>

        <BottomNav role="supplier" />
      </MobileShell>
    );
  }

  // Approved — render the rich dashboard. Guard against missing mock data.
  const myDeals = deals.filter((d) => d.supplierId === dbSupplier.id);
  const totalLeads = myDeals.reduce((s, d) => s + d.joinedParticipants, 0);
  const totalPaid = myDeals.reduce((s, d) => s + d.paidParticipants, 0);
  const revenue = myDeals.reduce((s, d) => s + d.paidParticipants * getActiveTier(d).price, 0);
  const conversion = totalLeads ? Math.round((totalPaid / totalLeads) * 100) : 0;

  return (
    <MobileShell>
      <header className="bg-gradient-hero text-primary-foreground px-5 pt-9 pb-14 rounded-b-[24px] relative overflow-hidden">
        <div className="flex items-center justify-between mb-7 relative">
          <div>
            <p className="text-primary-foreground/55 text-[11px] uppercase tracking-wider">איזור ספק</p>
            <h1 className="text-[24px] font-semibold mt-1 tracking-tight">{businessName}</h1>
            <div className="mt-2">
              <SupplierRatingBadge supplierId={dbSupplier.id} className="text-[11px] gb-gold-text" />
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 flex items-center justify-center transition-smooth"
            aria-label="יציאה"
          >
            <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 relative">
          <Stat icon={Users} label="לידים" value={totalLeads.toString()} />
          <Stat icon={TrendingUp} label="המרה" value={`${conversion}%`} />
          <Stat icon={Briefcase} label="עסקאות פעילות" value={myDeals.length.toString()} />
          <Stat icon={DollarSign} label="הכנסה" value={formatILS(revenue)} small />
        </div>
      </header>

      <div className="px-5 -mt-8 relative z-10 mb-6 space-y-2">
        <Button
          onClick={() => navigate("/supplier/offers/new")}
          className="w-full h-12 rounded-xl bg-primary hover:bg-primary-soft text-primary-foreground font-semibold shadow-soft"
        >
          <Plus className="h-4 w-4 ml-2" strokeWidth={2} /> צרו הצעה חדשה
        </Button>
        <Button
          onClick={() => navigate("/supplier/profile/edit")}
          variant="outline"
          className="w-full h-11 rounded-xl border-border"
        >
          <Pencil className="h-4 w-4 ml-2" /> עריכת פרופיל ואזורי שירות
        </Button>
      </div>

      <section className="px-5 space-y-3">
        <h2 className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-1 px-1">
          <Briefcase className="h-3 w-3 text-gold" strokeWidth={1.75} /> ההצעות שלי
        </h2>
        {myDeals.length === 0 && (
          <div className="gb-card p-5 text-center text-sm text-muted-foreground">
            עדיין לא יצרת הצעות. לחץ "צרו הצעה חדשה" כדי להתחיל.
          </div>
        )}
        {myDeals.map((d) => {
          const tier = getActiveTier(d);
          return (
            <div key={d.id} className="gb-card p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">{d.title}</h3>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{tier.label}</div>
                </div>
                <div className="text-left">
                  <div className="font-semibold text-primary text-sm">{formatILS(tier.price)}</div>
                  <div className="text-[10px] text-success font-medium mt-0.5">{d.paidParticipants} שילמו</div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[11px] pt-3 border-t border-border">
                <span className="px-2.5 py-1 rounded-full bg-muted/60 text-foreground border border-border">{d.joinedParticipants} לידים</span>
                <span className="px-2.5 py-1 rounded-full bg-success/10 text-success">{d.paidParticipants} פיקדונות</span>
              </div>
            </div>
          );
        })}
      </section>

      <BottomNav role="supplier" />
    </MobileShell>
  );
}

function Stat({ icon: Icon, label, value, small }: { icon: LucideIcon; label: string; value: string; small?: boolean }) {
  return (
    <div className="bg-white/[0.06] backdrop-blur border border-white/10 rounded-xl p-3.5">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className="h-3.5 w-3.5 text-gold" strokeWidth={1.75} />
        <span className="text-[10px] text-primary-foreground/60 uppercase tracking-wider">{label}</span>
      </div>
      <div className={small ? "text-base font-semibold" : "text-xl font-semibold tracking-tight"}>{value}</div>
    </div>
  );
}
