import { useEffect, useState } from "react";

/**
 * Shared read-model for the resident "Project Management" page.
 * ProjectManagement.tsx writes to these localStorage keys; other screens
 * (dashboard, etc.) subscribe here so they stay in sync automatically.
 */

export const PROJECT_INFO_KEY = "gb:pm:info";
export const SCHEDULE_KEY = "gb:pm:schedule";
export const BUDGET_KEY = "gb:pm:budget";
export const BUDGET_TOTAL_KEY = "gb:pm:budgetTotal";
export const CURRENT_IDX_KEY = "gb:pm:currentIdx";
export const TASKS_KEY = "gb:pm:tasks";
export const PROGRESS_KEY = "gb:pm:progress";

export type ProjectProgress = {
  tasksDone: number;
  tasksTotal: number;
  stageIdx: number;
  stagesCount: number;
  currentStageTitle: string;
  updatedAt: number;
};

export function writeProjectProgress(p: ProjectProgress) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
    window.dispatchEvent(new Event(PROJECT_CHANGED_EVT));
  } catch {}
}

export const PROJECT_CHANGED_EVT = "gb:pm:change";

export type LocalProjectInfo = {
  name?: string;
  subtitle?: string;
  manager?: string;
  targetDate?: string;
  groupSavings?: number;
  projectType?: string;
};
export type LocalBudgetItem = { id: string; label: string; planned: number; actual: number; catId?: string };

export type ProjectSummary = {
  hasProject: boolean;
  info: LocalProjectInfo;
  budgetTotal: number;
  budgetUsed: number;
  budgetOverPct: number;
  tasksDone: number;
  tasksTotal: number;
  progressPct: number;
  groupSavings: number;
  stageIdx: number;
  stagesCount: number;
  currentStageTitle: string;
};

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

export function readProjectSummary(): ProjectSummary {
  if (typeof window === "undefined") {
    return {
      hasProject: false, info: {}, budgetTotal: 0, budgetUsed: 0, budgetOverPct: 0,
      tasksDone: 0, tasksTotal: 0, progressPct: 0, groupSavings: 0,
      stageIdx: 0, stagesCount: 0, currentStageTitle: "",
    };
  }
  const info = safeParse<LocalProjectInfo>(localStorage.getItem(PROJECT_INFO_KEY), {});
  const budget = safeParse<LocalBudgetItem[]>(localStorage.getItem(BUDGET_KEY), []);
  const progress = safeParse<ProjectProgress | null>(localStorage.getItem(PROGRESS_KEY), null);
  const budgetTotal = budget.reduce((s, b) => s + (b.planned || 0), 0);
  const budgetUsed = budget.reduce((s, b) => s + (b.actual || 0), 0);
  const budgetOverPct = budgetUsed > budgetTotal && budgetTotal > 0
    ? Math.round(((budgetUsed - budgetTotal) / budgetTotal) * 100) : 0;
  const tasksDone = progress?.tasksDone ?? 0;
  const tasksTotal = progress?.tasksTotal ?? 0;
  const progressPct = tasksTotal > 0 ? Math.round((tasksDone / tasksTotal) * 100) : 0;
  const groupSavings = Number(info.groupSavings || 0);
  return {
    hasProject: !!(info.name || info.projectType),
    info,
    budgetTotal,
    budgetUsed,
    budgetOverPct,
    tasksDone,
    tasksTotal,
    progressPct,
    groupSavings,
    stageIdx: progress?.stageIdx ?? 0,
    stagesCount: progress?.stagesCount ?? 0,
    currentStageTitle: progress?.currentStageTitle ?? "",
  } as ProjectSummary;
}

export function notifyProjectChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(PROJECT_CHANGED_EVT));
}

export function useProjectSummary(): ProjectSummary {
  const [state, setState] = useState<ProjectSummary>(() => readProjectSummary());
  useEffect(() => {
    const refresh = () => setState(readProjectSummary());
    window.addEventListener(PROJECT_CHANGED_EVT, refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener(PROJECT_CHANGED_EVT, refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  return state;
}
