import { useEffect, useState, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Admin Edit Mode — when an admin is in Preview Mode (resident/supplier),
 * they can toggle edit mode and click any wrapped field to edit it in place.
 * Only fields that were changed are persisted on Save.
 */

const EDIT_KEY = "adminEditMode";
const EDIT_EVT = "admin-edit-mode:change";
const CHANGES_EVT = "admin-edit-mode:changes";

type FieldKey = string; // "table:id:field"
const pending = new Map<FieldKey, { table: string; id: string; field: string; value: unknown }>();

function emit(name: string) {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(name));
}

// ---------- edit mode flag ----------
export function getEditMode(): boolean {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(EDIT_KEY) === "1";
}
export function setEditMode(on: boolean) {
  if (typeof window === "undefined") return;
  if (on) window.sessionStorage.setItem(EDIT_KEY, "1");
  else window.sessionStorage.removeItem(EDIT_KEY);
  emit(EDIT_EVT);
}
export function useEditMode(): boolean {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener(EDIT_EVT, cb);
      return () => window.removeEventListener(EDIT_EVT, cb);
    },
    () => getEditMode(),
    () => false,
  );
}

// ---------- pending changes ----------
function keyOf(table: string, id: string, field: string) {
  return `${table}:${id}:${field}`;
}

export function setPendingChange(table: string, id: string, field: string, value: unknown) {
  pending.set(keyOf(table, id, field), { table, id, field, value });
  emit(CHANGES_EVT);
}
export function clearPendingChange(table: string, id: string, field: string) {
  pending.delete(keyOf(table, id, field));
  emit(CHANGES_EVT);
}
export function getPendingValue<T = unknown>(table: string, id: string, field: string): T | undefined {
  return pending.get(keyOf(table, id, field))?.value as T | undefined;
}
export function getPendingCount(): number {
  return pending.size;
}
export function clearAllPending() {
  pending.clear();
  emit(CHANGES_EVT);
}

export function usePendingCount(): number {
  const [n, setN] = useState(getPendingCount());
  useEffect(() => {
    const handler = () => setN(getPendingCount());
    window.addEventListener(CHANGES_EVT, handler);
    return () => window.removeEventListener(CHANGES_EVT, handler);
  }, []);
  return n;
}

// ---------- save ----------
export async function saveAllPending(): Promise<{ ok: number; failed: number; errors: string[] }> {
  // Group by table:id
  const grouped = new Map<string, { table: string; id: string; patch: Record<string, unknown> }>();
  for (const change of pending.values()) {
    const k = `${change.table}:${change.id}`;
    const entry = grouped.get(k) ?? { table: change.table, id: change.id, patch: {} };
    entry.patch[change.field] = change.value;
    grouped.set(k, entry);
  }

  let ok = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const { table, id, patch } of grouped.values()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from(table).update(patch).eq("id", id);
    if (error) {
      failed += 1;
      errors.push(`${table}#${id}: ${error.message}`);
    } else {
      ok += 1;
    }
  }

  if (failed === 0) clearAllPending();
  return { ok, failed, errors };
}
