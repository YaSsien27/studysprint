// Translates between database rows and the app's types (src/types.ts).
// The database uses snake_case column names (exam_date); the app uses
// camelCase (examDate). Keeping every translation here means a renamed column
// only needs fixing in one place.
//
// user_id and created_at are never sent from the app: the database fills them in.

import type { AvailabilitySlot, DayOfWeek, Difficulty, Module, StudySession } from "@/types";

export interface ModuleRow {
  id: string;
  name: string;
  exam_date: string;
  difficulty: number;
  estimated_hours: number | string; // Postgres "numeric" can arrive as a string
}

export interface AvailabilityRow {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export interface StudySessionRow {
  id: string;
  module_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: StudySession["status"];
  moved_from: string | null;
}

export const moduleFromRow = (r: ModuleRow): Module => ({
  id: r.id,
  name: r.name,
  examDate: r.exam_date,
  difficulty: r.difficulty as Difficulty,
  estimatedHours: Number(r.estimated_hours),
});

export const moduleToRow = (m: Module): ModuleRow => ({
  id: m.id,
  name: m.name,
  exam_date: m.examDate,
  difficulty: m.difficulty,
  estimated_hours: m.estimatedHours,
});

export const slotFromRow = (r: AvailabilityRow): AvailabilitySlot => ({
  id: r.id,
  dayOfWeek: r.day_of_week as DayOfWeek,
  startTime: r.start_time,
  endTime: r.end_time,
});

export const slotToRow = (s: AvailabilitySlot): AvailabilityRow => ({
  id: s.id,
  day_of_week: s.dayOfWeek,
  start_time: s.startTime,
  end_time: s.endTime,
});

export const sessionFromRow = (r: StudySessionRow): StudySession => ({
  id: r.id,
  moduleId: r.module_id,
  date: r.date,
  startTime: r.start_time,
  endTime: r.end_time,
  status: r.status,
  ...(r.moved_from ? { movedFrom: r.moved_from } : {}),
});

export const sessionToRow = (s: StudySession): StudySessionRow => ({
  id: s.id,
  module_id: s.moduleId,
  date: s.date,
  start_time: s.startTime,
  end_time: s.endTime,
  status: s.status,
  moved_from: s.movedFrom ?? null,
});
