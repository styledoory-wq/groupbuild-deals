import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, Save, Send, UserPlus, Package, XCircle, Mail } from "lucide-react";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { DEMAND_STATUSES, PROJECT_TYPES, statusMeta, projectTypeLabel } from "@/lib/demandStatus";
import { DemandPipelineStepper } from "@/components/admin/DemandPipelineStepper";
import { useApp } from "@/store/AppStore";

type Demand = any;

export default function AdminDemandDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { categories, regions, cities } = useApp() as any;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [d, setD] = useState<Demand | null>(null);
  const [owner, setOwner] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [log, setLog] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  // dialogs
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteSel, setInviteSel] = useState<string[]>([]);
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertSupplier, setConvertSupplier] = useState<string>("");
  const [convertTitle, setConvertTitle] = useState("");
  const [msgOpen, setMsgOpen] = useState(false);
  const [msgSubject, setMsgSubject] = useState("");
  const [msgBody, setMsgBody] = useState("");
  const [closeOpen, setCloseOpen] = useState(false);
  const [closeReason, setCloseReason] = useState("");

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const [{ data: dr }, invRes, logRes, mRes, pRes, sRes] = await Promise.all([
      (supabase as any).from("demand_requests").select("*").eq("id", id).maybeSingle(),
      (supabase as any).from("demand_invitations").select("*, suppliers(business_name)").eq("demand_id", id),
      (supabase as any).from("demand_activity_log").select("*").eq("demand_id", id).order("created_at", { ascending: false }),
      (supabase as any).from("demand_messages").select("*").eq("demand_id", id).order("sent_at", { ascending: false }),
      (supabase as any).from("demand_participants").select("*").eq("demand_id", id).order("joined_at"),
      (supabase as any).from("suppliers").select("id, business_name, categories, is_active").eq("is_active", true).order("business_name"),
    ]);
    setD(dr);
    setInvites((invRes.data as any[]) || []);
    setLog((logRes.data as any[]) || []);
    setMessages((mRes.data as any[]) || []);
    setParticipants((pRes.data as any[]) || []);
    setSuppliers((sRes.data as any[]) || []);
    if (dr?.resident_user_id) {
      const { data: p } = await supabase.from("profiles").select("full_name, email, phone, project_id").eq("id", dr.resident_user_id).maybeSingle();
      setOwner(p);
    }
    if (dr) setConvertTitle(dr.description?.slice(0, 60) || "");
    setLoading(false);
  };
  useEffect(() => { load(); }, [id]);

  const saveFields = async () => {
    if (!d) return;
    setSaving(true);
    const { error } = await (supabase as any).from("demand_requests")
      .update({ project_type: d.project_type, admin_notes: d.admin_notes, participants_count: d.participants_count, project_id: d.project_id })
      .eq("id", d.id);
    setSaving(false);
    if (error) toast.error("שמירה נכשלה"); else toast.success("נשמר");
  };

  const changeStatus = async (newStatus: string) => {
    const { error } = await supabase.rpc("admin_change_demand_status" as any, { _demand_id: id, _new_status: newStatus, _note: null });
    if (error) toast.error(error.message); else { toast.success("סטטוס עודכן"); load(); }
  };

  const doInvite = async () => {
    if (inviteSel.length === 0) return;
    const { error } = await supabase.rpc("admin_invite_suppliers_to_demand" as any, { _demand_id: id, _supplier_ids: inviteSel });
    if (error) toast.error(error.message); else { toast.success(`הוזמנו ${inviteSel.length} ספקים`); setInviteOpen(false); setInviteSel([]); load(); }
  };

  const doConvert = async () => {
    if (!convertSupplier || !convertTitle) { toast.error("בחר ספק והזן כותרת"); return; }
    const { data, error } = await supabase.rpc("admin_convert_demand_to_deal" as any, { _demand_id: id, _supplier_id: convertSupplier, _title: convertTitle });
    if (error) { toast.error(error.message); return; }
    toast.success("ההצעה נוצרה");
    setConvertOpen(false);
    if (data) navigate(`/admin/offers/${data}/edit`);
  };

  const doMessage = async () => {
    if (!msgSubject || !msgBody) return;
    const { error } = await supabase.rpc("admin_message_demand_participants" as any, { _demand_id: id, _subject: msgSubject, _body: msgBody });
    if (error) toast.error(error.message); else { toast.success("ההודעה נשלחה"); setMsgOpen(false); setMsgSubject(""); setMsgBody(""); load(); }
  };

  const doClose = async () => {
    const { error } = await supabase.rpc("admin_close_demand" as any, { _demand_id: id, _reason: closeReason });
    if (error) toast.error(error.message); else { toast.success("הביקוש נסגר"); setCloseOpen(false); load(); }
  };

  const catName = (cid: string | null) => categories?.find((c: any) => c.id === cid)?.name_he ?? "—";
  const regionName = (rid: string | null) => regions?.find((r: any) => r.id === rid)?.name_he ?? "—";
  const cityName = (cid: string | null) => cities?.find((c: any) => c.id === cid)?.name_he ?? "—";

  // suppliers filtered by demand category for invitation dialog
  const relevantSuppliers = d
    ? suppliers.filter((s) => !d.category_id || (Array.isArray(s.categories) && s.categories.includes(d.category_id)))
    : suppliers;

  if (loading || !d) {
    return <MobileShell><PageHeader title="ביקוש" back /><div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div></MobileShell>;
  }

  const meta = statusMeta(d.admin_status);

  return (
    <MobileShell>
      <PageHeader title="ניהול ביקוש" back />
      <div className="p-3 pb-32 space-y-4" dir="rtl">
        {/* Pipeline */}
        <div className="bg-card border rounded-lg p-2">
          <DemandPipelineStepper current={d.admin_status} />
        </div>

        {/* Header */}
        <div className="bg-card border rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Badge className={meta.color} variant="outline">{meta.label}</Badge>
            {d.deal_id && (
              <Button size="sm" variant="outline" onClick={() => navigate(`/admin/offers/${d.deal_id}/edit`)}>
                פתח הצעה
              </Button>
            )}
          </div>
          <div className="text-sm">{d.description}</div>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div>קטגוריה: {catName(d.category_id)}</div>
            <div>אזור: {regionName(d.region_id)}</div>
            <div>עיר: {cityName(d.city_id)}</div>
            <div>יעד: {d.target_qty ?? "—"}</div>
            <div>תקציב: {d.budget_min ?? "?"}–{d.budget_max ?? "?"}</div>
            <div>נפתח: {new Date(d.created_at).toLocaleDateString("he-IL")}</div>
          </div>
        </div>

        {/* Editable fields */}
        <section className="bg-card border rounded-lg p-3 space-y-3">
          <h3 className="font-semibold text-sm">פרטי אדמין</h3>
          <div>
            <Label>סוג פרויקט</Label>
            <Select value={d.project_type ?? ""} onValueChange={(v) => setD({ ...d, project_type: v })}>
              <SelectTrigger><SelectValue placeholder="בחר..." /></SelectTrigger>
              <SelectContent>
                {PROJECT_TYPES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>מספר משתתפים</Label>
            <Input type="number" value={d.participants_count ?? 1} onChange={(e) => setD({ ...d, participants_count: Number(e.target.value) })} />
          </div>
          <div>
            <Label>שיוך לפרויקט (מזהה)</Label>
            <Input value={d.project_id ?? ""} onChange={(e) => setD({ ...d, project_id: e.target.value })} placeholder="project id" />
          </div>
          <div>
            <Label>הערות אדמין</Label>
            <Textarea rows={3} value={d.admin_notes ?? ""} onChange={(e) => setD({ ...d, admin_notes: e.target.value })} />
          </div>
          <Button size="sm" onClick={saveFields} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 ml-1" />} שמור
          </Button>
        </section>

        {/* Owner */}
        <section className="bg-card border rounded-lg p-3 space-y-1">
          <h3 className="font-semibold text-sm mb-2">יוצר הבקשה</h3>
          <div className="text-xs">שם: {owner?.full_name ?? "—"}</div>
          <div className="text-xs">אימייל: {owner?.email ?? "—"}</div>
          <div className="text-xs">טלפון: {owner?.phone ?? "—"}</div>
          <div className="text-xs">פרויקט: {owner?.project_id ?? "—"}</div>
        </section>

        {/* Participants */}
        <section className="bg-card border rounded-lg p-3">
          <h3 className="font-semibold text-sm mb-2">חברי הקבוצה ({participants.length})</h3>
          {participants.length === 0 ? (
            <p className="text-xs text-muted-foreground">אין חברים רשומים</p>
          ) : (
            <div className="space-y-1">
              {participants.map((p) => (
                <div key={p.id} className="text-xs flex justify-between border-b pb-1">
                  <span>{p.full_name}</span>
                  <span className="text-muted-foreground">{p.phone ?? "—"}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Invitations */}
        <section className="bg-card border rounded-lg p-3">
          <h3 className="font-semibold text-sm mb-2">הזמנות לספקים ({invites.length})</h3>
          {invites.length === 0 ? (
            <p className="text-xs text-muted-foreground">אין הזמנות</p>
          ) : (
            <div className="space-y-1">
              {invites.map((inv) => (
                <div key={inv.id} className="text-xs flex justify-between border-b pb-1">
                  <span>{inv.suppliers?.business_name ?? inv.supplier_id.slice(0, 8)}</span>
                  <span className="flex gap-2">
                    <Badge variant="outline">{inv.status}</Badge>
                    {inv.offer_deal_id && <Badge variant="secondary">הגיש הצעה</Badge>}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Messages */}
        <section className="bg-card border rounded-lg p-3">
          <h3 className="font-semibold text-sm mb-2">הודעות שנשלחו ({messages.length})</h3>
          {messages.length === 0 ? (
            <p className="text-xs text-muted-foreground">לא נשלחו הודעות</p>
          ) : (
            <div className="space-y-2">
              {messages.map((m) => (
                <div key={m.id} className="text-xs border-b pb-2">
                  <div className="font-medium">{m.subject}</div>
                  <div className="text-muted-foreground">{m.body}</div>
                  <div className="text-[10px] text-muted-foreground">{new Date(m.sent_at).toLocaleString("he-IL")} · {m.recipients_count} נמענים</div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Activity log */}
        <section className="bg-card border rounded-lg p-3">
          <h3 className="font-semibold text-sm mb-2">לוג פעילות</h3>
          {log.length === 0 ? (
            <p className="text-xs text-muted-foreground">אין רשומות</p>
          ) : (
            <div className="space-y-1">
              {log.map((l) => (
                <div key={l.id} className="text-xs border-b pb-1">
                  <div className="flex justify-between">
                    <span className="font-medium">{l.action}</span>
                    <span className="text-muted-foreground">{new Date(l.created_at).toLocaleString("he-IL")}</span>
                  </div>
                  {l.payload && Object.keys(l.payload).length > 0 && (
                    <pre className="text-[10px] text-muted-foreground overflow-x-auto">{JSON.stringify(l.payload, null, 0)}</pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Sticky action bar */}
      <div className="fixed bottom-0 inset-x-0 bg-background border-t p-2 flex flex-wrap gap-2 z-30" dir="rtl">
        <Select value={d.admin_status} onValueChange={changeStatus}>
          <SelectTrigger className="flex-1 min-w-[120px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {DEMAND_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={() => setInviteOpen(true)}>
          <UserPlus className="w-4 h-4 ml-1" /> הזמן ספקים
        </Button>
        <Button size="sm" variant="outline" onClick={() => setConvertOpen(true)} disabled={!!d.deal_id}>
          <Package className="w-4 h-4 ml-1" /> צור הצעה
        </Button>
        <Button size="sm" variant="outline" onClick={() => setMsgOpen(true)}>
          <Mail className="w-4 h-4 ml-1" /> הודעה
        </Button>
        <Button size="sm" variant="destructive" onClick={() => setCloseOpen(true)}>
          <XCircle className="w-4 h-4 ml-1" /> סגור
        </Button>
      </div>

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>הזמנת ספקים</DialogTitle></DialogHeader>
          <div className="max-h-80 overflow-y-auto space-y-1">
            {relevantSuppliers.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-sm border rounded p-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inviteSel.includes(s.id)}
                  onChange={(e) => setInviteSel(e.target.checked ? [...inviteSel, s.id] : inviteSel.filter((x) => x !== s.id))}
                />
                {s.business_name}
              </label>
            ))}
            {relevantSuppliers.length === 0 && <p className="text-xs text-muted-foreground">אין ספקים מתאימים</p>}
          </div>
          <DialogFooter>
            <Button onClick={doInvite} disabled={inviteSel.length === 0}>
              <Send className="w-4 h-4 ml-1" /> שלח הזמנות ({inviteSel.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert dialog */}
      <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>צור הצעה מהביקוש</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>כותרת ההצעה</Label>
              <Input value={convertTitle} onChange={(e) => setConvertTitle(e.target.value)} />
            </div>
            <div>
              <Label>ספק</Label>
              <Select value={convertSupplier} onValueChange={setConvertSupplier}>
                <SelectTrigger><SelectValue placeholder="בחר ספק..." /></SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.business_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button onClick={doConvert}>צור ופתח בעורך</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Message dialog */}
      <Dialog open={msgOpen} onOpenChange={setMsgOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>שליחת הודעה למשתתפים</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>נושא</Label><Input value={msgSubject} onChange={(e) => setMsgSubject(e.target.value)} /></div>
            <div><Label>תוכן</Label><Textarea rows={4} value={msgBody} onChange={(e) => setMsgBody(e.target.value)} /></div>
          </div>
          <DialogFooter><Button onClick={doMessage} disabled={!msgSubject || !msgBody}><Send className="w-4 h-4 ml-1" />שלח</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close dialog */}
      <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>סגירת ביקוש</DialogTitle></DialogHeader>
          <div><Label>סיבה (אופציונלי)</Label><Textarea rows={3} value={closeReason} onChange={(e) => setCloseReason(e.target.value)} /></div>
          <DialogFooter><Button variant="destructive" onClick={doClose}>סגור ביקוש</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </MobileShell>
  );
}
