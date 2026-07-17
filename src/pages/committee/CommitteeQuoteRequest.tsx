import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Send, Users, Tag, Calendar, Coins } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/store/AppStore";
import { BackHeader, LoadingState, EmptyState } from "@/components/ds";
import { Building2 } from "lucide-react";
import { isAdminEmail } from "@/lib/auth";

interface Category { id: string; name: string }
interface Supplier { id: string; business_name: string }

export default function CommitteeQuoteRequest() {
  const navigate = useNavigate();
  const { user, authReady } = useApp();
  const [isCommittee, setIsCommittee] = useState<boolean | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [supplierId, setSupplierId] = useState<string>("");
  const [residentsCount, setResidentsCount] = useState<string>("");
  const [targetPrice, setTargetPrice] = useState<string>("");
  const [deadline, setDeadline] = useState<string>("");

  useEffect(() => {
    if (!authReady) return;
    if (!user?.id) { navigate("/auth"); return; }
    let cancelled = false;
    (async () => {
      const [{ data: roles }, { data: prof }, { data: cats }, { data: sups }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("profiles").select("project_id").eq("id", user.id).maybeSingle(),
        supabase.from("categories").select("id,name").eq("is_active", true).order("name"),
        supabase.from("suppliers").select("id,business_name").eq("is_active", true).eq("is_deleted", false).in("approval_status", ["approved", "active"]).order("business_name"),
      ]);
      if (cancelled) return;
      const rolesList = (roles ?? []).map((r) => (r as { role: string }).role);
      const isC = rolesList.includes("committee") || rolesList.includes("admin") || isAdminEmail(user.email) || user.role === "admin";
      setIsCommittee(isC);
      const pid = (prof as { project_id?: string | null } | null)?.project_id ?? null;
      setProjectId(pid);
      setCategories((cats ?? []) as Category[]);
      setSuppliers((sups ?? []) as Supplier[]);
      if (pid) {
        const { data: proj } = await supabase.from("projects").select("name").eq("id", pid).maybeSingle();
        if (!cancelled) setProjectName((proj as { name?: string } | null)?.name ?? "");
      }
    })();
    return () => { cancelled = true; };
  }, [authReady, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !projectId) return;
    if (!title.trim()) return toast.error("יש להזין כותרת");
    const rc = parseInt(residentsCount, 10);
    if (!rc || rc < 1) return toast.error("יש להזין מספר דיירים תקין");

    setSubmitting(true);
    try {
      const { error } = await supabase.from("committee_quote_requests").insert({
        user_id: user.id,
        project_id: projectId,
        title: title.trim(),
        description: description.trim() || null,
        category_id: categoryId || null,
        supplier_id: supplierId || null,
        residents_count: rc,
        target_price_per_unit: targetPrice ? parseFloat(targetPrice) : null,
        deadline: deadline ? new Date(deadline).toISOString() : null,
      });
      if (error) throw error;
      toast.success("הבקשה נשלחה! ניצור איתך קשר עם הצעות מתאימות.");
      navigate("/committee");
    } catch (err) {
      console.error(err);
      toast.error("שגיאה בשליחת הבקשה");
    } finally {
      setSubmitting(false);
    }
  };

  if (isCommittee === null) {
    return <div className="min-h-screen bg-[#F7F6F2]"><LoadingState /></div>;
  }
  if (!isCommittee) {
    return (
      <div className="min-h-screen bg-[#F7F6F2] flex items-center justify-center" dir="rtl">
        <EmptyState
          icon={<Building2 className="w-7 h-7 text-[#0E6B5A]" />}
          title="דרוש אישור ועד בית"
          description="רק נציגי ועד מאושרים יכולים לבקש הצעת מחיר קבוצתית."
          action={
            <button onClick={() => navigate("/committee/request")} className="h-12 px-6 rounded-xl bg-[#0E6B5A] text-white text-sm font-medium hover:bg-[#0c5a4c]">בקש הרשאה</button>
          }
        />
      </div>
    );
  }
  if (!projectId) {
    return (
      <div className="min-h-screen bg-[#F7F6F2] flex items-center justify-center" dir="rtl">
        <EmptyState
          icon={<Building2 className="w-7 h-7 text-[#0E6B5A]" />}
          title="חסר בניין מקושר"
          description="לא נמצא פרויקט מקושר לפרופיל שלך. עדכן את פרטי הפרופיל ונסה שוב."
          action={<button onClick={() => navigate("/resident/profile/edit")} className="h-12 px-6 rounded-xl bg-[#0E6B5A] text-white text-sm font-medium hover:bg-[#0c5a4c]">עריכת פרופיל</button>}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F6F2]" dir="rtl">
      <BackHeader title="בקשת הצעת מחיר קבוצתית" subtitle={projectName || undefined} />

      <main className="max-w-2xl mx-auto px-4 py-5">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[#EDEAE3] p-5 space-y-4">
          <Field label="כותרת הבקשה" required>
            <input
              type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="לדוגמה: צביעת חדרי מדרגות"
              className="w-full h-11 px-3 rounded-xl border border-[#EDEAE3] bg-[#F7F6F2] text-sm focus:outline-none focus:border-[#0E6B5A]"
              maxLength={120}
            />
          </Field>

          <Field label="פירוט (אופציונלי)">
            <textarea
              value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="היקף העבודה, חומרים, תנאים מיוחדים..."
              className="w-full min-h-[96px] p-3 rounded-xl border border-[#EDEAE3] bg-[#F7F6F2] text-sm focus:outline-none focus:border-[#0E6B5A] resize-none"
              maxLength={1000}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="מספר דיירים מחויבים" icon={Users} required>
              <input
                type="number" inputMode="numeric" min={1} value={residentsCount}
                onChange={(e) => setResidentsCount(e.target.value)}
                placeholder="לדוגמה: 12"
                className="w-full h-11 px-3 rounded-xl border border-[#EDEAE3] bg-[#F7F6F2] text-sm focus:outline-none focus:border-[#0E6B5A] tabular-nums"
              />
            </Field>
            <Field label="מחיר יעד ליחידה (₪)" icon={Coins}>
              <input
                type="number" inputMode="decimal" min={0} step={0.01} value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="אופציונלי"
                className="w-full h-11 px-3 rounded-xl border border-[#EDEAE3] bg-[#F7F6F2] text-sm focus:outline-none focus:border-[#0E6B5A] tabular-nums"
              />
            </Field>
          </div>

          <Field label="קטגוריה" icon={Tag}>
            <select
              value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-[#EDEAE3] bg-[#F7F6F2] text-sm focus:outline-none focus:border-[#0E6B5A]"
            >
              <option value="">— כל הקטגוריות —</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>

          <Field label="ספק יעד (אופציונלי)" icon={Building2}>
            <select
              value={supplierId} onChange={(e) => setSupplierId(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-[#EDEAE3] bg-[#F7F6F2] text-sm focus:outline-none focus:border-[#0E6B5A]"
            >
              <option value="">— פתוח לכל הספקים המתאימים —</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.business_name}</option>)}
            </select>
            <p className="text-[11px] text-[#6B6B6B] mt-1.5">אם תבחר ספק, הוא יקבל התראה ישירה.</p>
          </Field>

          <Field label="מועד אחרון להגשת הצעות" icon={Calendar}>
            <input
              type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="w-full h-11 px-3 rounded-xl border border-[#EDEAE3] bg-[#F7F6F2] text-sm focus:outline-none focus:border-[#0E6B5A]"
            />
          </Field>

          <button
            type="submit" disabled={submitting}
            className="w-full h-12 rounded-xl bg-[#0E6B5A] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-[#0c5a4c] active:scale-[0.99] transition disabled:opacity-60"
          >
            <Send className="w-4 h-4" /> {submitting ? "שולח..." : "שלח בקשה"}
          </button>
        </form>
      </main>
    </div>
  );
}

function Field({ label, icon: Icon, required, children }: { label: string; icon?: typeof Users; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs font-semibold text-[#1F1F1F] mb-1.5 inline-flex items-center gap-1.5">
        {Icon && <Icon className="w-3.5 h-3.5 text-[#0E6B5A]" />}
        {label}{required && <span className="text-[#DC2626]">*</span>}
      </div>
      {children}
    </label>
  );
}
