import { useEffect, useRef, useState } from "react";
import { FileText, Link2, Plus, Trash2, Pencil, ExternalLink, Loader2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { uploadSupplierCatalog } from "@/lib/supplierUploads";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm-dialog";

export type CatalogKind = "pdf" | "link";

export type CatalogRow = {
  id: string;
  supplier_id: string;
  name: string;
  description: string | null;
  file_url: string;
  file_size: number | null;
  display_order: number;
  created_at: string;
  kind: CatalogKind;
};

type Props = {
  supplierId: string;
};

const isValidHttpUrl = (s: string) => /^https?:\/\/\S+/i.test(s.trim());

export function SupplierCatalogsManager({ supplierId }: Props) {
  const askConfirm = useConfirm();
  const [rows, setRows] = useState<CatalogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Add dialog
  const [adding, setAdding] = useState(false);
  const [addKind, setAddKind] = useState<CatalogKind>("pdf");
  const [addName, setAddName] = useState("");
  const [addDesc, setAddDesc] = useState("");
  const [addUrl, setAddUrl] = useState("");
  const [addFile, setAddFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editKind, setEditKind] = useState<CatalogKind>("pdf");

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

  const resetAdd = () => {
    setAdding(false);
    setAddKind("pdf");
    setAddName("");
    setAddDesc("");
    setAddUrl("");
    setAddFile(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const submitAdd = async () => {
    const name = addName.trim();
    if (!name) { toast.error("שם הקטלוג חובה"); return; }
    if (addKind === "pdf" && !addFile) { toast.error("יש לבחור קובץ PDF"); return; }
    if (addKind === "link" && !isValidHttpUrl(addUrl)) {
      toast.error("הקישור חייב להתחיל ב-http:// או https://");
      return;
    }
    setSaving(true);
    setUploading(addKind === "pdf");
    try {
      let fileUrl = "";
      let fileSize: number | null = null;
      if (addKind === "pdf" && addFile) {
        fileUrl = await uploadSupplierCatalog(addFile);
        fileSize = addFile.size;
      } else {
        fileUrl = addUrl.trim();
      }
      const { error } = await supabase.from("supplier_catalogs").insert({
        supplier_id: supplierId,
        name: name.slice(0, 120),
        description: addDesc.trim() || null,
        file_url: fileUrl,
        file_size: fileSize,
        display_order: rows.length,
        kind: addKind,
      });
      if (error) throw error;
      toast.success("הקטלוג נוסף");
      resetAdd();
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "הוספה נכשלה");
    } finally {
      setUploading(false);
      setSaving(false);
    }
  };

  const startEdit = (row: CatalogRow) => {
    setEditingId(row.id);
    setEditName(row.name);
    setEditDesc(row.description ?? "");
    setEditUrl(row.kind === "link" ? row.file_url : "");
    setEditKind(row.kind);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const trimmed = editName.trim();
    if (!trimmed) { toast.error("שם הקטלוג חובה"); return; }
    const patch: { name: string; description: string | null; file_url?: string } = {
      name: trimmed.slice(0, 120),
      description: editDesc.trim() || null,
    };
    if (editKind === "link") {
      if (!isValidHttpUrl(editUrl)) {
        toast.error("הקישור חייב להתחיל ב-http:// או https://");
        return;
      }
      patch.file_url = editUrl.trim();
    }
    const { error } = await supabase
      .from("supplier_catalogs")
      .update(patch)
      .eq("id", editingId);
    if (error) { toast.error("שמירה נכשלה"); return; }
    toast.success("הקטלוג עודכן");
    setEditingId(null);
    await load();
  };

  const removeRow = async (id: string) => {
    if (!(await askConfirm({ title: "למחוק את הקטלוג?", confirmLabel: "מחיקה", destructive: true }))) return;
    const { error } = await supabase.from("supplier_catalogs").delete().eq("id", id);
    if (error) { toast.error("מחיקה נכשלה"); return; }
    toast.success("הקטלוג נמחק");
    await load();
  };

  return (
    <div className="space-y-2">
      {!adding && (
        <Button
          type="button"
          variant="outline"
          onClick={() => setAdding(true)}
          className="h-9 rounded-xl text-xs w-full"
        >
          <Plus className="h-3.5 w-3.5 ml-1" />
          הוסף קטלוג
        </Button>
      )}

      {adding && (
        <div className="rounded-xl border border-gold/30 bg-card p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold">קטלוג חדש</div>
            <button type="button" onClick={resetAdd} className="tap-target text-muted-foreground" aria-label="סגירה">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Kind selector */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setAddKind("pdf")}
              className={`h-9 rounded-lg border text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-smooth ${
                addKind === "pdf" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"
              }`}
            >
              <FileText className="h-3.5 w-3.5" /> העלאת PDF
            </button>
            <button
              type="button"
              onClick={() => setAddKind("link")}
              className={`h-9 rounded-lg border text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-smooth ${
                addKind === "link" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border"
              }`}
            >
              <Link2 className="h-3.5 w-3.5" /> קישור חיצוני
            </button>
          </div>

          <Input
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            placeholder="שם הקטלוג"
            maxLength={120}
            className="h-9 rounded-lg text-sm"
          />
          <Textarea
            value={addDesc}
            onChange={(e) => setAddDesc(e.target.value)}
            placeholder="תיאור קצר (אופציונלי)"
            maxLength={300}
            rows={2}
            className="rounded-lg text-sm"
          />

          {addKind === "pdf" ? (
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => setAddFile(e.target.files?.[0] ?? null)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                className="h-9 rounded-lg text-xs w-full"
              >
                <FileText className="h-3.5 w-3.5 ml-1" />
                {addFile ? addFile.name : "בחר קובץ PDF"}
              </Button>
            </div>
          ) : (
            <Input
              dir="ltr"
              value={addUrl}
              onChange={(e) => setAddUrl(e.target.value)}
              placeholder="https://example.com/catalog"
              maxLength={500}
              className="h-9 rounded-lg text-sm"
            />
          )}

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              onClick={submitAdd}
              disabled={saving}
              className="h-9 rounded-lg text-xs flex-1 bg-primary text-primary-foreground"
            >
              {uploading || saving ? <Loader2 className="h-3.5 w-3.5 ml-1 animate-spin" /> : <Save className="h-3.5 w-3.5 ml-1" />}
              {uploading ? "מעלה…" : saving ? "שומר…" : "הוספה"}
            </Button>
            <Button type="button" variant="ghost" onClick={resetAdd} className="h-9 rounded-lg text-xs">
              ביטול
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-xs text-muted-foreground text-center py-3">טוען…</div>
      ) : rows.length === 0 ? (
        <div className="text-fs-xs text-muted-foreground text-center py-2">עדיין לא הועלו קטלוגים</div>
      ) : (
        <div className="space-y-1.5">
          {rows.map((r) => {
            const isEdit = editingId === r.id;
            const Icon = r.kind === "link" ? Link2 : FileText;
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
                    {editKind === "link" && (
                      <Input
                        dir="ltr"
                        value={editUrl}
                        onChange={(e) => setEditUrl(e.target.value)}
                        placeholder="https://example.com/catalog"
                        maxLength={500}
                        className="h-9 rounded-lg text-sm"
                      />
                    )}
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
                      <Icon className="h-4 w-4 text-gold" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold truncate flex items-center gap-1.5">
                        {r.name}
                        <span className="text-fs-xs font-normal px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {r.kind === "link" ? "קישור" : "PDF"}
                        </span>
                      </div>
                      {r.description && (
                        <div className="text-fs-xs text-muted-foreground line-clamp-2">{r.description}</div>
                      )}
                      <a
                        href={r.file_url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 text-fs-xs text-gold underline mt-0.5"
                        dir="ltr"
                      >
                        <ExternalLink className="h-3 w-3" /> {r.kind === "link" ? "פתיחת הקישור" : "פתיחת PDF"}
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
