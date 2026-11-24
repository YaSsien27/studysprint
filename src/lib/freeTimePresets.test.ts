import { describe, expect, it } from "vitest";
import { suggestSlots, type SetupAnswers } from "./freeTimePresets";
import { DAY_NAMES, toMinutes } from "./dates";

/** "Mon 19:00-21:00": one readable line per slot. */
function lines(answers: SetupAnswers): string[] {
  return suggestSlots(answers).slots.map(
    (s) => `${DAY_NAMES[s.dayOfWeek].slice(0, 3)} ${s.startTime}-${s.endTime}`,
  );
}

function totalHours(answers: SetupAnswers): number {
  return suggestSlots(answers).slots.reduce(
    (sum, s) => sum + (toMinutes(s.endTime) - toMinutes(s.startTime)) / 60,
    0,
  );
}

describe("suggestSlots", () => {
  it("full-time worker: weekday study after work, weekends filled first", () => {
    const answers: SetupAnswers = { situation: "full-time", timeOfDay: "evening", hoursPerWeek: 10, workDays: [] };
    // Round 1: every day 1 h (7 h). Round 2: Sat, Sun, Mon get a 2nd hour (10 h).
    expect(lines(answers)).toEqual([
      "Mon 19:00-21:00",
      "Tue 19:00-20:00",
      "Wed 19:00-20:00",
      "Thu 19:00-20:00",
      "Fri 19:00-20:00",
      "Sat 18:00-20:00",
      "Sun 18:00-20:00",
    ]);
    expect(suggestSlots(answers).unplacedHours).toBe(0);
  });

  it("student who likes mornings: a few hours are spread over separate days", () => {
    const answers: SetupAnswers = { situation: "student", timeOfDay: "morning", hoursPerWeek: 5, workDays: [] };
    expect(lines(answers)).toEqual([
      "Mon 08:00-09:00",
      "Tue 08:00-09:00",
      "Wed 08:00-09:00",
      "Thu 08:00-09:00",
      "Fri 08:00-09:00",
    ]);
  });

  it("part-time job: work days only get one short hour after the shift", () => {
    const answers: SetupAnswers = {
      situation: "part-time",
      timeOfDay: "afternoon",
      hoursPerWeek: 20,
      workDays: [1, 3, 5], // Mon, Wed, Fri
    };
    expect(lines(answers)).toEqual([
      "Mon 20:00-21:00",
      "Tue 13:00-17:00",
      "Wed 20:00-21:00",
      "Thu 13:00-17:00",
      "Fri 20:00-21:00",
      "Sat 13:00-17:00",
      "Sun 13:00-17:00",
    ]);
    // 3 × 1 h + 4 × 4 h = 19 h; the 20th hour doesn't fit and is reported.
    expect(totalHours(answers)).toBe(19);
    expect(suggestSlots(answers).unplacedHours).toBe(1);
  });

  it("always gives exactly the requested hours when they fit", () => {
    for (const situation of ["student", "part-time", "full-time", "other"] as const) {
      for (const hoursPerWeek of [5, 10, 15]) {
        const answers: SetupAnswers = { situation, timeOfDay: "evening", hoursPerWeek, workDays: [2] };
        expect(totalHours(answers)).toBe(hoursPerWeek);
        expect(suggestSlots(answers).unplacedHours).toBe(0);
      }
    }
  });

  it("never suggests a slot that ends at or before it starts", () => {
    const { slots } = suggestSlots({ situation: "other", timeOfDay: "evening", hoursPerWeek: 20, workDays: [] });
    for (const s of slots) {
      expect(toMinutes(s.endTime)).toBeGreaterThan(toMinutes(s.startTime));
    }
  });
});
