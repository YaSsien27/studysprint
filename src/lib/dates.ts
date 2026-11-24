// Helpers for "YYYY-MM-DD" date strings.
// For maths, dates become whole day numbers (days since 1970, in UTC), so
// adding days never trips over time zones or summer-time changes.

import type { DayOfWeek } from "@/types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function toDayNumber(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / MS_PER_DAY;
}

export function fromDayNumber(day: number): string {
  return new Date(day * MS_PER_DAY).toISOString().slice(0, 10);
}

/** 0 = Sunday … 6 = Saturday, like AvailabilitySlot.dayOfWeek. */
export function weekdayOf(day: number): number {
  return new Date(day * MS_PER_DAY).getUTCDay();
}

export function addDays(iso: string, days: number): string {
  return fromDayNumber(toDayNumber(iso) + days);
}

/** The Monday of the week that contains this date. */
export function mondayOf(iso: string): string {
  const day = toDayNumber(iso);
  return fromDayNumber(day - ((weekdayOf(day) + 6) % 7));
}

/** Index matches dayOfWeek: 0 = Sunday … 6 = Saturday. */
export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Weekdays in the order we show them: Monday first. */
export const MONDAY_FIRST: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 0];

/** "18:30" → 1110 (minutes after midnight). */
export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** 1110 → "18:30". */
export function toTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/** 90 → "1 h 30 min". */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** Shows a date in the user's language, e.g. formatDay("2026-12-15", { month: "short" }). */
export function formatDay(iso: string, options: Intl.DateTimeFormatOptions): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, options);
}
