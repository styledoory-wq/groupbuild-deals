import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Loader2, Inbox, Building2, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingState } from "@/components/ds";
import { BottomNav } from "@/components/layout/BottomNav";
import { supabase } from "@/integrations/supabase/client";

type Row = {
  id: string;
  user_id: string;
  project_id: string;
  status: "pending" | "approved" | "rejected";
  notes: string | null;
  decision_notes: string | null;
  requested_at: string;
};

export default function AdminCommitteeRequests() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Record<string, { full_name: string; email: string }>>({});
  const [projects, setProjects] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<"pending" | "all">("pending");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("committee_requests").select("*")
      .order("requested_at", { ascending: false });
    const list = (data ?? []) as Row[];
    setRows(list);

    const userIds = Array.from(new Set(list.map(r => r.user_id)));
    const projIds = Array.from(new Set(list.map(r => r.project_id)));
    const [{ data: profs }, { data: projs }] = await Promise.all([
      userIds.length
        ? supabase.from("profiles").select("id,full_name,email").in("id", userIds)
        : Promise.resolve({ data: [] as { id: string; full_name: string; email: string }[] }),
      projIds.length
        ? supabase.from("projects").select("id,name").in("id", projIds)
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    ]);
    const pmap: Record<string, { full_name: string; email: string }> = {};
    (profs ?? []).forEach((p) => { pmap[p.id] = { full_name: p.full_name, email: p.email }; });
    setProfiles(pmap);
    const prmap: Record<string, string> = {};
    (projs ?? []).forEach((p) => { prmap[p.id] = p.name; });
    setProjects(prmap);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const decide = async (id: string, approve: boolean) => {
    setBusy(id);
    try {
      const notes = approve ? null : window.prompt("סיבת הדחייה (אופציונלי):") || null;
      const { error } = await supabase.rpc("admin_decide_committee_request" as never, {
        _id: id, _approve: approve, _notes: notes,
      } as never);
      if (error) throw error;
      toast.success(approve ? "הבקשה אושרה" : "הבקשה נדחתה");
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setBusy(null);
    }
  };

  const revoke = async (r: Row) => {
    const reason = window.prompt(
      `לבטל את הרשאת ועד הבית של ${profiles[r.user_id]?.full_name ?? "המשתמש"}?\nהמשתמש יחזור להיות דייר רגיל.\nסיבה (אופציונלי):`
    );
    if (reason === null) return; // cancel
    setBusy(r.id);
    try {
      const { error } = await supabase.rpc("admin_revoke_committee_role" as never, {
        _user_id: r.user_id, _project_id: r.project_id, _reason: reason || null,
      } as never);
      if (error) throw error;
      toast.success("הרשאת ועד הבית בוטלה");
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setBusy(null);
    }
  };

  const filtered = rows.filter(r => tab === "all" ? true : r.status === "pending");

  return (
    <MobileShell>
      <PageHeader title="בקשות ועד בית" />
      <div className="px-4 pt-3 pb-2 flex gap-2">
        {(["pending", "all"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`h-9 px-4 rounded-full text-sm ${tab === t ? "bg-[#0E6B5A] text-white" : "bg-white text-[#1F1F1F] border border-[#EDEAE3]"}`}
          >{t === "pending" ? `ממתינות (${rows.filter(r => r.status === "pending").length})` : "הכל"}</button>
        ))}
      </div>

      <div className="px-4 pb-24 space-y-3">
        {loading ? (
          <LoadingState fullHeight={false} />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-[#6B6B6B]">
            <Inbox className="w-8 h-8 mb-2" />
            <p className="text-sm">אין בקשות להצגה</p>
          </div>
        ) : filtered.map(r => (
          <div key={r.id} className="bg-white rounded-2xl border border-[#EDEAE3] p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[#1F1F1F]">{profiles[r.user_id]?.full_name ?? "—"}</div>
                <div className="text-xs text-[#6B6B6B] truncate">{profiles[r.user_id]?.email ?? r.user_id}</div>
              </div>
              <span className={`text-[11px] px-2 py-1 rounded-full shrink-0 ${
                r.status === "pending" ? "bg-[#FCF6E5] text-[#9A7B14]" :
                r.status === "approved" ? "bg-[#E8F1EE] text-[#0E6B5A]" :
                "bg-[#FBE9E9] text-[#C73E3E]"
              }`}>{r.status === "pending" ? "ממתינה" : r.status === "approved" ? "אושרה" : "נדחתה"}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#6B6B6B] mb-2">
              <Building2 className="w-3.5 h-3.5" />
              <span>{projects[r.project_id] ?? r.project_id}</span>
            </div>
            {r.notes && <p className="text-xs text-[#1F1F1F] bg-[#F7F6F2] rounded-lg p-2 mb-2">{r.notes}</p>}
            {r.decision_notes && <p className="text-xs text-[#6B6B6B] mb-2">הערת הצוות: {r.decision_notes}</p>}
            {r.status === "pending" && (
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => decide(r.id, true)}
                  disabled={busy === r.id}
                  className="flex-1 h-10 rounded-xl bg-[#0E6B5A] text-white text-sm font-medium hover:bg-[#0c5a4c] disabled:opacity-50 flex items-center justify-center gap-1.5"
                ><CheckCircle2 className="w-4 h-4" />אישור</button>
                <button
                  onClick={() => decide(r.id, false)}
                  disabled={busy === r.id}
                  className="flex-1 h-10 rounded-xl border border-[#DCD8CD] text-[#C73E3E] text-sm font-medium hover:bg-[#FBE9E9] disabled:opacity-50 flex items-center justify-center gap-1.5"
                ><XCircle className="w-4 h-4" />דחייה</button>
              </div>
            )}
            {r.status === "approved" && (
              <div className="mt-3">
                <button
                  onClick={() => revoke(r)}
                  disabled={busy === r.id}
                  className="w-full h-10 rounded-xl border border-[#DCD8CD] text-[#C73E3E] text-sm font-medium hover:bg-[#FBE9E9] disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {busy === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldOff className="w-4 h-4" />}
                  ביטול הרשאת ועד בית
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      <BottomNav role="admin" />
    </MobileShell>
  );
}
