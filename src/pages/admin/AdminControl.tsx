import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowLeft, type LucideIcon, ImageOff, ShieldCheck, CreditCard, Inbox, Building2, MessageSquare } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { LoadingState } from "@/components/ds";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Task = {
  key: string;
  icon: LucideIcon;
  title: string;
  description: string;
  count: number;
  to: string;
  tone: "warning" | "danger" | "neutral";
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export default function AdminControl() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const sevenDaysAgo = new Date(Date.now() - WEEK_MS).toISOString();

        const [
          pendingSuppliers,
          openComplaints,
          failedPayments,
          openLeads,
          pendingCommittee,
          dealsNoImage,
          suppliers,
          dealsActive,
          projectsAll,
        ] = await Promise.all([
          supabase.from("suppliers").select("id", { count: "exact", head: true }).eq("is_deleted", false).eq("approval_status", "pending"),
          supabase.from("complaints").select("id", { count: "exact", head: true }).eq("status", "open"),
          supabase.from("deposit_attempt_logs").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
          supabase.from("supplier_inquiries").select("id", { count: "exact", head: true }).eq("status", "new").lte("created_at", sevenDaysAgo).eq("is_deleted", false),
          supabase.from("committee_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("deals").select("id", { count: "exact", head: true }).eq("is_deleted", false).is("cover_image_url", null),
          supabase.from("suppliers").select("id").eq("is_deleted", false).eq("approval_status", "approved"),
          supabase.from("deals").select("supplier_id, project_id").eq("is_deleted", false).in("status", ["active", "closing-soon"]),
          supabase.from("projects").select("id").eq("is_deleted", false).eq("is_active", true),
        ]);

        const activeSupplierIds = new Set((dealsActive.data ?? []).map((d) => d.supplier_id).filter(Boolean));
        const suppliersNoDeals = (suppliers.data ?? []).filter((s) => !activeSupplierIds.has(s.id)).length;

        const activeProjectIds = new Set((dealsActive.data ?? []).map((d) => d.project_id).filter(Boolean));
        const projectsNoActivity = (projectsAll.data ?? []).filter((p) => !activeProjectIds.has(p.id)).length;

        setCounts({
          pendingSuppliers: pendingSuppliers.count ?? 0,
          openComplaints: openComplaints.count ?? 0,
          failedPayments: failedPayments.count ?? 0,
          openLeads: openLeads.count ?? 0,
          pendingCommittee: pendingCommittee.count ?? 0,
          dealsNoImage: dealsNoImage.count ?? 0,
          suppliersNoDeals,
          projectsNoActivity,
        });
      } catch (e) {
        console.error("[AdminControl] load", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const tasks = useMemo<Task[]>(() => [
    { key: "pendingSuppliers", icon: ShieldCheck, title: "ספקים ממתינים לאישור", description: "ספקים שעדיין לא אושרו ולא יכולים לפרסם", count: counts.pendingSuppliers ?? 0, to: "/admin/suppliers", tone: "warning" },
    { key: "failedPayments", icon: CreditCard, title: "תשלומים שנכשלו", description: "ניסיונות סליקה שנכשלו בשבוע האחרון", count: counts.failedPayments ?? 0, to: "/admin/payments", tone: "danger" },
    { key: "openLeads", icon: Inbox, title: "לידים ללא מענה", description: "פניות שלא נענו מעל שבוע", count: counts.openLeads ?? 0, to: "/admin/leads", tone: "warning" },
    { key: "dealsNoImage", icon: ImageOff, title: "הצעות ללא תמונה", description: "הצעות פעילות שלא מציגות תמונת שער", count: counts.dealsNoImage ?? 0, to: "/admin/deals", tone: "warning" },
    { key: "suppliersNoDeals", icon: ShieldCheck, title: "ספקים ללא הצעות", description: "ספקים מאושרים שלא העלו אף הצעה פעילה", count: counts.suppliersNoDeals ?? 0, to: "/admin/suppliers", tone: "neutral" },
    { key: "projectsNoActivity", icon: Building2, title: "פרויקטים ללא פעילות", description: "פרויקטים פעילים בלי הצעות פעילות", count: counts.projectsNoActivity ?? 0, to: "/admin/projects", tone: "neutral" },
    { key: "pendingCommittee", icon: ShieldCheck, title: "בקשות ועד בית ממתינות", description: "בקשות הרשאת ועד שמחכות לאישור", count: counts.pendingCommittee ?? 0, to: "/admin/committee-requests", tone: "warning" },
    { key: "openComplaints", icon: MessageSquare, title: "תלונות פתוחות", description: "דיווחי בעיות שלא טופלו", count: counts.openComplaints ?? 0, to: "/admin/complaints", tone: "danger" },
  ], [counts]);

  const totalIssues = tasks.reduce((s, t) => s + t.count, 0);

  return (
    <MobileShell>
      <AdminPageHeader
        title="בקרה"
        description="כל מה שדורש טיפול במקום אחד"
        actions={
          <span className={cn(
            "inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-[12px] font-extrabold",
            totalIssues > 0 ? "bg-[#FEE2E2] text-[#B91C1C]" : "bg-[#E7F5F0] text-[#0E6B5A]",
          )}>
            <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2.2} />
            {totalIssues > 0 ? `${totalIssues} פתוחות` : "הכול תקין"}
          </span>
        }
      />

      {loading ? (
        <LoadingState fullHeight={false} />
      ) : (
        <div className="px-5 lg:px-8 py-5 grid grid-cols-1 md:grid-cols-2 gap-3 max-w-6xl">
          {tasks.map((t) => (
            <button
              key={t.key}
              onClick={() => navigate(t.to)}
              className="text-right bg-white border border-[#ECEEF2] rounded-[14px] p-4 hover:border-[#0E6B5A]/40 transition-colors group"
            >
              <div className="flex items-start gap-3">
                <span className={cn(
                  "h-10 w-10 rounded-[10px] flex items-center justify-center shrink-0",
                  t.tone === "danger" ? "bg-[#FEE2E2]" : t.tone === "warning" ? "bg-[#FEF3C7]" : "bg-[#F1F3F7]",
                )}>
                  <t.icon className={cn(
                    "h-[18px] w-[18px]",
                    t.tone === "danger" ? "text-[#B91C1C]" : t.tone === "warning" ? "text-[#B45309]" : "text-[#6B7280]",
                  )} strokeWidth={2.2} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-extrabold text-[14px] text-[#0F172A] truncate">{t.title}</div>
                    <span className={cn(
                      "text-[12px] font-extrabold tabular-nums",
                      t.count === 0 ? "text-[#9CA3AF]" : t.tone === "danger" ? "text-[#B91C1C]" : "text-[#0F172A]",
                    )}>
                      {t.count}
                    </span>
                  </div>
                  <div className="text-[12px] text-[#6B7280] mt-1 leading-snug">{t.description}</div>
                </div>
                <ArrowLeft className="h-4 w-4 text-[#9CA3AF] group-hover:text-[#0E6B5A] transition-colors shrink-0 mt-1" strokeWidth={2} />
              </div>
            </button>
          ))}
        </div>
      )}

      <BottomNav role="admin" />
    </MobileShell>
  );
}
