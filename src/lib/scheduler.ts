// Builds a study plan from your modules and weekly free time.
// A pure function: same input, same output. It never reads the clock or storage.

import { fromDayNumber, toDayNumber, toMinutes, toTime, weekdayOf } from "@/lib/dates";
import { isValidDate } from "@/lib/validation";
import type { AvailabilitySlot, Module, StudySession } from "@/types";

export interface Schedule {
  sessions: StudySession[];
  warnings: string[];
}

const MAX_BLOCK_MINUTES = 120;

function formatHours(minutes: number): string {
  const hours = Number((minutes / 60).toFixed(2));
  return `${hours} ${hours === 1 ? "hour" : "hours"}`;
}

/** Each weekday's free time as [start, end] minute pairs, sorted, with overlaps joined. */
function freeTimeByWeekday(availability: AvailabilitySlot[]): [number, number][][] {
  const byDay: [number, number][][] = Array.from({ length: 7 }, () => []);
  for (const slot of availability) {
    const start = toMinutes(slot.startTime);
    const end = toMinutes(slot.endTime);
    if (end > start) byDay[slot.dayOfWeek]?.push([start, end]);
  }
  return byDay.map((ranges) => {
    const merged: [number, number][] = [];
    for (const [start, end] of ranges.sort((a, b) => a[0] - b[0])) {
      const last = merged.at(-1);
      if (last && start <= last[1]) last[1] = Math.max(last[1], end);
      else merged.push([start, end]);
    }
    return merged;
  });
}

interface Candidate {
  module: Module;
  examDay: number;
}

export function generateSchedule(
  modules: Module[],
  availability: AvailabilitySlot[],
  startDate: string,
): Schedule {
  const sessions: StudySession[] = [];
  const warnings: string[] = [];
  const startDay = toDayNumber(startDate);

  // Step 1: drop modules whose exam leaves no study days; count minutes still needed.
  const candidates: Candidate[] = [];
  const minutesLeft = new Map<string, number>();
  for (const mod of modules) {
    if (!isValidDate(mod.examDate)) {
      warnings.push(`${mod.name}: the exam date "${mod.examDate}" is not a valid date, so it was not scheduled.`);
      continue;
    }
    const examDay = toDayNumber(mod.examDate);
    if (examDay < startDay) {
      warnings.push(`${mod.name}: the exam date ${mod.examDate} has already passed, so it was not scheduled.`);
      continue;
    }
    if (examDay === startDay) {
      warnings.push(`${mod.name}: the exam is on ${mod.examDate}, the start date, so there is no time left to schedule it.`);
      continue;
    }
    candidates.push({ module: mod, examDay });
    minutesLeft.set(mod.id, Math.max(0, Math.round(mod.estimatedHours * 60)));
  }

  const freeTime = freeTimeByWeekday(availability);
  const lastStudyDay = Math.max(startDay - 1, ...candidates.map((c) => c.examDay - 1));

  // Step 2: fill each day, from the start date to the day before the last exam.
  for (let day = startDay; day <= lastStudyDay; day++) {
    // The day before an exam belongs to that exam's module only.
    const examTomorrow = candidates.filter((c) => c.examDay === day + 1);
    const allowed = examTomorrow.length > 0 ? examTomorrow : candidates.filter((c) => c.examDay > day);

    const pickBest = (): Candidate | undefined => {
      let best: Candidate | undefined;
      let bestScore = 0;
      for (const c of allowed) {
        const left = minutesLeft.get(c.module.id)!;
        if (left === 0) continue;
        const score = (c.module.difficulty * (left / 60)) / (c.examDay - day);
        if (!best || score > bestScore || (score === bestScore && c.examDay < best.examDay)) {
          best = c;
          bestScore = score;
        }
      }
      return best;
    };

    for (const [slotStart, slotEnd] of freeTime[weekdayOf(day)]) {
      // Cut the free time into blocks of at most 2 hours.
      for (let blockStart = slotStart; blockStart < slotEnd; blockStart += MAX_BLOCK_MINUTES) {
        const blockEnd = Math.min(blockStart + MAX_BLOCK_MINUTES, slotEnd);
        // The best module takes the block; if it needs less, the rest goes to the next best.
        let cursor = blockStart;
        while (cursor < blockEnd) {
          const best = pickBest();
          if (!best) break;
          const length = Math.min(blockEnd - cursor, minutesLeft.get(best.module.id)!);
          const date = fromDayNumber(day);
          sessions.push({
            id: `${best.module.id}-${date}-${toTime(cursor)}`,
            moduleId: best.module.id,
            date,
            startTime: toTime(cursor),
            endTime: toTime(cursor + length),
            status: "planned",
          });
          minutesLeft.set(best.module.id, minutesLeft.get(best.module.id)! - length);
          cursor += length;
        }
      }
    }
  }

  // Step 3: warn about every module that still needs time.
  for (const { module: mod } of candidates) {
    const left = minutesLeft.get(mod.id)!;
    if (left > 0) {
      warnings.push(
        `Not enough free time for ${mod.name}: ${formatHours(left)} couldn't be scheduled before its exam on ${mod.examDate}.`,
      );
    }
  }

  return { sessions, warnings };
}

