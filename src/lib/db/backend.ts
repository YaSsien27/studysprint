// The only file that sends data to and from Supabase. Everything goes through
// the mappers, so the rest of the app only ever sees the types in src/types.ts.
// (Tests swap this file for an in-memory fake: src/test/fakeBackend.ts.)

import { createClient } from "@/lib/supabase/client";
import {
  moduleFromRow,
  moduleToRow,
  sessionFromRow,
  sessionToRow,
  slotFromRow,
  slotToRow,
} from "@/lib/supabase/mappers";
import type { AvailabilitySlot, Module, StudySession } from "@/types";

/** The app's three tables and the type each one holds. */
export interface Tables {
  modules: Module;
  availability: AvailabilitySlot;
  study_sessions: StudySession;
}
export type TableName = keyof Tables;

// Each table's row ↔ app-type translation, so the functions below work for all three.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MAPPERS: { [K in TableName]: { from: (row: any) => Tables[K]; to: (item: Tables[K]) => object } } = {
  modules: { from: moduleFromRow, to: moduleToRow },
  availability: { from: slotFromRow, to: slotToRow },
  study_sessions: { from: sessionFromRow, to: sessionToRow },
};

let client: ReturnType<typeof createClient> | null = null;
const db = () => (client ??= createClient());

function check(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

/** All of the logged-in user's rows (row level security filters out everyone else's). */
export async function list<K extends TableName>(table: K): Promise<Tables[K][]> {
  const { data, error } = await db().from(table).select("*").order("created_at").order("id");
  check(error);
  return (data ?? []).map(MAPPERS[table].from);
}

export async function insert<K extends TableName>(table: K, items: Tables[K][]): Promise<void> {
  if (items.length === 0) return;
  const { error } = await db().from(table).insert(items.map(MAPPERS[table].to));
  check(error);
}

export async function update<K extends TableName>(table: K, item: Tables[K]): Promise<void> {
  const { id, ...changes } = MAPPERS[table].to(item) as { id: string };
  const { error } = await db().from(table).update(changes).eq("id", id);
  check(error);
}

export async function remove(table: TableName, id: string): Promise<void> {
  const { error } = await db().from(table).delete().eq("id", id);
  check(error);
}

/** Delete all of this user's rows in a table, then save `items` instead. */
export async function replaceAll<K extends TableName>(table: K, items: Tables[K][]): Promise<void> {
  // Supabase refuses a delete without a filter; every id is non-empty, so this matches all rows.
  const { error } = await db().from(table).delete().neq("id", "");
  check(error);
  await insert(table, items);
}
