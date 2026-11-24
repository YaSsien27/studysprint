// Keeps a copy of each table in memory, so every component shows the same data
// and the screen updates straight away. Each change is shown first, then saved
// to Supabase. If saving fails, the error is shown and the real data is
// loaded again, so the screen never pretends something was saved.
//
//   const { rows: modules, status, error } = useTable("modules");
//   addRows("modules", [newModule]);

import { useEffect, useSyncExternalStore } from "react";
import * as backend from "./backend";
import type { TableName, Tables } from "./backend";

export type { TableName } from "./backend";

export interface TableState<T> {
  status: "loading" | "ready" | "error";
  rows: T[];
  /** The last thing that went wrong, shown to the user; null when all is well. */
  error: string | null;
}

const LOADING: TableState<never> = { status: "loading", rows: [], error: null };

const states = new Map<TableName, TableState<unknown>>();
const loading = new Set<TableName>();
const listeners = new Set<() => void>();

function getState<K extends TableName>(table: K): TableState<Tables[K]> {
  return (states.get(table) as TableState<Tables[K]> | undefined) ?? LOADING;
}

function setState<K extends TableName>(table: K, next: TableState<Tables[K]>) {
  states.set(table, next);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const message = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");

async function load<K extends TableName>(table: K, errorToKeep: string | null = null) {
  if (loading.has(table)) return;
  loading.add(table);
  try {
    const rows = await backend.list(table);
    setState(table, { status: "ready", rows, error: errorToKeep });
  } catch (e) {
    setState(table, { status: "error", rows: getState(table).rows, error: message(e) });
  } finally {
    loading.delete(table);
  }
}

/** Read a table. It loads once, then every component using it stays in sync. */
export function useTable<K extends TableName>(table: K): TableState<Tables[K]> {
  const state = useSyncExternalStore(subscribe, () => getState(table), () => LOADING);
  useEffect(() => {
    if (!states.has(table)) void load(table);
  }, [table]);
  return state;
}

/** Show a change now, then save it. On failure: keep the error, reload the truth. */
async function change<K extends TableName>(
  table: K,
  apply: (rows: Tables[K][]) => Tables[K][],
  save: () => Promise<void>,
): Promise<boolean> {
  const current = getState(table);
  setState(table, { ...current, rows: apply(current.rows), error: null });
  try {
    await save();
    return true;
  } catch (e) {
    await load(table, `Couldn't save your change: ${message(e)}`);
    return false;
  }
}

export function addRows<K extends TableName>(table: K, items: Tables[K][]) {
  return change(table, (rows) => [...rows, ...items], () => backend.insert(table, items));
}

export function updateRow<K extends TableName>(table: K, item: Tables[K]) {
  return change(
    table,
    (rows) => rows.map((r) => (r.id === item.id ? item : r)),
    () => backend.update(table, item),
  );
}

export function deleteRow(table: TableName, id: string) {
  // The database also deletes a module's sessions (on delete cascade); mirror that here.
  if (table === "modules" && states.has("study_sessions")) {
    const sessions = getState("study_sessions");
    setState("study_sessions", { ...sessions, rows: sessions.rows.filter((s) => s.moduleId !== id) });
  }
  return change(table, (rows) => rows.filter((r) => r.id !== id), () => backend.remove(table, id));
}

export function replaceRows<K extends TableName>(table: K, items: Tables[K][]) {
  return change(table, () => items, () => backend.replaceAll(table, items));
}

/** Forget everything in memory, e.g. after logging out, so the next user starts clean. */
export function resetStore() {
  states.clear();
  loading.clear();
  listeners.forEach((listener) => listener());
}
