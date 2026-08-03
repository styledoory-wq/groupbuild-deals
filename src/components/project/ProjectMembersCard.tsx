import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Users, Plus, Copy, Check, X, Trash2, MessageCircle, Mail, Crown, Eye, Shield } from "lucide-react";
import { useApp } from "@/store/AppStore";
import {
import { useConfirm } from "@/components/ui/confirm-dialog";
  useProjectMembers, createInvitation, inviteLinkFor, removeMember,
  useMyProjectRole, type MemberRole,
} from "@/lib/projectClient";

const BRAND = "#0E6B5A";

const ROLE_META: Record<MemberRole, { label: string; icon: JSX.Element; tone: string }> = {
  owner:   { label: "בעלים",  icon: <Crown className="h-3.5 w-3.5" />,  tone: "bg-amber-50 text-amber-700" },
  partner: { label: "שותף",   icon: <Shield className="h-3.5 w-3.5" />, tone: "bg-emerald-50 text-emerald-700" },
  viewer:  { label: "צופה",   icon: <Eye className="h-3.5 w-3.5" />,    tone: "bg-slate-100 text-slate-600" },
};

export function ProjectMembersCard({
  projectId,
  projectLoading = false,
  projectError = null,
  onRetryProject,
}: {
  projectId: string | null;
  projectLoading?: boolean;
  projectError?: Error | null;
  onRetryProject?: () => void;
}) {
  const { user } = useApp();
  const { members, loading, error: membersError, refetch } = useProjectMembers(projectId);
  const myRole = useMyProjectRole(projectId, user?.id);
  const [open, setOpen] = useState(false);
  const canInvite = !myRole || myRole === "owner" || myRole === "partner";

  useEffect(() => {
    console.info("[ProjectMembers] card state", {
      projectId,
      currentUserId: user?.id ?? null,
      currentRole: myRole,
      membersCount: members.length,
      membersError: membersError?.message ?? projectError?.message ?? null,
    });
  }, [members.length, membersError, myRole, projectError, projectId, user?.id]);

  const memberCount = members.length;
  const subtitle = !projectId
    ? "מגדיר פרויקט..."
    : loading
      ? "טוען חברים..."
      : memberCount === 0
        ? "עדיין אין חברים משותפים — הזמן שותף"
        : `${memberCount} ${memberCount === 1 ? "חבר" : "חברים"} משתפים את הפרויקט`;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mt-3 w-full bg-white rounded-3xl p-4 border border-gray-100 shadow-[0_8px_24px_-12px_rgba(14,107,90,0.18)] text-right active:scale-[0.99] hover:shadow-[0_10px_28px_-12px_rgba(14,107,90,0.28)] transition-all flex items-center gap-3"
      >
        <div
          className="w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center text-white"
          style={{ background: `linear-gradient(135deg, ${BRAND} 0%, #0A5447 100%)` }}
          aria-hidden
        >
          <Users className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[14.5px] font-extrabold text-[#1A1A1A]">
            👥 חברי הפרויקט
          </h3>
          <p className="text-[11.5px] text-gray-500 mt-1 leading-snug truncate">{subtitle}</p>
        </div>
        <span className="text-[11px] font-bold text-white bg-[#0E6B5A] px-2.5 py-1 rounded-full shrink-0">
          נהל חברים והרשאות
        </span>
      </button>

      {open && (
        <MembersSheet
          projectId={projectId}
          myUserId={user?.id ?? null}
          myRole={myRole}
          canInvite={canInvite}
          onClose={() => setOpen(false)}
          members={members}
          loading={loading}
          projectLoading={projectLoading}
          projectError={projectError}
          membersError={membersError}
          onRetry={() => {
            onRetryProject?.();
            refetch();
          }}
        />
      )}
    </>
  );
}