// ── Moving missed sessions ────────────────────────────────────────────────

/** Free ranges minus busy ranges, e.g. [[18:00,22:00]] minus [[19:00,20:00]] → [[18:00,19:00],[20:00,22:00]]. */
function subtractRanges(free: [number, number][], busy: [number, number][]): [number, number][] {
  let result = free.map(([s, e]) => [s, e] as [number, number]);
  for (const [busyStart, busyEnd] of busy) {
    result = result.flatMap(([s, e]): [number, number][] => {
      if (busyEnd <= s || busyStart >= e) return [[s, e]]; // no overlap
      const pieces: [number, number][] = [];
      if (busyStart > s) pieces.push([s, busyStart]);
      if (busyEnd < e) pieces.push([busyEnd, e]);
      return pieces;
    });
  }
  return result;
}

/**
 * Moves the study time of missed sessions into the next free time before each exam.
 * Returns only the NEW sessions to add (each one's movedFrom says which missed
 * session it replaces) plus warnings. The missed sessions themselves are kept as
 * they are, so your history stays honest.
 *
 * Rules (the same as generateSchedule, plus a few of its own):
 * - Starts tomorrow: today's free time may already be over.
 * - Never on or after the exam; blocks of at most 2 hours.
 * - The day before any exam is only for that exam's module.
 * - Highest priority first: difficulty × missed hours left ÷ days until the exam.
 * - Never uses time already taken by another session (planned, done or missed),
 *   so it never double-books and never goes back into the slot that was missed.
 * - A missed session that has already been moved (some session has movedFrom
 *   equal to its id) is never moved again.
 */
