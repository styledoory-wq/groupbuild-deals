import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, TrendingUp, Users, DollarSign, Plus, LogOut, Pencil, Clock, AlertCircle, type LucideIcon } from "lucide-react";
import { SupplierRatingBadge } from "@/components/reviews/SupplierRatingBadge";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { formatILS, useApp } from "@/store/AppStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getFriendlyLoadError } from "@/lib/safeAsync";
import { resolveSupplierForUser } from "@/lib/supplierAuth";

type DbSupplier = {
  id: string;
  business_name: string;
  approval_status: string;
  is_active: boolean;
  user_id?: string | null;
  email?: string | null;
};

type DbDeal = {
  id: string;
  title: string;
  status: string;
  original_price: number | null;
  discounted_price: number | null;
  discount_percentage: number | null;
  base_price: number | null;
  offer_type: string | null;
};

export default function SupplierDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useApp();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dbSupplier, setDbSupplier] = useState<DbSupplier | null>(null);
  const [myDeals, setMyDeals] = useState<DbDeal[]>([]);
  const [counts, setCounts] = useState<Record<string, { interests: number; paid: number }>>({});

  useEffect(() => {
    let cancelled = false;
    const safety = window.setTimeout(() => { if (!cancelled) setLoading(false); }, 8000);

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
        let supplierRow = await resolveSupplierForUser<DbSupplier>(
          session.user.id,
          email,
          "id, business_name, approval_status, is_active, user_id, email",
        );
        if (!supplierRow) {
          const meta = (session.user.user_metadata ?? {}) as Record<string, string>;
          const businessName = meta.business_name?.trim() || meta.full_name?.trim() || session.user.email || "ספק חדש";
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
            .select("id, business_name, approval_status, is_active, user_id, email")
            .maybeSingle();
          if (insertErr) throw insertErr;
          supplierRow = created as DbSupplier;
        }

        if (cancelled) return;
        setDbSupplier(supplierRow);

        if (supplierRow?.id && (supplierRow.approval_status === "approved" || supplierRow.approval_status === "active")) {
          const { data: dealRows, error: dealsErr } = await supabase
            .from("deals")
            .select("id,title,status,original_price,discounted_price,discount_percentage,base_price,offer_type")
            .eq("supplier_id", supplierRow.id)
            .eq("is_deleted", false)
            .order("created_at", { ascending: false });
          if (dealsErr) throw dealsErr;
          const list = (dealRows ?? []) as DbDeal[];
          if (cancelled) return;
          setMyDeals(list);

          const cMap: Record<string, { interests: number; paid: number }> = {};
          await Promise.all(list.map(async (d) => {
            const [{ count: interests }, { count: paid }] = await Promise.all([
              supabase.from("deal_interests").select("id", { count: "exact", head: true }).eq("deal_id", d.id).eq("is_deleted", false),
              supabase.from("deposits").select("id", { count: "exact", head: true }).eq("deal_id", d.id).eq("status", "paid").eq("is_deleted", false),
            ]);
            cMap[d.id] = { interests: interests ?? 0, paid: paid ?? 0 };
          }));
          if (!cancelled) setCounts(cMap);
        }
      } catch (e) {
        console.error("[SupplierDashboard] load error", e);
        if (!cancelled) setError(getFriendlyLoadError(e, "שגיאה בטעינת פרופיל הספק"));
      } finally {
        if (!cancelled) setLoading(false);
        window.clearTimeout(safety);
      }
    })();

    return () => { cancelled = true; window.clearTimeout(safety); };
  }, [navigate]);

  const handleLogout = async () => {
    try { await supabase.auth.signOut(); } catch (e) { console.warn(e); }
    logout();
    toast.success("התנתקת בהצלחה");
    navigate("/", { replace: true });
  };

  const priceFor = (d: DbDeal): number => {
    if (d.offer_type === "price_comparison" && d.discounted_price != null) return Number(d.discounted_price);
    if (d.offer_type === "percentage" && d.original_price != null && d.discount_percentage != null) {
      return Number(d.original_price) * (1 - Number(d.discount_percentage) / 100);
    }
    return Number(d.base_price ?? d.original_price ?? 0);
  };

  if (loading) {
    return (
      <MobileShell>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <div className="h-10 w-10 mx-auto rounded-full border-2 border-[#1F2937] border-t-transparent animate-spin mb-3" />
            <div className="text-sm text-[#6B7280]">טוען את החשבון…</div>
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
            <p className="text-sm text-[#6B7280] mb-5">{error}</p>
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

  const HeroBar = () => (
    <header className="px-5 pt-4 pb-3">
      <div className="flex items-center justify-between mb-3">
        <span className="h-8 px-3 rounded-full bg-white flex items-center text-[#1F2937] text-[11px] font-bold uppercase tracking-[0.14em] shadow-[0_2px_8px_-2px_rgba(10,31,61,0.06)]">
          אזור ספק
        </span>
        <button
          onClick={handleLogout}
          className="h-9 px-3 rounded-full bg-white flex items-center gap-1.5 text-[#DC2626] text-[13px] font-bold shadow-[0_2px_8px_-2px_rgba(10,31,61,0.06)] active:scale-95 transition-transform"
          aria-label="יציאה"
        >
          <LogOut className="h-4 w-4" strokeWidth={2} />
          <span>התנתקות</span>
        </button>
      </div>
      <div className="text-right">
        <h1 className="text-[24px] font-extrabold text-[#1F2937] leading-tight tracking-tight break-words">
          {businessName}
        </h1>
        {dbSupplier && !isPending && !isRejected && (
          <div className="mt-1.5">
            <SupplierRatingBadge supplierId={dbSupplier.id} className="text-[12px] text-[#0E6B5A]" />
          </div>
        )}
      </div>
    </header>
  );

  if (!dbSupplier || isPending || isRejected) {
    return (
      <MobileShell>
        <HeroBar />
        <div className="px-5 mt-5">
          <div className="bg-white rounded-[24px] p-6 border border-[#ECEEF2] shadow-[0_4px_12px_rgba(0,0,0,0.10),0_1px_3px_rgba(0,0,0,0.06)] text-center">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-white flex items-center justify-center mb-4 shadow-[0_4px_12px_rgba(0,0,0,0.10),0_1px_3px_rgba(0,0,0,0.06)]">
              <Clock className="h-6 w-6 text-[#0E6B5A]" strokeWidth={2} />
            </div>
            <h2 className="font-extrabold text-[#1F2937] text-base mb-2">
              {isRejected ? "ההרשמה נדחתה" : "ההרשמה התקבלה וממתינה לאישור"}
            </h2>
            <p className="text-sm text-[#6B7280] leading-relaxed mb-5">
              {isRejected
                ? "לצערנו ההרשמה לא אושרה כרגע. ניתן לפנות לתמיכה לפרטים נוספים."
                : "החשבון שלך ממתין לאישור מנהל. נעדכן אותך לאחר האישור ותוכל להתחיל לפרסם הצעות."}
            </p>
            <Button onClick={() => navigate("/supplier/profile/edit")} className="w-full h-11 rounded-2xl">
              <Pencil className="h-4 w-4 ml-2" /> השלמת פרטי הספק
            </Button>
          </div>
        </div>
        <BottomNav role="supplier" />
      </MobileShell>
    );
  }

  const totalLeads = Object.values(counts).reduce((s, c) => s + c.interests, 0);
  const totalPaid = Object.values(counts).reduce((s, c) => s + c.paid, 0);
  const revenue = myDeals.reduce((s, d) => s + (counts[d.id]?.paid ?? 0) * priceFor(d), 0);
  const conversion = totalLeads ? Math.round((totalPaid / totalLeads) * 100) : 0;

  return (
    <MobileShell>
      <div className="w-full overflow-x-hidden">
        <HeroBar />

        <div className="px-5 mt-4 grid grid-cols-2 gap-3 w-full">
          <Stat icon={Users} label="לידים" value={totalLeads.toString()} />
          <Stat icon={TrendingUp} label="המרה" value={`${conversion}%`} />
          <Stat icon={Briefcase} label="עסקאות פעילות" value={myDeals.length.toString()} />
          <Stat icon={DollarSign} label="הכנסה" value={formatILS(revenue)} small />
        </div>

        <div className="px-5 mt-5 mb-6 space-y-2.5 w-full">
          <Button onClick={() => navigate("/supplier/offers/new")} className="w-full h-12 rounded-2xl font-semibold">
            <Plus className="h-4 w-4 ml-2" strokeWidth={2} /> צרו הצעה חדשה
          </Button>
          <Button onClick={() => navigate("/supplier/profile/edit")} variant="outline" className="w-full h-11 rounded-2xl">
            <Pencil className="h-4 w-4 ml-2" /> עריכת פרופיל ואזורי שירות
          </Button>
        </div>

        <section className="px-5 space-y-3 pb-8 w-full">
          <h2 className="text-[12px] font-bold text-[#6B7280] uppercase tracking-wider flex items-center gap-1.5 mb-1 px-1">
            <Briefcase className="h-3 w-3 text-[#0E6B5A]" strokeWidth={2} /> ההצעות שלי
          </h2>
          {myDeals.length === 0 && (
            <div className="bg-white rounded-[20px] p-5 border border-[#ECEEF2] shadow-[0_4px_12px_rgba(0,0,0,0.10),0_1px_3px_rgba(0,0,0,0.06)] text-center text-sm text-[#6B7280]">
              עדיין לא יצרת הצעות. לחץ "צרו הצעה חדשה" כדי להתחיל.
            </div>
          )}
          {myDeals.map((d) => {
            const c = counts[d.id] ?? { interests: 0, paid: 0 };
            return (
              <div key={d.id} className="bg-white rounded-[20px] p-4 border border-[#ECEEF2] shadow-[0_4px_12px_rgba(0,0,0,0.10),0_1px_3px_rgba(0,0,0,0.06)] w-full">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-[14px] text-[#1F2937] truncate">{d.title}</h3>
                    <div className="text-[12px] text-[#6B7280] mt-0.5">{d.status}</div>
                  </div>
                  <div className="text-left">
                    <div className="font-extrabold text-[#1F2937] text-sm">{formatILS(priceFor(d))}</div>
                    <div className="text-[12px] text-[#0E6B5A] font-bold mt-0.5">{c.paid} שילמו</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[12px] pt-3 border-t border-[#ECEEF2]">
                  <span className="px-2.5 py-1 rounded-full bg-[#F8F8F6] text-[#1F2937] border border-[#ECEEF2] font-semibold">{c.interests} לידים</span>
                  <span className="px-2.5 py-1 rounded-full bg-[#0E6B5A]/12 text-[#0E6B5A] border border-[#0E6B5A]/30 font-semibold">{c.paid} פיקדונות</span>
                </div>
              </div>
            );
          })}
        </section>
      </div>

      <BottomNav role="supplier" />
    </MobileShell>
  );
}

function Stat({ icon: Icon, label, value, small }: { icon: LucideIcon; label: string; value: string; small?: boolean }) {
  return (
    <div className="bg-white rounded-[20px] p-4 border border-[#ECEEF2] shadow-[0_2px_10px_-4px_rgba(10,31,61,0.06)] w-full">
      <div className="flex items-center gap-2 mb-2">
        <span className="h-9 w-9 rounded-xl bg-[#2563EB]/12 flex items-center justify-center">
          <Icon className="h-4 w-4 text-[#0E6B5A]" strokeWidth={2} />
        </span>
        <span className="text-[12px] text-[#6B7280] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <div className={(small ? "text-fs-base" : "text-fs-xl") + " font-extrabold text-[#1F2937] tracking-tight leading-none"}>{value}</div>
    </div>
  );
}
