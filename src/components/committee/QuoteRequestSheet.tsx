import { useState } from "react";
import { Send, Users, Tag, Calendar, Coins, Building2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/store/AppStore";

interface Category { id: string; name: string }
interface Supplier { id: string; business_name: string; categories?: string[] | null }

interface QuoteRequestSheetProps {
  projectName: string;
  projectId: string | null;
  categories: Category[];
  suppliers: Supplier[];
  onClose: () => void;
}

export function QuoteRequestSheet({ projectName, projectId, categories, suppliers, onClose }: QuoteRequestSheetProps) {
  const { user } = useApp();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [supplierId, setSupplierId] = useState<string>("");
  const [residentsCount, setResidentsCount] = useState<string>("");
  const [targetPrice, setTargetPrice] = useState<string>("");
  const [deadline, setDeadline] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // Filter suppliers by selected category (categories array contains category ids/slugs)
  const filteredSuppliers = categoryId
    ? suppliers.filter((s) => Array.isArray(s.categories) && s.categories.includes(categoryId))
    : suppliers;

  // If selected supplier is no longer in filtered list, clear it
  if (supplierId && !filteredSuppliers.some((s) => s.id === supplierId)) {
    setTimeout(() => setSupplierId(""), 0);
  }


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
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("שגיאה בשליחת הבקשה");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/40 overscroll-contain" onClick={onClose} dir="rtl">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg max-h-[calc(100dvh-12px)] sm:max-h-[92vh] overflow-y-auto overscroll-contain touch-pan-y bg-white rounded-t-2xl sm:rounded-2xl shadow-xl"
        style={{ WebkitOverflowScrolling: "touch" }}
      >

        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EDEAE3] sticky top-0 bg-white">
          <div>
            <h2 className="text-base font-semibold text-[#1F1F1F]">בקשת הצעת מחיר קבוצתית</h2>
            <p className="text-[11px] text-[#6B6B6B] mt-0.5">{projectName || "הקהילה שלנו"}</p>
          </div>
          <button onClick={onClose} className="tap-target p-2 rounded-full hover:bg-[#F0EEE7]" aria-label="סגור">
            <X className="w-4 h-4 text-[#1F1F1F]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 pb-[calc(24px+env(safe-area-inset-bottom))] space-y-4">
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
              {filteredSuppliers.map((s) => <option key={s.id} value={s.id}>{s.business_name}</option>)}
            </select>
            <p className="text-[11px] text-[#6B6B6B] mt-1.5">
              {categoryId
                ? `מציג ${filteredSuppliers.length} ספקים בתחום זה. אם תבחר ספק, הוא יקבל התראה ישירה.`
                : "בחר קטגוריה כדי לסנן ספקים. אם תבחר ספק, הוא יקבל התראה ישירה."}
            </p>
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
      </div>
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
