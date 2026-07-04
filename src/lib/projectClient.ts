/**
 * Cloud-backed Project Members layer.
 *
 * Keeps the existing localStorage-based ProjectManagement UI as the source of
 * UI truth, and mirrors its keys to a shared cloud row so multiple members
 * see the same info/tasks/budget in realtime.
 *
 * Behavior:
 *  - On sign-in, ensure the user has (or is a member of) a `user_projects` row.
 *  - First-time: migrate any existing localStorage snapshot into the cloud row.
 *  - Subscribe to realtime updates on `user_project_data` — apply incoming
 *    payloads to the local keys and dispatch PROJECT_CHANGED_EVT so all
 *    existing hooks/components re-render.
 *  - Listen for local writes (PROJECT_CHANGED_EVT) and debounce-push the
 *    current snapshot back to the cloud (owner/partner only).
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  PROJECT_INFO_KEY, SCHEDULE_KEY, BUDGET_KEY, BUDGET_TOTAL_KEY,
  CURRENT_IDX_KEY, TASKS_KEY, PROGRESS_KEY, PROJECT_CHANGED_EVT,
  notifyProjectChanged,
} from "@/lib/projectStore";

export type MemberRole = "owner" | "partner" | "viewer";
export type ProjectMember = {
  id: string;
  project_id: string;
  user_id: string;
  role: MemberRole;
  joined_at: string;
};
export type ProjectInvitation = {
  id: string;
  project_id: string;
  token: string;
  role: MemberRole;
  invited_email: string | null;
  invited_phone: string | null;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
};

const ACTIVE_PROJECT_KEY = "gb:pm:activeProjectId";

function readJSON<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback; } catch { return fallback; }
}
function readNum(key: string): number { try { return Number(localStorage.getItem(key) || 0); } catch { return 0; } }

function snapshotLocal() {
  return {
    info: readJSON<Record<string, unknown>>(PROJECT_INFO_KEY, {}),
    schedule: readJSON<unknown[]>(SCHEDULE_KEY, []),
    tasks: readJSON<Record<string, unknown>>(TASKS_KEY, {}),
    budget: readJSON<unknown[]>(BUDGET_KEY, []),
    budget_total: readNum(BUDGET_TOTAL_KEY),
    current_idx: readNum(CURRENT_IDX_KEY),
    progress: readJSON<Record<string, unknown>>(PROGRESS_KEY, {}),
  };
}

function isSnapshotEmpty(s: ReturnType<typeof snapshotLocal>) {
  const infoEmpty = !s.info || Object.keys(s.info).length === 0;
  const budgetEmpty = !s.budget || s.budget.length === 0;
  const tasksEmpty = !s.tasks || Object.keys(s.tasks).length === 0;
  return infoEmpty && budgetEmpty && tasksEmpty && s.budget_total === 0;
}

function applyRemoteToLocal(data: {
  info: unknown; schedule: unknown; tasks: unknown; budget: unknown;
  budget_total: number | null; current_idx: number | null; progress: unknown;
}) {
  try {
    if (data.info) localStorage.setItem(PROJECT_INFO_KEY, JSON.stringify(data.info));
    if (data.schedule) localStorage.setItem(SCHEDULE_KEY, JSON.stringify(data.schedule));
    if (data.tasks) localStorage.setItem(TASKS_KEY, JSON.stringify(data.tasks));
    if (data.budget) localStorage.setItem(BUDGET_KEY, JSON.stringify(data.budget));
    if (data.budget_total != null) localStorage.setItem(BUDGET_TOTAL_KEY, String(data.budget_total));
    if (data.current_idx != null) localStorage.setItem(CURRENT_IDX_KEY, String(data.current_idx));
    if (data.progress) localStorage.setItem(PROGRESS_KEY, JSON.stringify(data.progress));
  } catch {}
}

export function getActiveProjectId(): string | null {
  try { return localStorage.getItem(ACTIVE_PROJECT_KEY); } catch { return null; }
}
function setActiveProjectId(id: string) {
  try { localStorage.setItem(ACTIVE_PROJECT_KEY, id); } catch {}
}

/** Get user's projects (via membership) — pick first as active if none set. */
async function findOrCreateProjectForUser(userId: string): Promise<string | null> {
  // 1) Existing membership?
  const { data: memberships } = await supabase
    .from("user_project_members")
    .select("project_id, joined_at")
    .eq("user_id", userId)
    .order("joined_at", { ascending: true });

  if (memberships && memberships.length > 0) {
    const existingActive = getActiveProjectId();
    const found = existingActive && memberships.find((m) => m.project_id === existingActive);
    const pid = (found ? existingActive : memberships[0].project_id) as string;
    setActiveProjectId(pid);
    return pid;
  }

  // 2) None — create one, seeded with local snapshot name if any
  const local = snapshotLocal();
  const localInfo = (local.info || {}) as { name?: string; projectType?: string };
  const { data: created, error } = await supabase
    .from("user_projects")
    .insert({
      name: localInfo.name || "הפרויקט שלי",
      project_type: localInfo.projectType || null,
      created_by: userId,
    })
    .select("id")
    .single();
  if (error || !created) return null;
  setActiveProjectId(created.id);
  return created.id;
}

async function pushSnapshotToCloud(projectId: string) {
  const s = snapshotLocal();
  await supabase
    .from("user_project_data")
    .upsert({
      project_id: projectId,
      info: s.info as never,
      schedule: s.schedule as never,
      tasks: s.tasks as never,
      budget: s.budget as never,
      budget_total: s.budget_total,
      current_idx: s.current_idx,
      progress: s.progress as never,
    }, { onConflict: "project_id" });
}

