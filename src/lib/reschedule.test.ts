import { describe, expect, it } from "vitest";
import { rescheduleMissed } from "./scheduler";
import type { AvailabilitySlot, DayOfWeek, Module, StudySession } from "@/types";

// Today is Tuesday 17 Nov 2026. Wed 18, Thu 19, Fri 20, Sat 21, Sun 22, Mon 23 …
const TODAY = "2026-11-17";

const mod = (id: string, examDate: string, difficulty: Module["difficulty"] = 3): Module => ({
  id,
  name: id === "hi" ? "History" : id === "la" ? "Linear Algebra" : id,
  examDate,
  difficulty,
  estimatedHours: 10,
});

const slot = (dayOfWeek: DayOfWeek, startTime: string, endTime: string): AvailabilitySlot => ({
  id: `${dayOfWeek}-${startTime}`,
  dayOfWeek,
  startTime,
  endTime,
});

/** Free every evening 18:00–20:00. */
const EVENINGS = ([0, 1, 2, 3, 4, 5, 6] as const).map((d) => slot(d, "18:00", "20:00"));

const session = (
  moduleId: string,
  date: string,
  startTime: string,
  endTime: string,
  status: StudySession["status"] = "planned",
  movedFrom?: string,
): StudySession => ({
  id: `${moduleId}-${date}-${startTime}`,
  moduleId,
  date,
  startTime,
  endTime,
  status,
  ...(movedFrom ? { movedFrom } : {}),
});

const brief = (s: StudySession) => `${s.moduleId} ${s.date} ${s.startTime}–${s.endTime}`;

