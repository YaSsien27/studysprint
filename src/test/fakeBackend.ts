// An in-memory stand-in for src/lib/db/backend.ts, used by every test (see
// vitest.setup.ts), so tests never touch a real database.
// Changes happen straight away, so a test can check `rowsIn(...)` right after a click.

import type { TableName, Tables } from "@/lib/db/backend";

// Loosely typed inside; the exported functions keep the real types.
type Row = { id: string; moduleId?: string };
type Db = Record<TableName, Row[]>;
const empty = (): Db => ({ modules: [], availability: [], study_sessions: [] });
let db: Db = empty();
let failNext: string | null = null;

/** Put rows in the fake database before rendering. */
export function seed<K extends TableName>(table: K, rows: Tables[K][]) {
  db[table] = structuredClone(rows);
}

/** What is "saved" in the fake database right now. */
export function rowsIn<K extends TableName>(table: K): Tables[K][] {
  return structuredClone(db[table]) as Tables[K][];
}

/** Make the next save fail with this message (to test error handling). */
export function failNextSave(message: string) {
  failNext = message;
}

export function resetFakeDb() {
  db = empty();
  failNext = null;
}

function maybeFail() {
  if (failNext) {
    const m = failNext;
    failNext = null;
    throw new Error(m);
  }
}

export async function list<K extends TableName>(table: K): Promise<Tables[K][]> {
  return structuredClone(db[table]) as Tables[K][];
}

export async function insert<K extends TableName>(table: K, items: Tables[K][]) {
  maybeFail();
  db[table] = [...db[table], ...structuredClone(items)];
}

export async function update<K extends TableName>(table: K, item: Tables[K]) {
  maybeFail();
  db[table] = db[table].map((r) => (r.id === item.id ? structuredClone(item) : r));
}

export async function remove(table: TableName, id: string) {
  maybeFail();
  if (table === "modules") db.study_sessions = db.study_sessions.filter((s) => s.moduleId !== id);
  db[table] = db[table].filter((r) => r.id !== id);
}

export async function replaceAll<K extends TableName>(table: K, items: Tables[K][]) {
  maybeFail();
  db[table] = structuredClone(items);
}