/**
 * Mount once inside authenticated Resident area. Handles:
 *   - Ensuring project exists
 *   - Migrating localStorage → cloud (first time)
 *   - Realtime cloud → localStorage
 *   - Debounced local → cloud on PROJECT_CHANGED_EVT
 */
export function useProjectCloudSync(userId: string | null | undefined) {
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let applyingRemote = false;
    let pushTimer: ReturnType<typeof setTimeout> | null = null;
    let projectId: string | null = null;

    (async () => {
      projectId = await findOrCreateProjectForUser(userId);
      if (!projectId || cancelled) return;

      // Fetch current cloud row
      const { data: row } = await supabase
        .from("user_project_data")
        .select("*")
        .eq("project_id", projectId)
        .maybeSingle();

      const local = snapshotLocal();

      if (row) {
        const cloudEmpty =
          (!row.info || Object.keys(row.info as object).length === 0) &&
          (!row.budget || (row.budget as unknown[]).length === 0) &&
          (!row.tasks || Object.keys(row.tasks as object).length === 0);
        if (cloudEmpty && !isSnapshotEmpty(local)) {
          await pushSnapshotToCloud(projectId);
        } else if (!cloudEmpty) {
          applyingRemote = true;
          applyRemoteToLocal(row as never);
          notifyProjectChanged();
          setTimeout(() => { applyingRemote = false; }, 400);
        }
      } else if (!isSnapshotEmpty(local)) {
        await pushSnapshotToCloud(projectId);
      }

      // Realtime subscription
      channel = supabase
        .channel(`upd-${projectId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "user_project_data", filter: `project_id=eq.${projectId}` },
          (payload) => {
            const next = payload.new as Record<string, unknown>;
            if (!next) return;
            applyingRemote = true;
            applyRemoteToLocal(next as never);
            notifyProjectChanged();
            setTimeout(() => { applyingRemote = false; }, 400);
          },
        )
        .subscribe();
    })();

    // Local → cloud debounced push
    const onLocal = () => {
      if (applyingRemote || !projectId) return;
      if (pushTimer) clearTimeout(pushTimer);
      pushTimer = setTimeout(() => { void pushSnapshotToCloud(projectId!); }, 700);
    };
    window.addEventListener(PROJECT_CHANGED_EVT, onLocal);

    return () => {
      cancelled = true;
      window.removeEventListener(PROJECT_CHANGED_EVT, onLocal);
      if (pushTimer) clearTimeout(pushTimer);
      if (channel) supabase.removeChannel(channel);
    };
  }, [userId]);
}

// ---------- Members / invitations helpers ----------

export function useProjectMembers(projectId: string | null) {
  const [members, setMembers] = useState<(ProjectMember & { email?: string; full_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) { setMembers([]); setLoading(false); return; }
    let cancelled = false;

    const load = async () => {
      const { data } = await supabase
        .from("user_project_members")
        .select("id, project_id, user_id, role, joined_at")
        .eq("project_id", projectId)
        .order("joined_at", { ascending: true });
      if (cancelled) return;
      const rows = (data || []) as ProjectMember[];
      // Fetch profile names/emails
      const userIds = rows.map((r) => r.user_id);
      let profiles: Record<string, { email?: string; full_name?: string }> = {};
      if (userIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, email, full_name")
          .in("id", userIds);
        profiles = Object.fromEntries((profs || []).map((p) => [p.id, { email: p.email ?? undefined, full_name: p.full_name ?? undefined }]));
      }
      setMembers(rows.map((r) => ({ ...r, ...(profiles[r.user_id] || {}) })));
      setLoading(false);
    };

    void load();
    const ch = supabase
      .channel(`upm-${projectId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "user_project_members", filter: `project_id=eq.${projectId}` },
        () => { void load(); })
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [projectId]);

  return { members, loading };
}

export async function createInvitation(projectId: string, role: MemberRole, opts?: { email?: string; phone?: string }) {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error("auth_required");
  const token = (crypto?.randomUUID?.() || Math.random().toString(36).slice(2)) + Math.random().toString(36).slice(2, 8);
  const { data, error } = await supabase
    .from("user_project_invitations")
    .insert({
      project_id: projectId,
      token,
      role,
      invited_by: uid,
      invited_email: opts?.email || null,
      invited_phone: opts?.phone || null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as ProjectInvitation;
}

export function inviteLinkFor(token: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/project/join/${token}`;
}

export async function acceptInvitationToken(token: string): Promise<string> {
  const { data, error } = await supabase.rpc("accept_user_project_invitation", { _token: token });
  if (error) throw error;
  if (data) setActiveProjectId(data as string);
  return data as string;
}

export async function removeMember(memberRowId: string) {
  await supabase.from("user_project_members").delete().eq("id", memberRowId);
}

export async function transferOwnership(projectId: string, toUserId: string) {
  const { error } = await supabase.rpc("transfer_user_project_ownership", { _project_id: projectId, _to_user: toUserId });
  if (error) throw error;
}

export function useMyProjectRole(projectId: string | null, userId: string | null | undefined): MemberRole | null {
  const [role, setRole] = useState<MemberRole | null>(null);
  useEffect(() => {
    if (!projectId || !userId) { setRole(null); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("user_project_members")
        .select("role")
        .eq("project_id", projectId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!cancelled) setRole((data?.role as MemberRole) ?? null);
    })();
    return () => { cancelled = true; };
  }, [projectId, userId]);
  return role;
}
