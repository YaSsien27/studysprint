// Works out the numbers for the /progress page. A pure function: it only
// uses what it is given (no clock, no database), so it is easy to test.

import { toDayNumber, toMinutes } from "@/lib/dates";
import type { Module, StudySession } from "@/types";

export interface ModuleProgress {
  id: string;
  name: string;
  examDate: string;
  /** 0 = exam today, 1 = tomorrow, negative = already passed. */
  daysUntilExam: number;
  targetMinutes: number;
  doneMinutes: number;
  /** Sessions still marked "planned" (not done, not missed). */
  plannedMinutes: number;
  missedMinutes: number;
}

export interface Progress {
  doneMinutes: number;
  targetMinutes: number;
  /** Sorted by exam date, soonest first. */
  modules: ModuleProgress[];
}

const lengthOf = (s: StudySession) => Math.max(0, toMinutes(s.endTime) - toMinutes(s.startTime));

export function computeProgress(modules: Module[], sessions: StudySession[], today: string): Progress {
  const todayNumber = toDayNumber(today);

  const rows = modules.map((m): ModuleProgress => {
    const mine = sessions.filter((s) => s.moduleId === m.id);
    const total = (status: StudySession["status"]) =>
      mine.filter((s) => s.status === status).reduce((sum, s) => sum + lengthOf(s), 0);
    return {
      id: m.id,
      name: m.name,
      examDate: m.examDate,
      daysUntilExam: toDayNumber(m.examDate) - todayNumber,
      targetMinutes: Math.round(m.estimatedHours * 60),
      doneMinutes: total("done"),
      plannedMinutes: total("planned"),
      missedMinutes: total("missed"),
    };
  });

  rows.sort((a, b) => a.examDate.localeCompare(b.examDate) || a.name.localeCompare(b.name));

  return {
    doneMinutes: rows.reduce((sum, r) => sum + r.doneMinutes, 0),
    targetMinutes: rows.reduce((sum, r) => sum + r.targetMinutes, 0),
    modules: rows,
  };
}

/** "Exam today", "Exam tomorrow", "Exam in 5 days", "Exam was 3 days ago". */
export function describeDaysUntil(days: number): string {
  if (days === 0) return "Exam today";
  if (days === 1) return "Exam tomorrow";
  if (days > 1) return `Exam in ${days} days`;
  if (days === -1) return "Exam was yesterday";
  return `Exam was ${-days} days ago`;
}
