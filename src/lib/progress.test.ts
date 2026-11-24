import { describe, expect, it } from "vitest";
import { computeProgress, describeDaysUntil } from "./progress";
import type { Module, StudySession } from "@/types";

const MODULES: Module[] = [
  { id: "hi", name: "History", examDate: "2026-11-27", difficulty: 2, estimatedHours: 10 },
  { id: "la", name: "Linear Algebra", examDate: "2026-11-20", difficulty: 4, estimatedHours: 4.5 },
];

const s = (moduleId: string, startTime: string, endTime: string, status: StudySession["status"]): StudySession => ({
  id: `${moduleId}-${startTime}-${status}`,
  moduleId,
  date: "2026-11-18",
  startTime,
  endTime,
  status,
});

describe("computeProgress", () => {
  it("adds up done, planned and missed time per module and in total", () => {
    const sessions = [
      s("hi", "18:00", "20:00", "done"),
      s("hi", "08:00", "09:30", "done"),
      s("hi", "20:00", "21:00", "planned"),
      s("hi", "10:00", "11:00", "missed"),
      s("la", "18:00", "19:00", "planned"),
    ];
    const result = computeProgress(MODULES, sessions, "2026-11-17");

    expect(result.doneMinutes).toBe(210);
    expect(result.targetMinutes).toBe(10 * 60 + 270);
    // Soonest exam first.
    expect(result.modules).toEqual([
      {
        id: "la", name: "Linear Algebra", examDate: "2026-11-20", daysUntilExam: 3,
        targetMinutes: 270, doneMinutes: 0, plannedMinutes: 60, missedMinutes: 0,
      },
      {
        id: "hi", name: "History", examDate: "2026-11-27", daysUntilExam: 10,
        targetMinutes: 600, doneMinutes: 210, plannedMinutes: 60, missedMinutes: 60,
      },
    ]);
  });

  it("ignores sessions of deleted modules and handles no sessions", () => {
    const result = computeProgress(MODULES, [s("gone", "18:00", "20:00", "done")], "2026-11-17");
    expect(result.doneMinutes).toBe(0);
    expect(result.modules.every((m) => m.doneMinutes === 0 && m.plannedMinutes === 0)).toBe(true);
  });

  it("counts days until the exam, negative once it has passed", () => {
    const result = computeProgress(MODULES, [], "2026-11-21");
    expect(result.modules.map((m) => m.daysUntilExam)).toEqual([-1, 6]);
  });
});

describe("describeDaysUntil", () => {
  it("says it in words", () => {
    expect(describeDaysUntil(0)).toBe("Exam today");
    expect(describeDaysUntil(1)).toBe("Exam tomorrow");
    expect(describeDaysUntil(12)).toBe("Exam in 12 days");
    expect(describeDaysUntil(-1)).toBe("Exam was yesterday");
    expect(describeDaysUntil(-4)).toBe("Exam was 4 days ago");
  });
});
