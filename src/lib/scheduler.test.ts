import { describe, expect, it } from "vitest";
import { generateSchedule } from "./scheduler";
import type { AvailabilitySlot, DayOfWeek, Difficulty, Module, StudySession } from "@/types";

// Every test starts on Monday 16 November 2026.
// Mon 16, Tue 17, Wed 18, Thu 19, Fri 20, Sat 21, Sun 22, Mon 23.
const START = "2026-11-16";

function mod(id: string, examDate: string, difficulty: Difficulty, estimatedHours: number): Module {
  return { id, name: id.toUpperCase(), examDate, difficulty, estimatedHours };
}

function slot(dayOfWeek: DayOfWeek, startTime: string, endTime: string): AvailabilitySlot {
  return { id: `${dayOfWeek}-${startTime}`, dayOfWeek, startTime, endTime };
}

const EVERY_EVENING = ([0, 1, 2, 3, 4, 5, 6] as DayOfWeek[]).map((d) => slot(d, "18:00", "20:00"));

/** "2026-11-16 18:00-20:00 a": one readable line per session. */
function lines(sessions: StudySession[]): string[] {
  return sessions.map((s) => `${s.date} ${s.startTime}-${s.endTime} ${s.moduleId}`);
}

function minutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

describe("generateSchedule", () => {
  it("normal case: splits free time into blocks of at most 2 hours and stops when done", () => {
    const a = mod("a", "2026-11-23", 3, 4);
    const { sessions, warnings } = generateSchedule(
      [a],
      [slot(1, "18:00", "21:00"), slot(3, "18:00", "20:00")], // Mon 3 h, Wed 2 h
      START,
    );

    expect(lines(sessions)).toEqual([
      "2026-11-16 18:00-20:00 a", // the 3-hour Monday slot is cut into 2 h…
      "2026-11-16 20:00-21:00 a", // …and 1 h
      "2026-11-18 18:00-19:00 a", // only the 1 hour still needed, not the whole slot
    ]);
    expect(warnings).toEqual([]);
    for (const s of sessions) {
      expect(minutes(s.endTime) - minutes(s.startTime)).toBeLessThanOrEqual(120);
      expect(s.date < a.examDate).toBe(true);
      expect(s.status).toBe("planned");
    }
  });

  it("two exams in the same week: highest score wins, and the day before an exam is reserved", () => {
    const a = mod("a", "2026-11-19", 2, 2); // Thursday exam, easier, little work
    const b = mod("b", "2026-11-20", 5, 6); // Friday exam, harder, more work
    const { sessions, warnings } = generateSchedule([a, b], EVERY_EVENING, START);

    expect(lines(sessions)).toEqual([
      // Mon: a = 2×2÷3 ≈ 1.3, b = 5×6÷4 = 7.5 → b
      "2026-11-16 18:00-20:00 b",
      // Tue: a = 2×2÷2 = 2, b = 5×4÷3 ≈ 6.7 → b
      "2026-11-17 18:00-20:00 b",
      // Wed is the day before a's exam: only a, even though b scores higher (5×2÷2 = 5 vs 4)
      "2026-11-18 18:00-20:00 a",
      // Thu is the day before b's exam: only b
      "2026-11-19 18:00-20:00 b",
    ]);
    expect(warnings).toEqual([]);
    // Nothing on or after either exam.
    expect(sessions.filter((s) => s.moduleId === "a" && s.date >= a.examDate)).toEqual([]);
    expect(sessions.filter((s) => s.moduleId === "b" && s.date >= b.examDate)).toEqual([]);
  });

  it("not enough hours: schedules what fits and warns how many hours are missing", () => {
    const a = mod("a", "2026-11-19", 3, 10);
    const { sessions, warnings } = generateSchedule([a], [slot(1, "18:00", "20:00")], START);

    expect(lines(sessions)).toEqual(["2026-11-16 18:00-20:00 a"]);
    expect(warnings).toEqual([
      "Not enough free time for A: 8 hours couldn't be scheduled before its exam on 2026-11-19.",
    ]);
  });

  it("exam tomorrow: today is only for that module", () => {
    const a = mod("a", "2026-11-17", 1, 3); // exam on Tuesday, needs 3 h: score 1×3÷1 = 3
    const b = mod("b", "2026-11-20", 5, 4); // higher score on Monday (5×4÷4 = 5), but must wait
    const { sessions, warnings } = generateSchedule([a, b], EVERY_EVENING, START);

    expect(lines(sessions)).toEqual([
      "2026-11-16 18:00-20:00 a", // Monday is the day before a's exam
      "2026-11-17 18:00-20:00 b", // a's exam day: a is no longer scheduled
      "2026-11-18 18:00-20:00 b",
    ]);
    expect(warnings).toEqual([
      "Not enough free time for A: 1 hour couldn't be scheduled before its exam on 2026-11-17.",
    ]);
  });

  it("exam date in the past (or on the start date): warns and schedules the rest", () => {
    const past = mod("past", "2026-11-10", 3, 5);
    const today = mod("today", START, 3, 5);
    const c = mod("c", "2026-11-18", 2, 2);
    const { sessions, warnings } = generateSchedule([past, today, c], EVERY_EVENING, START);

    expect(lines(sessions)).toEqual(["2026-11-16 18:00-20:00 c"]);
    expect(warnings).toEqual([
      "PAST: the exam date 2026-11-10 has already passed, so it was not scheduled.",
      "TODAY: the exam is on 2026-11-16, the start date, so there is no time left to schedule it.",
    ]);
  });

  it("joins overlapping free-time slots so the same hour is never booked twice", () => {
    const a = mod("a", "2026-11-23", 3, 10);
    const { sessions } = generateSchedule(
      [a],
      [slot(1, "18:00", "20:00"), slot(1, "19:00", "21:00")], // overlap 19:00–20:00
      START,
    );

    expect(lines(sessions)).toEqual(["2026-11-16 18:00-20:00 a", "2026-11-16 20:00-21:00 a"]);
  });

  it("does not change its inputs and gives the same answer every time", () => {
    const modules = Object.freeze([
      Object.freeze(mod("a", "2026-11-19", 2, 2)),
      Object.freeze(mod("b", "2026-11-20", 4, 6)),
    ]) as Module[];
    const slots = Object.freeze(EVERY_EVENING.map((s) => Object.freeze(s))) as AvailabilitySlot[];

    expect(generateSchedule(modules, slots, START)).toEqual(generateSchedule(modules, slots, START));
  });
});
