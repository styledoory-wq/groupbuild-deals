import { useEffect, useRef, useState } from "react";
import { FileText, Plus, Trash2, Pencil, ExternalLink, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { uploadSupplierCatalog } from "@/lib/supplierUploads";
import { toast } from "sonner";

export type CatalogRow = {
  id: string;
  supplier_id: string;
  name: string;
  description: string | null;
  file_url: string;
  file_size: number | null;
  display_order: number;
  created_at: string;
};

type Props = {
  supplierId: string;
};

export function SupplierCatalogsManager({ supplierId }: Props) {
  const [rows, setRows] = useState<CatalogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("supplier_catalogs")
      .select("*")
      .eq("supplier_id", supplierId)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) toast.error("טעינת הקטלוגים נכשלה");
    setRows((data ?? []) as CatalogRow[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [supplierId]);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadSupplierCatalog(file);
      const defaultName = file.name.replace(/\.pdf$/i, "");
      const { error } = await supabase.from("supplier_catalogs").insert({
        supplier_id: supplierId,
        name: defaultName.slice(0, 120) || "קטלוג",
        description: null,
        file_url: url,
        file_size: file.size,
        display_order: rows.length,
      });
      if (error) throw error;
      toast.success("הקטלוג נוסף");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "העלאה נכשלה");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const startEdit = (row: CatalogRow) => {
    setEditingId(row.id);
    setEditName(row.name);
    setEditDesc(row.description ?? "");
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const trimmed = editName.trim();
    if (!trimmed) { toast.error("שם הקטלוג חובה"); return; }
    const { error } = await supabase
      .from("supplier_catalogs")
      .update({ name: trimmed.slice(0, 120), description: editDesc.trim() || null })
      .eq("id", editingId);
    if (error) { toast.error("שמירה נכשלה"); return; }
    toast.success("הקטלוג עודכן");
    setEditingId(null);
    await load();
  };

  const removeRow = async (id: string) => {
    if (!confirm("למחוק את הקטלוג?")) return;
    const { error } = await supabase.from("supplier_catalogs").delete().eq("id", id);
    if (error) { toast.error("מחיקה נכשלה"); return; }
    toast.success("הקטלוג נמחק");
    await load();
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={onUpload}
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="h-9 rounded-xl text-xs w-full"
      >
        {uploading ? <Loader2 className="h-3.5 w-3.5 ml-1 animate-spin" /> : <Plus className="h-3.5 w-3.5 ml-1" />}
        {uploading ? "מעלה…" : "הוספת קטלוג (PDF)"}
      </Button>

      {loading ? (
        <div className="text-xs text-muted-foreground text-center py-3">טוען…</div>
      ) : rows.length === 0 ? (
        <div className="text-[11px] text-muted-foreground text-center py-2">עדיין לא הועלו קטלוגים</div>
      ) : (
        <div className="space-y-1.5">
          {rows.map((r) => {
            const isEdit = editingId === r.id;
            return (
              <div key={r.id} className="rounded-xl border border-border p-2.5 bg-card">
                {isEdit ? (
                  <div className="space-y-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="שם הקטלוג"
                      maxLength={120}
                      className="h-9 rounded-lg text-sm"
                    />
                    <Textarea
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      placeholder="תיאור קצר (אופציונלי)"
                      maxLength={300}
                      rows={2}
                      className="rounded-lg text-sm"
                    />
                    <div className="flex gap-2">
                      <Button type="button" onClick={saveEdit} className="h-8 rounded-lg text-xs flex-1 bg-primary text-primary-foreground">
                        <Save className="h-3.5 w-3.5 ml-1" /> שמירה
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => setEditingId(null)} className="h-8 rounded-lg text-xs">
                        ביטול
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <div className="h-9 w-9 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4 text-gold" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold truncate">{r.name}</div>
                      {r.description && (
                        <div className="text-[11px] text-muted-foreground line-clamp-2">{r.description}</div>
                      )}
                      <a
                        href={r.file_url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 text-[11px] text-gold underline mt-0.5"
                        dir="ltr"
                      >
                        <ExternalLink className="h-3 w-3" /> פתיחת PDF
                      </a>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => startEdit(r)}
                        className="h-7 w-7 rounded-lg bg-muted text-foreground flex items-center justify-center"
                        aria-label="עריכה"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeRow(r.id)}
                        className="h-7 w-7 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center"
                        aria-label="מחיקה"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
