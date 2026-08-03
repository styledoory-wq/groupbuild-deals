import { useEffect, useMemo, useState } from "react";
import { MobileShell } from "@/components/layout/MobileShell";
import { BottomNav } from "@/components/layout/BottomNav";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Send, MessageCircle, Mail, X, Search } from "lucide-react";
import { normalizeWhatsappUrl } from "@/lib/whatsapp";
import { useConfirm } from "@/components/ui/confirm-dialog";

type Audience = "supplier" | "resident" | "committee" | "all";
type Template = {
  id: string;
  audience: Audience;
  title: string;
  subject: string;
  body: string;
};
type Recipient = { id: string; name: string; email: string | null; phone: string | null };

const AUDIENCE_LABEL: Record<Audience, string> = {
  supplier: "ספקים",
  resident: "דיירים",
  committee: "ועדי בתים",
  all: "כולם",
};

export default function AdminMessageTemplates() {
  const askConfirm = useConfirm();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Audience | "any">("any");
  const [editor, setEditor] = useState<Partial<Template> | null>(null);
  const [sender, setSender] = useState<Template | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("admin_message_templates")
      .select("id,audience,title,subject,body")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setTemplates((data as Template[]) || []);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const filtered = useMemo(
    () => templates.filter((t) => filter === "any" || t.audience === filter || t.audience === "all"),
    [templates, filter]
  );

  const save = async () => {
    if (!editor?.title || !editor?.body || !editor?.audience) {
      toast.error("חובה: קהל יעד, כותרת ותוכן");
      return;
    }
    const payload = {
      audience: editor.audience,
      title: editor.title,
      subject: editor.subject || "",
      body: editor.body,
      updated_at: new Date().toISOString(),
    };
    const q = editor.id
      ? supabase.from("admin_message_templates").update(payload).eq("id", editor.id)
      : supabase.from("admin_message_templates").insert(payload);
    const { error } = await q;
    if (error) return toast.error(error.message);
    toast.success("נשמר");
    setEditor(null);
    void load();
  };

  const remove = async (id: string) => {
    if (!(await askConfirm({ title: "למחוק את התבנית?", confirmLabel: "מחיקה", destructive: true }))) return;
    const { error } = await supabase.from("admin_message_templates").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("נמחק");
    void load();
  };

  return (
    <MobileShell>
      <AdminPageHeader title="הודעות מוכנות" description="תבניות לשליחה מהירה בוואטסאפ ובמייל" />
      <div className="px-5 lg:px-8 py-5 max-w-6xl space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          {(["any", "supplier", "resident", "committee", "all"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-bold border ${
                filter === k
                  ? "bg-[#0E6B5A] text-white border-[#0E6B5A]"
                  : "bg-white text-[#0F172A] border-[#ECEEF2]"
              }`}
            >
              {k === "any" ? "הכל" : AUDIENCE_LABEL[k]}
            </button>
          ))}
          <button
            onClick={() =>
              setEditor({ audience: filter === "any" ? "supplier" : (filter as Audience), title: "", subject: "", body: "" })
            }
            className="mr-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold bg-[#0F172A] text-white"
          >
            <Plus className="h-3.5 w-3.5" /> תבנית חדשה
          </button>
        </div>

        {loading ? (
          <div className="text-center text-sm text-[#6B7280] py-8">טוען…</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-dashed border-[#ECEEF2] rounded-[14px] p-8 text-center text-sm text-[#6B7280]">
            אין תבניות עדיין. לחץ "תבנית חדשה" כדי להתחיל.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((t) => (
              <div key={t.id} className="bg-white border border-[#ECEEF2] rounded-[14px] p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[11px] font-extrabold text-[#0E6B5A]">{AUDIENCE_LABEL[t.audience]}</div>
                    <div className="font-extrabold text-[14px] text-[#0F172A] truncate mt-0.5">{t.title}</div>
                    {t.subject && <div className="text-[12px] text-[#6B7280] truncate mt-0.5">נושא: {t.subject}</div>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => setEditor(t)} className="h-8 w-8 rounded-lg bg-[#F4F6FA] flex items-center justify-center" title="עריכה">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => remove(t.id)} className="h-8 w-8 rounded-lg bg-[#FEF2F2] text-[#DC2626] flex items-center justify-center" title="מחיקה">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="text-[12.5px] text-[#334155] mt-2 whitespace-pre-wrap line-clamp-4">{t.body}</div>
                <button
                  onClick={() => setSender(t)}
                  className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#0E6B5A] text-white text-[13px] font-bold"
                >
                  <Send className="h-3.5 w-3.5" /> שלח
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {editor && <EditorSheet value={editor} onChange={setEditor} onClose={() => setEditor(null)} onSave={save} />}
      {sender && <SendSheet template={sender} onClose={() => setSender(null)} />}
      <BottomNav role="admin" />
    </MobileShell>
  );
}

function EditorSheet({
  value, onChange, onClose, onSave,
}: {
  value: Partial<Template>;
  onChange: (v: Partial<Template>) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl p-5 space-y-3 max-h-[90dvh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold text-[16px]">{value.id ? "עריכת תבנית" : "תבנית חדשה"}</h2>
          <button className="tap-target" onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <label className="block text-[12px] font-bold">קהל יעד</label>
        <select
          value={value.audience || "supplier"}
          onChange={(e) => onChange({ ...value, audience: e.target.value as Audience })}
          className="w-full h-11 px-3 rounded-xl border border-[#ECEEF2] bg-white text-[14px]"
        >
          <option value="supplier">ספקים</option>
          <option value="resident">דיירים</option>
          <option value="committee">ועדי בתים</option>
          <option value="all">כולם</option>
        </select>
        <label className="block text-[12px] font-bold">כותרת פנימית</label>
        <input
          value={value.title || ""}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
          className="w-full h-11 px-3 rounded-xl border border-[#ECEEF2] bg-white text-[14px]"
          placeholder="לדוגמה: תזכורת השלמת פרופיל"
        />
        <label className="block text-[12px] font-bold">נושא מייל</label>
        <input
          value={value.subject || ""}
          onChange={(e) => onChange({ ...value, subject: e.target.value })}
          className="w-full h-11 px-3 rounded-xl border border-[#ECEEF2] bg-white text-[14px]"
          placeholder="שורת הנושא במייל"
        />
        <label className="block text-[12px] font-bold">תוכן ההודעה</label>
        <textarea
          value={value.body || ""}
          onChange={(e) => onChange({ ...value, body: e.target.value })}
          className="w-full min-h-[160px] p-3 rounded-xl border border-[#ECEEF2] bg-white text-[14px] leading-relaxed"
          placeholder="ניתן להשתמש במשתנה {{name}} — יוחלף בשם הנמען."
        />
        <p className="text-[11px] text-[#6B7280]">משתנה זמין: <code>{"{{name}}"}</code></p>
        <button onClick={onSave} className="w-full h-11 rounded-xl bg-[#0E6B5A] text-white font-bold">שמור</button>
      </div>
    </div>
  );
}

function SendSheet({ template, onClose }: { template: Template; onClose: () => void }) {
  const askConfirm = useConfirm();
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const collected: Recipient[] = [];
        const aud = template.audience;
        if (aud === "supplier" || aud === "all") {
          const { data } = await supabase
            .from("suppliers")
            .select("id,business_name,email,phone")
            .eq("approval_status", "approved");
          (data || []).forEach((s: any) =>
            collected.push({ id: `s:${s.id}`, name: s.business_name, email: s.email, phone: s.phone })
          );
        }
        if (aud === "resident" || aud === "all") {
          const { data } = await supabase
            .from("profiles")
            .select("id,full_name,email,phone,user_type")
            .eq("user_type", "resident");
          (data || []).forEach((p: any) =>
            collected.push({ id: `r:${p.id}`, name: p.full_name || p.email || "דייר", email: p.email, phone: p.phone })
          );
        }
        if (aud === "committee" || aud === "all") {
          const { data } = await supabase
            .from("committee_requests")
            .select("user_id,status")
            .eq("status", "approved");
          const ids = (data || []).map((r: any) => r.user_id);
          if (ids.length) {
            const { data: profs } = await supabase
              .from("profiles")
              .select("id,full_name,email,phone")
              .in("id", ids);
            (profs || []).forEach((p: any) =>
              collected.push({ id: `c:${p.id}`, name: p.full_name || p.email || "ועד בית", email: p.email, phone: p.phone })
            );
          }
        }
        setRecipients(collected);
      } finally {
        setLoading(false);
      }
    })();
  }, [template.audience]);

  const filtered = recipients.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (r.name || "").toLowerCase().includes(q) || (r.email || "").toLowerCase().includes(q) || (r.phone || "").includes(q);
  });

  const selectedList = filtered.filter((r) => selected[r.id]);
  const toggle = (id: string) => setSelected((s) => ({ ...s, [id]: !s[id] }));
  const toggleAll = () => {
    const all: Record<string, boolean> = {};
    if (selectedList.length !== filtered.length) filtered.forEach((r) => (all[r.id] = true));
    setSelected(all);
  };

  const renderBody = (name: string) => template.body.replace(/\{\{name\}\}/g, name || "");

  const sendWhatsapp = async () => {
    const withPhone = selectedList.filter((r) => normalizeWhatsappUrl(r.phone));
    if (!withPhone.length) return toast.error("אין נמענים עם וואטסאפ");
    if (withPhone.length > 5 && !(await askConfirm({ title: "פתיחת וואטסאפ", description: `ייפתחו ${withPhone.length} טאבים של וואטסאפ. להמשיך?`, confirmLabel: "המשך" }))) return;
    withPhone.forEach((r) => {
      const url = normalizeWhatsappUrl(r.phone);
      if (!url) return;
      const text = encodeURIComponent(renderBody(r.name));
      window.open(`${url}?text=${text}`, "_blank");
    });
    toast.success(`נפתחו ${withPhone.length} שיחות וואטסאפ`);
  };

  const sendEmail = async () => {
    const withEmail = selectedList.filter((r) => r.email);
    if (!withEmail.length) return toast.error("אין נמענים עם מייל");
    setSending(true);
    let ok = 0, fail = 0;
    for (const r of withEmail) {
      try {
        const html = `<div dir="rtl" style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#1a1a1a;white-space:pre-wrap">${renderBody(r.name)
          .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>`;
        const { error } = await supabase.functions.invoke("send-email", {
          body: { type: "raw", to: r.email, subject: template.subject || template.title, html },
        });
        if (error) throw error;
        ok++;
      } catch (e) {
        console.error("[send-email]", e);
        fail++;
      }
    }
    setSending(false);
    toast[fail ? "warning" : "success"](`נשלחו ${ok} מיילים${fail ? `, נכשלו ${fail}` : ""}`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl p-5 max-h-[92dvh] overflow-y-auto space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-extrabold text-[#0E6B5A]">{AUDIENCE_LABEL[template.audience]}</div>
            <h2 className="font-extrabold text-[16px]">{template.title}</h2>
          </div>
          <button className="tap-target" onClick={onClose}><X className="h-5 w-5" /></button>
        </div>

        <div className="bg-[#F8FAFC] border border-[#ECEEF2] rounded-xl p-3 text-[13px] text-[#334155] whitespace-pre-wrap">
          {template.body}
        </div>

        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש נמען לפי שם / מייל / טלפון"
            className="w-full h-11 pr-9 pl-3 rounded-xl border border-[#ECEEF2] bg-white text-[14px]"
          />
        </div>

        <div className="flex items-center justify-between text-[12px]">
          <button onClick={toggleAll} className="tap-target text-[#0E6B5A] font-bold">
            {selectedList.length === filtered.length && filtered.length ? "בטל הכל" : "בחר הכל"}
          </button>
          <span className="text-[#6B7280]">נבחרו {selectedList.length} מתוך {filtered.length}</span>
        </div>

        <div className="border border-[#ECEEF2] rounded-xl max-h-64 overflow-y-auto divide-y divide-[#F1F3F7]">
          {loading ? (
            <div className="p-4 text-center text-sm text-[#6B7280]">טוען נמענים…</div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-center text-sm text-[#6B7280]">אין נמענים</div>
          ) : (
            filtered.map((r) => (
              <label key={r.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer">
                <input type="checkbox" checked={!!selected[r.id]} onChange={() => toggle(r.id)} className="h-4 w-4" />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-bold truncate">{r.name}</div>
                  <div className="text-[11px] text-[#6B7280] truncate">
                    {r.email || "— אין מייל"} · {r.phone || "— אין טלפון"}
                  </div>
                </div>
              </label>
            ))
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={sendWhatsapp}
            disabled={!selectedList.length}
            className="h-11 rounded-xl bg-[#25D366] text-white font-bold flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <MessageCircle className="h-4 w-4" /> וואטסאפ
          </button>
          <button
            onClick={sendEmail}
            disabled={!selectedList.length || sending}
            className="h-11 rounded-xl bg-[#0E2A47] text-white font-bold flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <Mail className="h-4 w-4" /> {sending ? "שולח…" : "מייל"}
          </button>
        </div>
      </div>
    </div>
  );
}