function MembersSheet({
  const askConfirm = useConfirm();
  projectId, myUserId, myRole, canInvite, onClose, members, loading,
  projectLoading, projectError, membersError, onRetry,
}: {
  projectId: string | null;
  myUserId: string | null;
  myRole: MemberRole | null;
  canInvite: boolean;
  onClose: () => void;
  members: ReturnType<typeof useProjectMembers>["members"];
  loading: boolean;
  projectLoading: boolean;
  projectError: Error | null;
  membersError: Error | null;
  onRetry: () => void;
}) {
  const [inviteRole, setInviteRole] = useState<MemberRole>("partner");
  const [creating, setCreating] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const waitingForProject = !projectId || projectLoading;
  const waitingForMembers = Boolean(projectId && loading && members.length === 0);
  const blockingError = projectError || membersError;

  useEffect(() => {
    if (!waitingForProject && !waitingForMembers) {
      setTimedOut(false);
      return;
    }
    setTimedOut(false);
    const timer = window.setTimeout(() => setTimedOut(true), 5000);
    return () => window.clearTimeout(timer);
  }, [waitingForMembers, waitingForProject, projectId]);

  useEffect(() => {
    if (blockingError) toast.error("לא הצלחנו לטעון את חברי הפרויקט");
  }, [blockingError]);

  const handleRetry = () => {
    setTimedOut(false);
    onRetry();
  };

  const handleCreate = async () => {
    if (!projectId) {
      toast.info("הפרויקט עדיין נטען, ננסה שוב בעוד רגע...");
      return;
    }
    setCreating(true);
    try {
      const inv = await createInvitation(projectId, inviteRole);
      setLink(inviteLinkFor(inv.token));
    } catch (e) {
      toast.error("שגיאה ביצירת ההזמנה, נסה שוב");
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("הקישור הועתק");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("לא הצלחנו להעתיק את הקישור");
    }
  };

  const shareWhatsApp = () => {
    if (!link) return;
    const text = encodeURIComponent(`הצטרף לפרויקט שלי ב-GroupBuild: ${link}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const shareEmail = () => {
    if (!link) return;
    const subj = encodeURIComponent("הזמנה לפרויקט ב-GroupBuild");
    const body = encodeURIComponent(`שלום,\n\nהוזמנת להצטרף לפרויקט שלי ב-GroupBuild.\nלחצו כאן כדי להצטרף:\n${link}\n`);
    window.location.href = `mailto:?subject=${subj}&body=${body}`;
  };

  return createPortal(
    <div
      dir="rtl"
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/50 overflow-y-auto"
      style={{
        paddingTop: "max(env(safe-area-inset-top),16px)",
        paddingBottom: "max(env(safe-area-inset-bottom),16px)",
      }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl mx-2"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <h2 className="text-[17px] font-extrabold text-[#1A1A1A]">חברי הפרויקט</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
            <X className="h-4 w-4 text-gray-600" />
          </button>
        </div>

        <div className="p-5 max-h-[70vh] overflow-y-auto space-y-4">
          {(blockingError || timedOut) && (
            <div className="flex flex-col items-center text-center py-8 gap-3">
              <div className="w-11 h-11 rounded-full bg-red-50 text-red-500 flex items-center justify-center">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[13.5px] font-extrabold text-[#1A1A1A]">לא הצלחנו לטעון את חברי הפרויקט</p>
                <p className="text-[12px] text-gray-500 mt-1">אפשר לנסות שוב, אנחנו נטען מחדש את הפרויקט והרשימה.</p>
              </div>
              <button
                onClick={handleRetry}
                className="px-4 py-2.5 rounded-xl bg-[#0E6B5A] text-white text-[12.5px] font-bold active:scale-[0.98] transition-transform"
              >
                נסה שוב
              </button>
            </div>
          )}
          {!blockingError && !timedOut && waitingForProject && (
            <div className="flex flex-col items-center text-center py-8 gap-3">
              <div className="h-9 w-9 rounded-full border-2 border-[#0E6B5A] border-t-transparent animate-spin" />
              <p className="text-[13px] font-medium text-gray-600">אנחנו מכינים את הפרויקט שלך...</p>
              <div className="w-full space-y-2 pt-2">
                {[0, 1].map((i) => (
                  <div key={i} className="h-14 rounded-2xl bg-gray-100 animate-pulse" />
                ))}
              </div>
            </div>
          )}
          {!blockingError && !timedOut && waitingForMembers && (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-14 rounded-2xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          )}
          {!blockingError && !timedOut && projectId && !loading && members.length === 0 && (
            <div className="text-center text-[12.5px] text-gray-500 py-3">
              אתה החבר היחיד בפרויקט. הזמן שותף כדי לשתף את הנתונים.
            </div>
          )}
          {/* members */}
          {!blockingError && !timedOut && (
          <ul className="space-y-2">
            {members.map((m) => {
              const meta = ROLE_META[m.role];
              const isMe = m.user_id === myUserId;
              const canRemove = (myRole === "owner" && !isMe && m.role !== "owner") || (isMe && m.role !== "owner");
              return (
                <li key={m.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[15px] font-bold text-[#0E6B5A] shrink-0 border border-gray-200">
                    {(m.full_name || m.email || "?").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] font-bold text-[#1A1A1A] truncate">
                      {m.full_name || m.email || "משתמש"} {isMe && <span className="text-[10.5px] text-gray-500 font-medium">(אתה)</span>}
                    </div>
                    {m.email && (
                      <div className="text-[11px] text-gray-500 truncate">{m.email}</div>
                    )}
                  </div>
                  <span className={`text-[10.5px] font-bold px-2 py-1 rounded-full flex items-center gap-1 ${meta.tone}`}>
                    {meta.icon} {meta.label}
                  </span>
                  {canRemove && (
                    <button
                      onClick={async () => {
                        const ok = await askConfirm({
                          title: isMe ? "לעזוב את הפרויקט?" : "הסרת חבר",
                          description: isMe ? undefined : `להסיר את ${m.full_name || m.email || "החבר"}?`,
                          confirmLabel: isMe ? "עזוב" : "הסר",
                          destructive: true,
                        });
                        if (!ok) return;
                        await removeMember(m.id);
                      }}
                      className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center shrink-0"
                      aria-label="הסר"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          )}

          {/* invite */}
          {!blockingError && !timedOut && projectId && canInvite ? (
            <div className="p-4 rounded-2xl border border-dashed border-[#0E6B5A]/30 bg-[#F4FBF8] space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#0E6B5A] text-white flex items-center justify-center">
                  <Plus className="h-4 w-4" />
                </div>
                <div className="text-[13.5px] font-extrabold text-[#1A1A1A]">הזמן חבר</div>
              </div>

              <div className="flex gap-2">
                {(["partner", "viewer"] as MemberRole[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setInviteRole(r)}
                    className={`flex-1 py-2 rounded-xl text-[12px] font-bold border transition-colors ${
                      inviteRole === r
                        ? "bg-[#0E6B5A] text-white border-[#0E6B5A]"
                        : "bg-white text-[#1A1A1A] border-gray-200"
                    }`}
                  >
                    {ROLE_META[r].label}
                  </button>
                ))}
              </div>

              {!link ? (
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="w-full py-3 rounded-xl bg-[#0E6B5A] text-white font-bold text-[13.5px] active:scale-[0.99] transition-transform disabled:opacity-60"
                >
                  {creating ? "יוצר קישור..." : "צור קישור הזמנה"}
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-stretch gap-2">
                    <div className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-white border border-gray-200 text-[11.5px] text-gray-600 truncate">
                      {link}
                    </div>
                    <button
                      onClick={handleCopy}
                      className="px-3 rounded-xl bg-white border border-gray-200 flex items-center justify-center"
                      aria-label="העתק"
                    >
                      {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-gray-600" />}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={shareWhatsApp}
                      className="py-2.5 rounded-xl bg-[#25D366] text-white text-[12.5px] font-bold flex items-center justify-center gap-1.5"
                    >
                      <MessageCircle className="h-4 w-4" /> וואטסאפ
                    </button>
                    <button
                      onClick={shareEmail}
                      className="py-2.5 rounded-xl bg-white border border-gray-200 text-[12.5px] font-bold flex items-center justify-center gap-1.5"
                    >
                      <Mail className="h-4 w-4" /> אימייל
                    </button>
                  </div>
                  <p className="text-[10.5px] text-gray-500 text-center">
                    הקישור בתוקף ל-30 יום. כל מי שילחץ יצטרף כ-{ROLE_META[inviteRole].label}.
                  </p>
                </div>
              )}
            </div>
          ) : !blockingError && !timedOut && projectId ? (
            <div className="text-center text-[12px] text-gray-500 py-3">
              רק בעלים או שותפים יכולים להזמין חברים חדשים.
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