export function rescheduleMissed(
  sessions: StudySession[],
  modules: Module[],
  availability: AvailabilitySlot[],
  today: string,
): Schedule {
  const added: StudySession[] = [];
  const warnings: string[] = [];
  const firstDay = toDayNumber(today) + 1;

  const alreadyMoved = new Set(sessions.map((s) => s.movedFrom).filter(Boolean));
  const moduleById = new Map(modules.map((m) => [m.id, m]));

  // Step 1: for each module, a queue of missed sessions still to move (oldest first).
  const queues = new Map<string, { id: string; minutesLeft: number }[]>();
  const byTime = [...sessions].sort(
    (a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime),
  );
  for (const s of byTime) {
    if (s.status !== "missed" || alreadyMoved.has(s.id) || !moduleById.has(s.moduleId)) continue;
    const minutes = toMinutes(s.endTime) - toMinutes(s.startTime);
    if (minutes <= 0) continue;
    queues.set(s.moduleId, [...(queues.get(s.moduleId) ?? []), { id: s.id, minutesLeft: minutes }]);
  }

  // Step 2: modules whose exam is already over can't get their time back.
  const candidates: Candidate[] = [];
  for (const [moduleId, queue] of queues) {
    const mod = moduleById.get(moduleId)!;
    const missedHours = formatHours(queue.reduce((sum, q) => sum + q.minutesLeft, 0));
    if (!isValidDate(mod.examDate)) {
      warnings.push(`${mod.name}: the exam date "${mod.examDate}" is not a valid date, so ${missedHours} of missed study wasn't moved.`);
      continue;
    }
    const examDay = toDayNumber(mod.examDate);
    if (examDay < firstDay) {
      const when = examDay < firstDay - 1 ? "has already passed" : "is today";
      warnings.push(`${mod.name}: the exam on ${mod.examDate} ${when}, so ${missedHours} of missed study wasn't moved.`);
      continue;
    }
    candidates.push({ module: mod, examDay });
  }

  const minutesLeft = (moduleId: string) =>
    (queues.get(moduleId) ?? []).reduce((sum, q) => sum + q.minutesLeft, 0);

  // Every module's exam reserves the day before it, even if that module has nothing to move.
  const examDays = modules.filter((m) => isValidDate(m.examDate)).map((m) => ({ id: m.id, day: toDayNumber(m.examDate) }));

  // Time already taken, per day: every existing session, whatever its status.
  const busy = new Map<number, [number, number][]>();
  const markBusy = (day: number, start: number, end: number) => busy.set(day, [...(busy.get(day) ?? []), [start, end]]);
  for (const s of sessions) markBusy(toDayNumber(s.date), toMinutes(s.startTime), toMinutes(s.endTime));

  const freeTime = freeTimeByWeekday(availability);
  const lastStudyDay = Math.max(firstDay - 1, ...candidates.map((c) => c.examDay - 1));

  // Step 3: walk forward day by day, filling free time that nothing else uses.
  for (let day = firstDay; day <= lastStudyDay; day++) {
    const reservedFor = examDays.filter((e) => e.day === day + 1).map((e) => e.id);
    const allowed =
      reservedFor.length > 0
        ? candidates.filter((c) => reservedFor.includes(c.module.id))
        : candidates.filter((c) => c.examDay > day);

    const pickBest = (): Candidate | undefined => {
      let best: Candidate | undefined;
      let bestScore = 0;
      for (const c of allowed) {
        const left = minutesLeft(c.module.id);
        if (left === 0) continue;
        const score = (c.module.difficulty * (left / 60)) / (c.examDay - day);
        if (!best || score > bestScore || (score === bestScore && c.examDay < best.examDay)) {
          best = c;
          bestScore = score;
        }
      }
      return best;
    };

    const open = subtractRanges(freeTime[weekdayOf(day)], busy.get(day) ?? []);
    for (const [rangeStart, rangeEnd] of open) {
      for (let blockStart = rangeStart; blockStart < rangeEnd; blockStart += MAX_BLOCK_MINUTES) {
        const blockEnd = Math.min(blockStart + MAX_BLOCK_MINUTES, rangeEnd);
        let cursor = blockStart;
        while (cursor < blockEnd) {
          const best = pickBest();
          if (!best) break;
          // Each new session replaces exactly one missed session, so movedFrom is always accurate.
          const queue = queues.get(best.module.id)!;
          const source = queue[0];
          const length = Math.min(blockEnd - cursor, source.minutesLeft);
          const date = fromDayNumber(day);
          added.push({
            id: `${best.module.id}-${date}-${toTime(cursor)}`,
            moduleId: best.module.id,
            date,
            startTime: toTime(cursor),
            endTime: toTime(cursor + length),
            status: "planned",
            movedFrom: source.id,
          });
          markBusy(day, cursor, cursor + length);
          source.minutesLeft -= length;
          if (source.minutesLeft === 0) queue.shift();
          cursor += length;
        }
      }
    }
  }

  // Step 4: warn about missed time that didn't fit before the exam.
  for (const { module: mod } of candidates) {
    const left = minutesLeft(mod.id);
    if (left > 0) {
      warnings.push(
        `Not enough free time to move ${formatHours(left)} of missed ${mod.name} study before its exam on ${mod.examDate}.`,
      );
    }
  }

  return { sessions: added, warnings };
}