describe("rescheduleMissed", () => {
  it("moves missed time into the next free block, starting tomorrow", () => {
    const missed = session("hi", "2026-11-16", "18:00", "20:00", "missed");
    const result = rescheduleMissed([missed], [mod("hi", "2026-11-30")], EVENINGS, TODAY);

    expect(result.warnings).toEqual([]);
    expect(result.sessions).toEqual([
      {
        id: "hi-2026-11-18-18:00",
        moduleId: "hi",
        date: "2026-11-18", // tomorrow, not today
        startTime: "18:00",
        endTime: "20:00",
        status: "planned",
        movedFrom: missed.id,
      },
    ]);
  });

  it("only moves missed sessions, not planned or done ones", () => {
    const sessions = [
      session("hi", "2026-11-14", "18:00", "20:00", "done"),
      session("hi", "2026-11-25", "18:00", "20:00", "planned"),
    ];
    expect(rescheduleMissed(sessions, [mod("hi", "2026-11-30")], EVENINGS, TODAY)).toEqual({
      sessions: [],
      warnings: [],
    });
  });

  it("never double-books: it skips time other sessions already use", () => {
    const sessions = [
      session("hi", "2026-11-16", "18:00", "19:00", "missed"),
      // Tomorrow 18:00–19:30 is already planned, so only 19:30–20:00 is open.
      session("hi", "2026-11-18", "18:00", "19:30"),
    ];
    const result = rescheduleMissed(sessions, [mod("hi", "2026-11-30")], EVENINGS, TODAY);
    expect(result.sessions.map(brief)).toEqual(["hi 2026-11-18 19:30–20:00", "hi 2026-11-19 18:00–18:30"]);
  });

  it("never puts the time back into the slot that was missed", () => {
    // Missed in advance: Thursday's only free hour. It must go somewhere else.
    const missed = session("hi", "2026-11-19", "18:00", "19:00", "missed");
    const free = [slot(4, "18:00", "19:00"), slot(6, "10:00", "11:00")]; // Thu, Sat
    const result = rescheduleMissed([missed], [mod("hi", "2026-11-30")], free, TODAY);
    expect(result.sessions.map(brief)).toEqual(["hi 2026-11-21 10:00–11:00"]);
  });

  it("cuts long missed sessions into blocks of at most 2 hours", () => {
    const missed = session("hi", "2026-11-16", "17:00", "20:00", "missed"); // 3 hours
    const free = [slot(3, "13:00", "18:00")]; // Wednesdays 13:00–18:00
    const result = rescheduleMissed([missed], [mod("hi", "2026-11-30")], free, TODAY);
    expect(result.sessions.map(brief)).toEqual(["hi 2026-11-18 13:00–15:00", "hi 2026-11-18 15:00–16:00"]);
  });

  it("never schedules on or after the exam", () => {
    const missed = session("hi", "2026-11-16", "18:00", "20:00", "missed");
    // Exam on Thursday: Wednesday is the only day before it (and it is the day before the exam).
    const result = rescheduleMissed([missed], [mod("hi", "2026-11-19")], EVENINGS, TODAY);
    expect(result.sessions.map(brief)).toEqual(["hi 2026-11-18 18:00–20:00"]);
    expect(result.sessions.every((s) => s.date < "2026-11-19")).toBe(true);
  });

  it("never uses the exam day itself, even when free time continues for other modules", () => {
    const sessions = [
      session("hi", "2026-11-16", "16:00", "20:00", "missed"), // 4 h, exam Thursday
      session("la", "2026-11-16", "20:00", "22:00", "missed"), // 2 h, exam next Monday
    ];
    const modules = [mod("hi", "2026-11-19", 5), mod("la", "2026-11-23", 1)];
    const result = rescheduleMissed(sessions, modules, EVENINGS, TODAY);
    // Wed is History's day before its exam; Thu is History's exam day, so Linear Algebra gets it.
    expect(result.sessions.map(brief)).toEqual(["hi 2026-11-18 18:00–20:00", "la 2026-11-19 18:00–20:00"]);
    expect(result.warnings).toEqual([
      "Not enough free time to move 2 hours of missed History study before its exam on 2026-11-19.",
    ]);
  });

  it("keeps the day before an exam for that exam's module only", () => {
    const sessions = [session("la", "2026-11-16", "18:00", "20:00", "missed")];
    // History's exam is on Thursday, so Wednesday is History's day, even though
    // History has nothing to move. Linear Algebra waits until Thursday.
    const modules = [mod("la", "2026-11-30", 5), mod("hi", "2026-11-19", 1)];
    const result = rescheduleMissed(sessions, modules, EVENINGS, TODAY);
    expect(result.sessions.map(brief)).toEqual(["la 2026-11-19 18:00–20:00"]);
  });

  it("gives free time to the highest priority first (difficulty × hours left ÷ days to exam)", () => {
    const sessions = [
      session("easy", "2026-11-16", "18:00", "20:00", "missed"),
      session("hard", "2026-11-16", "20:00", "22:00", "missed"),
    ];
    const modules = [mod("easy", "2026-12-10", 1), mod("hard", "2026-12-10", 5)];
    const free = [slot(3, "18:00", "20:00"), slot(4, "18:00", "20:00")]; // Wed and Thu
    const result = rescheduleMissed(sessions, modules, free, TODAY);
    expect(result.sessions.map(brief)).toEqual([
      "hard 2026-11-18 18:00–20:00", // score 5×2÷22 beats 1×2÷22
      "easy 2026-11-19 18:00–20:00",
    ]);
  });

  it("never moves the same missed session twice", () => {
    const missed = session("hi", "2026-11-16", "18:00", "20:00", "missed");
    const modules = [mod("hi", "2026-11-30")];
    const first = rescheduleMissed([missed], modules, EVENINGS, TODAY);
    expect(first.sessions).toHaveLength(1);

    // Press the button again with the moved session saved: nothing new.
    const again = rescheduleMissed([missed, ...first.sessions], modules, EVENINGS, TODAY);
    expect(again).toEqual({ sessions: [], warnings: [] });
  });

  it("can move a moved session again if that one is missed too (it is a different session)", () => {
    const first = session("hi", "2026-11-16", "18:00", "20:00", "missed");
    const second = { ...session("hi", "2026-11-18", "18:00", "20:00", "missed", first.id) };
    const result = rescheduleMissed([first, second], [mod("hi", "2026-11-30")], EVENINGS, TODAY);
    expect(result.sessions.map((s) => s.movedFrom)).toEqual([second.id]);
    expect(result.sessions.map(brief)).toEqual(["hi 2026-11-19 18:00–20:00"]);
  });

  it("warns when there isn't enough free time before the exam", () => {
    const missed = session("hi", "2026-11-16", "16:00", "20:00", "missed"); // 4 hours
    // Exam on Friday: Wed 19:30–20:00 (the rest is already planned) + Thu 18:00–20:00 = 2.5 h of 4 h.
    const sessions = [missed, session("hi", "2026-11-18", "18:00", "19:30")];
    const result = rescheduleMissed(sessions, [mod("hi", "2026-11-20")], EVENINGS, TODAY);
    expect(result.sessions.map(brief)).toEqual(["hi 2026-11-18 19:30–20:00", "hi 2026-11-19 18:00–20:00"]);
    expect(result.warnings).toEqual([
      "Not enough free time to move 1.5 hours of missed History study before its exam on 2026-11-20.",
    ]);
  });

  it("doesn't move anything for an exam that has already passed", () => {
    const missed = session("hi", "2026-11-10", "18:00", "20:00", "missed");
    const result = rescheduleMissed([missed], [mod("hi", "2026-11-12")], EVENINGS, TODAY);
    expect(result.sessions).toEqual([]);
    expect(result.warnings).toEqual([
      "History: the exam on 2026-11-12 has already passed, so 2 hours of missed study wasn't moved.",
    ]);
  });

  it("doesn't move anything when the exam is today", () => {
    const missed = session("hi", "2026-11-16", "18:00", "19:00", "missed");
    const result = rescheduleMissed([missed], [mod("hi", TODAY)], EVENINGS, TODAY);
    expect(result.sessions).toEqual([]);
    expect(result.warnings).toEqual([
      "History: the exam on 2026-11-17 is today, so 1 hour of missed study wasn't moved.",
    ]);
  });

  it("doesn't change the sessions it was given", () => {
    const sessions = [session("hi", "2026-11-16", "18:00", "20:00", "missed")];
    const copy = structuredClone(sessions);
    rescheduleMissed(sessions, [mod("hi", "2026-11-30")], EVENINGS, TODAY);
    expect(sessions).toEqual(copy);
  });
});
