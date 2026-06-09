import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, X, Pencil, Save, Loader2 } from "lucide-react";
import { setPreviewRole, usePreviewRole } from "@/lib/previewMode";
import {
  clearAllPending,
  saveAllPending,
  setEditMode,
  useEditMode,
  usePendingCount,
} from "@/lib/editMode";
import { toast } from "sonner";

export function PreviewModeBanner() {
  const role = usePreviewRole();
  const navigate = useNavigate();
  const editMode = useEditMode();
  const pendingCount = usePendingCount();
  const [saving, setSaving] = useState(false);

  if (!role) return null;
  const label = role === "resident" ? "דייר" : "ספק";

  const exit = () => {
    clearAllPending();
    setEditMode(false);
    setPreviewRole(null);
    navigate("/admin", { replace: true });
  };

  const toggleEdit = () => {
    if (editMode && pendingCount > 0) {
      if (!window.confirm("יש שינויים שלא נשמרו. לבטל אותם?")) return;
      clearAllPending();
    }
    setEditMode(!editMode);
  };

  const save = async () => {
    if (pendingCount === 0) {
      toast.info("אין שינויים לשמירה");
      return;
    }
    setSaving(true);
    try {
      const res = await saveAllPending();
      if (res.failed === 0) {
        toast.success(`נשמרו ${res.ok} שינויים בהצלחה`);
      } else {
        toast.error(`נכשלו ${res.failed} שינויים — ${res.errors[0] ?? ""}`);
      }
    } catch (e) {
      toast.error("שמירה נכשלה");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="fixed top-0 inset-x-0 z-[120] bg-[#FFF3B0] border-b border-[#D4AF37] text-[#0A1F3D] shadow-[0_2px_8px_-2px_rgba(10,31,61,0.15)]"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto max-w-[var(--app-max-w)] flex items-center gap-1.5 px-3 py-2 text-[12px] font-bold">
        <Eye className="h-4 w-4 shrink-0" strokeWidth={2.2} />
        <span className="flex-1 truncate">אדמין · {label}{editMode ? " · עריכה" : ""}</span>

        {editMode && (
          <button
            onClick={save}
            disabled={saving || pendingCount === 0}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#2EA85A] text-white text-[11px] font-extrabold disabled:opacity-50 active:scale-95 transition-transform"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" strokeWidth={2.4} />}
            שמור{pendingCount > 0 ? ` (${pendingCount})` : ""}
          </button>
        )}

        <button
          onClick={toggleEdit}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold active:scale-95 transition-transform ${
            editMode ? "bg-white text-[#0A1F3D] border border-[#0A1F3D]" : "bg-[#D4AF37] text-white"
          }`}
        >
          <Pencil className="h-3 w-3" strokeWidth={2.4} />
          {editMode ? "סיים" : "ערוך"}
        </button>

        <button
          onClick={exit}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#0A1F3D] text-white text-[11px] font-extrabold active:scale-95 transition-transform"
        >
          <X className="h-3 w-3" strokeWidth={2.4} />
          יציאה
        </button>
      </div>
    </div>
  );
}
