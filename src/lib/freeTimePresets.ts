// Turns three quick answers ("Quick setup") into suggested weekly free-time slots.
// A pure function, like the scheduler. The result is only a starting point:
// the user reviews it and can edit or delete any slot afterwards.

import { MONDAY_FIRST, toTime } from "@/lib/dates";
import type { AvailabilitySlot, DayOfWeek } from "@/types";

export type Situation = "student" | "part-time" | "full-time" | "other";
export type TimeOfDay = "morning" | "afternoon" | "evening";

export interface SetupAnswers {
  situation: Situation;
  timeOfDay: TimeOfDay;
  hoursPerWeek: number;
  /** Only used for "part-time": the days you work. */
  workDays: DayOfWeek[];
}

export interface Suggestion {
  slots: Omit<AvailabilitySlot, "id">[];
  /** Hours that didn't fit, because every day reached its limit. */
  unplacedHours: number;
}

const START: Record<TimeOfDay, number> = { morning: 8 * 60, afternoon: 13 * 60, evening: 18 * 60 };
const AFTER_WORK = 19 * 60;
const AFTER_SHIFT = 20 * 60;
const WEEKEND_FIRST: DayOfWeek[] = [6, 0, 1, 2, 3, 4, 5];

interface DayRule {
  day: DayOfWeek;
  start: number; // minutes after midnight
  maxMinutes: number;
}

// The whole "logic" is this table: for each situation, when each day's study
// time starts and how long it may be. Days are filled in the order listed.
function rulesFor({ situation, timeOfDay, workDays }: SetupAnswers): DayRule[] {
  const start = START[timeOfDay];
  switch (situation) {
    case "student": // Sunday kept lighter
      return MONDAY_FIRST.map((day) => ({ day, start, maxMinutes: day === 0 ? 120 : 240 }));
    case "part-time": // work days only get one short hour after the shift
      return MONDAY_FIRST.map((day) =>
        workDays.includes(day)
          ? { day, start: AFTER_SHIFT, maxMinutes: 60 }
          : { day, start, maxMinutes: 240 },
      );
    case "full-time": // weekdays after work; weekends at the preferred time, filled first
      return WEEKEND_FIRST.map((day) =>
        day === 0 || day === 6
          ? { day, start, maxMinutes: 240 }
          : { day, start: AFTER_WORK, maxMinutes: 120 },
      );
    case "other":
      return MONDAY_FIRST.map((day) => ({ day, start, maxMinutes: 180 }));
  }
}

export function suggestSlots(answers: SetupAnswers): Suggestion {
  const rules = rulesFor(answers);
  const minutes = rules.map(() => 0);
  let left = Math.max(0, Math.round(answers.hoursPerWeek * 60));

  // Hand out one hour at a time, going round the week, so study is spread out.
  let placedThisRound = true;
  while (left > 0 && placedThisRound) {
    placedThisRound = false;
    for (let i = 0; i < rules.length && left > 0; i++) {
      const chunk = Math.min(60, left, rules[i].maxMinutes - minutes[i]);
      if (chunk > 0) {
        minutes[i] += chunk;
        left -= chunk;
        placedThisRound = true;
      }
    }
  }

  const slots = rules
    .map((rule, i) => ({ rule, length: minutes[i] }))
    .filter(({ length }) => length > 0)
    .sort((a, b) => MONDAY_FIRST.indexOf(a.rule.day) - MONDAY_FIRST.indexOf(b.rule.day))
    .map(({ rule, length }) => ({
      dayOfWeek: rule.day,
      startTime: toTime(rule.start),
      endTime: toTime(rule.start + length),
    }));

  return { slots, unplacedHours: left / 60 };
}
