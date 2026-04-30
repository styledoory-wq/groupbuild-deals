import { useState, useEffect, useRef } from "react";
import { FileText, Upload, Trash2, Download, FolderOpen, Loader2 } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
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
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

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

      // Get signed URL (private bucket)
      const { data: signedData } = await supabase.storage
        .from("resident-documents")
        .createSignedUrl(path, 60 * 60 * 24 * 365); // 1 year

      const fileUrl = signedData?.signedUrl || path;

      const { error: insertErr } = await supabase.from("documents").insert({
        user_id: uid,
        file_name: file.name,
        file_url: path, // store the path, generate signed URLs on demand
        category: uploadCategory,
        file_size: file.size,
      });
      if (insertErr) throw insertErr;

      toast.success("הקובץ הועלה בהצלחה");
      fetchDocs();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "שגיאה בהעלאת הקובץ");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDownload = async (doc: DocRow) => {
    try {
      const { data, error } = await supabase.storage
        .from("resident-documents")
        .createSignedUrl(doc.file_url, 60 * 5); // 5 min
      if (error) throw error;
      window.open(data.signedUrl, "_blank");
    } catch (err: any) {
      toast.error("שגיאה בפתיחת הקובץ");
    }
  };

  const handleDelete = async (doc: DocRow) => {
    if (!confirm(`למחוק את "${doc.file_name}"?`)) return;
    try {
      // Soft delete in DB
      const { error } = await supabase
        .from("documents")
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq("id", doc.id);
      if (error) throw error;

      toast.success("הקובץ נמחק");
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
    } catch (err: any) {
      toast.error("שגיאה במחיקה");
    }
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filtered = selectedCategory
    ? docs.filter((d) => d.category === selectedCategory)
    : docs;

  const getCategoryInfo = (val: string) =>
    CATEGORIES.find((c) => c.value === val) || { label: val, icon: "📄" };

  return (
    <MobileShell>
      <PageHeader title="המסמכים שלי" subtitle="ניהול קבצים ומסמכים" />

      <div className="px-4 -mt-4 relative z-10 space-y-4 pb-24" dir="rtl">
        {/* Upload section */}
        <div className="gb-card p-4 space-y-3">
          <h3 className="font-bold text-sm text-foreground">העלאת קובץ חדש</h3>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setUploadCategory(cat.value)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  uploadCategory === cat.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border text-muted-foreground"
                }`}
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
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full h-11 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/90"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin ml-2" />
            ) : (
              <Upload className="h-4 w-4 ml-2" />
            )}
            {uploading ? "מעלה..." : "בחירת קובץ להעלאה"}
          </Button>
        </div>

        {/* Filter by category */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              !selectedCategory
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border text-muted-foreground"
            }`}
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
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  selectedCategory === cat.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border text-muted-foreground"
                }`}
              >
                {cat.icon} {cat.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Document list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-secondary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="gb-card p-8 text-center">
            <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              {selectedCategory ? "אין מסמכים בקטגוריה זו" : "עדיין לא העלית מסמכים"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((doc) => {
              const catInfo = getCategoryInfo(doc.category);
              return (
                <div key={doc.id} className="gb-card p-3 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg shrink-0">
                    {catInfo.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{doc.file_name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {catInfo.label} · {formatSize(doc.file_size)} ·{" "}
                      {new Date(doc.created_at).toLocaleDateString("he-IL")}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => handleDownload(doc)}
                      className="h-8 w-8 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary hover:bg-secondary/20 transition-colors"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(doc)}
                      className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive hover:bg-destructive/20 transition-colors"
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
