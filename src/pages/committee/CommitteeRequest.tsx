import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Building2, CheckCircle2, Clock, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/store/AppStore";
import { toast } from "sonner";

interface ProjectOpt { id: string; name: string; city: string }
interface RequestRow {
  id: string;
  project_id: string;
  status: "pending" | "approved" | "rejected";
  notes: string | null;
  decision_notes: string | null;
  requested_at: string;
  decided_at: string | null;
}

export default function CommitteeRequest() {
  const navigate = useNavigate();
  const { user, authReady } = useApp();
  const [projects, setProjects] = useState<ProjectOpt[]>([]);
  const [projectId, setProjectId] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [myRequest, setMyRequest] = useState<RequestRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authReady) return;
    if (!user?.id) { navigate("/auth"); return; }
    let cancelled = false;
    (async () => {
      const [{ data: projData }, { data: reqData }] = await Promise.all([
        supabase.from("projects").select("id,name,city").eq("is_active", true).order("name"),
        supabase.from("committee_requests").select("*").eq("user_id", user.id).order("requested_at", { ascending: false }).limit(1),
      ]);
      if (cancelled) return;
      setProjects((projData ?? []) as ProjectOpt[]);
      setMyRequest((reqData?.[0] as RequestRow) ?? null);
      if (user.projectId) setProjectId(user.projectId);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [authReady, user, navigate]);

  const submit = async () => {
    if (!projectId) { toast.error("יש לבחור פרויקט / בניין"); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("request_committee_role" as never, {
        _project_id: projectId,
        _notes: notes || null,
      } as never);
      if (error) throw error;
      toast.success("הבקשה נשלחה לאישור הצוות");
      const { data: reqData } = await supabase
        .from("committee_requests").select("*")
        .eq("user_id", user!.id).order("requested_at", { ascending: false }).limit(1);
      setMyRequest((reqData?.[0] as RequestRow) ?? null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "שגיאה בשליחת הבקשה";
      toast.error(msg.includes("already_pending") ? "כבר קיימת בקשה ממתינה" : msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#F7F6F2] flex items-center justify-center text-[#6B6B6B]">טוען…</div>;

  return (
    <div className="min-h-screen bg-[#F7F6F2]" dir="rtl">
      <header className="sticky top-0 z-10 bg-white border-b border-[#EDEAE3]">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -mr-2 rounded-full hover:bg-[#F0EEE7]">
            <ArrowRight className="w-5 h-5 text-[#1F1F1F]" />
          </button>
          <h1 className="text-base font-semibold text-[#1F1F1F]">הרשאת ועד בית</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <section className="bg-white rounded-2xl border border-[#EDEAE3] p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[#E8F1EE] flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-[#0E6B5A]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#1F1F1F] mb-1">יוזמי עסקאות קבוצתיות לבניין</h2>
              <p className="text-sm text-[#6B6B6B] leading-relaxed">
                כנציג ועד בית תוכל ליזום עסקאות קבוצתיות עבור הדיירים בבניין, לעקוב אחרי הצטרפויות
                ולראות את החיסכון המצטבר. הבקשה נבדקת על ידי הצוות.
              </p>
            </div>
          </div>
        </section>

        {myRequest && (
          <section className="bg-white rounded-2xl border border-[#EDEAE3] p-5">
            <h3 className="text-sm font-semibold text-[#1F1F1F] mb-3">הבקשה האחרונה שלך</h3>
            <div className="flex items-center gap-2 mb-2">
              {myRequest.status === "pending" && <><Clock className="w-4 h-4 text-[#C9A961]" /><span className="text-sm text-[#C9A961]">ממתינה לאישור</span></>}
              {myRequest.status === "approved" && <><CheckCircle2 className="w-4 h-4 text-[#0E6B5A]" /><span className="text-sm text-[#0E6B5A]">אושרה</span></>}
              {myRequest.status === "rejected" && <><XCircle className="w-4 h-4 text-[#C73E3E]" /><span className="text-sm text-[#C73E3E]">נדחתה</span></>}
            </div>
            <p className="text-xs text-[#6B6B6B]">פרויקט: {projects.find(p => p.id === myRequest.project_id)?.name ?? myRequest.project_id}</p>
            {myRequest.decision_notes && (
              <p className="text-xs text-[#6B6B6B] mt-2">הערת הצוות: {myRequest.decision_notes}</p>
            )}
            {myRequest.status === "approved" && (
              <button
                onClick={() => navigate("/committee")}
                className="mt-4 w-full h-11 rounded-xl bg-[#0E6B5A] text-white text-sm font-medium hover:bg-[#0c5a4c]"
              >פתח את דשבורד ועד הבית</button>
            )}
          </section>
        )}

        {(!myRequest || myRequest.status === "rejected") && (
          <section className="bg-white rounded-2xl border border-[#EDEAE3] p-5 space-y-4">
            <h3 className="text-sm font-semibold text-[#1F1F1F]">הגשת בקשה חדשה</h3>
            <div>
              <label className="block text-xs font-medium text-[#1F1F1F] mb-1.5">פרויקט / בניין</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-[#DCD8CD] bg-white text-sm text-[#1F1F1F]"
              >
                <option value="">בחר פרויקט…</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name} — {p.city}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1F1F1F] mb-1.5">פרטים נוספים (אופציונלי)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="ספר לנו בקצרה על תפקידך בוועד, מספר דיירים בבניין וכו'"
                className="w-full px-3 py-2 rounded-xl border border-[#DCD8CD] bg-white text-sm text-[#1F1F1F] resize-none"
              />
            </div>
            <button
              onClick={submit}
              disabled={submitting || !projectId}
              className="w-full h-12 rounded-xl bg-[#0E6B5A] text-white text-sm font-medium hover:bg-[#0c5a4c] disabled:opacity-50"
            >{submitting ? "שולח…" : "שלח בקשה"}</button>
          </section>
        )}
      </main>
    </div>
  );
}
