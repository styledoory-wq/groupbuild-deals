import { useState, useEffect, useRef } from "react";
import { Upload, Trash2, Download, FolderOpen } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BackHeader, LoadingState, EmptyState } from "@/components/ds";
import { BottomNav } from "@/components/layout/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "plans", label: "תוכניות בנייה", icon: "📐" },
  { value: "approvals", label: "אישורים", icon: "✅" },
  { value: "contracts", label: "חוזים", icon: "📝" },
  { value: "photos", label: "תמונות", icon: "📷" },
  { value: "general", label: "מסמכים כלליים", icon: "📄" },
];

interface DocRow {
  id: string;
  file_name: string;
  file_url: string;
  category: string;
  file_size: number | null;
  created_at: string;
}

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_FILE_SIZE = 20 * 1024 * 1024;

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const CARD = "bg-white rounded-[20px] border border-[#ECEEF2] shadow-[0_4px_12px_rgba(0,0,0,0.10),0_1px_3px_rgba(0,0,0,0.06)]";
const CHIP_BASE = "text-[12px] px-3 py-1.5 rounded-full border font-bold transition-colors";
const CHIP_ACTIVE = "bg-[#0E6B5A] text-white border-[#0E6B5A]";
const CHIP_IDLE = "bg-white border-[#ECEEF2] text-[#6B7280]";

export default function MyDocuments() {
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [uploadCategory, setUploadCategory] = useState("general");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocs = async () => {
    const { data: session } = await supabase.auth.getSession();
    const uid = session.session?.user?.id;
    if (!uid) return;
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("user_id", uid)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      toast.error("שגיאה בטעינת מסמכים");
    } else {
      setDocs((data as DocRow[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("סוג קובץ לא נתמך. ניתן להעלות PDF, תמונות או מסמכי Word.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("הקובץ גדול מדי (מקסימום 20MB)");
      return;
    }
    setUploading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user?.id;
      if (!uid) throw new Error("יש להתחבר");
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${uid}/${Date.now()}_${safeName}`;
      const { error: uploadErr } = await supabase.storage
        .from("resident-documents")
        .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
      if (uploadErr) throw uploadErr;
      const { error: insertErr } = await supabase.from("documents").insert({
        user_id: uid,
        file_name: file.name,
        file_url: path,
        category: uploadCategory,
        file_size: file.size,
      });
      if (insertErr) throw insertErr;
      toast.success("הקובץ הועלה בהצלחה");
      fetchDocs();
    } catch (err: unknown) {
      console.error(err);
      toast.error(getErrorMessage(err, "שגיאה בהעלאת הקובץ"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDownload = async (doc: DocRow) => {
    try {
      const { data, error } = await supabase.storage
        .from("resident-documents")
        .createSignedUrl(doc.file_url, 60 * 5);
      if (error) throw error;
      window.open(data.signedUrl, "_blank");
    } catch {
      toast.error("שגיאה בפתיחת הקובץ");
    }
  };

  const handleDelete = async (doc: DocRow) => {
    if (!confirm(`למחוק את "${doc.file_name}"?`)) return;
    try {
      const { error } = await supabase
        .from("documents")
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq("id", doc.id);
      if (error) throw error;
      toast.success("הקובץ נמחק");
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
    } catch {
      toast.error("שגיאה במחיקה");
    }
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filtered = selectedCategory ? docs.filter((d) => d.category === selectedCategory) : docs;
  const getCategoryInfo = (val: string) =>
    CATEGORIES.find((c) => c.value === val) || { label: val, icon: "📄" };

  return (
    <MobileShell>
      <PageHeader title="המסמכים שלי" subtitle="ניהול קבצים ומסמכים" />

      <div className="px-5 mt-2 space-y-4" dir="rtl">
        {/* Upload section */}
        <div className={`${CARD} p-4 space-y-3`}>
          <h3 className="font-extrabold text-[14px] text-[#1F2937]">העלאת קובץ חדש</h3>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setUploadCategory(cat.value)}
                className={`${CHIP_BASE} ${uploadCategory === cat.value ? CHIP_ACTIVE : CHIP_IDLE}`}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
            onChange={handleUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full h-12 rounded-[20px] bg-[#0E6B5A] text-white font-bold text-[14px] flex items-center justify-center gap-2 active:scale-[0.99] transition-transform disabled:opacity-60"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "מעלה..." : "בחירת קובץ להעלאה"}
          </button>
        </div>

        {/* Filter by category */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`${CHIP_BASE} ${!selectedCategory ? CHIP_ACTIVE : CHIP_IDLE}`}
          >
            הכל ({docs.length})
          </button>
          {CATEGORIES.map((cat) => {
            const count = docs.filter((d) => d.category === cat.value).length;
            if (count === 0) return null;
            return (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`${CHIP_BASE} ${selectedCategory === cat.value ? CHIP_ACTIVE : CHIP_IDLE}`}
              >
                {cat.icon} {cat.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Document list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#0E6B5A]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-[24px] border border-dashed border-[#ECEEF2] p-10 text-center">
            <div className="h-16 w-16 rounded-2xl bg-white flex items-center justify-center mb-4 mx-auto shadow-[0_4px_12px_rgba(0,0,0,0.10),0_1px_3px_rgba(0,0,0,0.06)]">
              <FolderOpen className="h-7 w-7 text-[#0E6B5A]" />
            </div>
            <p className="text-[14px] font-bold text-[#1F2937]">
              {selectedCategory ? "אין מסמכים בקטגוריה זו" : "עדיין לא העלית מסמכים"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((doc) => {
              const catInfo = getCategoryInfo(doc.category);
              return (
                <div key={doc.id} className={`${CARD} p-3 flex items-center gap-3`}>
                  <div className="h-10 w-10 rounded-xl bg-[#0E6B5A]/12 flex items-center justify-center text-lg shrink-0">
                    {catInfo.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[13.5px] text-[#1F2937] truncate">{doc.file_name}</div>
                    <div className="text-[12px] text-[#6B7280]">
                      {catInfo.label} · {formatSize(doc.file_size)} ·{" "}
                      {new Date(doc.created_at).toLocaleDateString("he-IL")}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => handleDownload(doc)}
                      className="h-8 w-8 rounded-xl bg-[#0E6B5A]/12 flex items-center justify-center text-[#0E6B5A] active:scale-95 transition-transform"
                      aria-label="הורדה"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(doc)}
                      className="h-8 w-8 rounded-xl bg-[#DC2626]/10 flex items-center justify-center text-[#DC2626] active:scale-95 transition-transform"
                      aria-label="מחיקה"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav role="resident" />
    </MobileShell>
  );
}
