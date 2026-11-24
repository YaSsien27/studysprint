// Shared data shapes used across StudySprint.
// Dates are ISO strings "YYYY-MM-DD"; times are 24-hour "HH:MM" strings.

/** How hard a module is, from 1 (easy) to 5 (very hard). */
export type Difficulty = 1 | 2 | 3 | 4 | 5;

/** A subject/course you have an exam for. */
export interface Module {
  id: string;
  name: string;
  /** Exam date, e.g. "2026-12-15". */
  examDate: string;
  difficulty: Difficulty;
  /** Total hours you expect to need to study for this module. */
  estimatedHours: number;
}

/** 0 = Sunday, 1 = Monday, ... 6 = Saturday (same as JavaScript's Date.getDay()). */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** A block of free time that repeats every week. */
export interface AvailabilitySlot {
  id: string;
  dayOfWeek: DayOfWeek;
  /** e.g. "18:00" */
  startTime: string;
  /** e.g. "20:00" */
  endTime: string;
}

export type SessionStatus = "planned" | "done" | "missed";

/** One scheduled study block for a specific module on a specific date. */
export interface StudySession {
  id: string;
  moduleId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: SessionStatus;
  /** Set on a session made by "Move missed sessions": the id of the missed session it replaces. */
  movedFrom?: string;
}
