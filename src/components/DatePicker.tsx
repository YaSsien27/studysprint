"use client";

// A month calendar for picking a future date (used for exam dates).
// Today and earlier days are greyed out, matching the "must be in the future" rule.

import { useState } from "react";
import { addDays } from "@/lib/dates";
import { useToday } from "@/lib/useToday";
import { todayISO } from "@/lib/validation";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

interface DatePickerProps {
  /** "YYYY-MM-DD", or "" when nothing is chosen yet. */
  value: string;
  onChange: (value: string) => void;
  /** id of the element that names this calendar (its label). */
  labelledBy?: string;
}

const navButtonClass =
  "flex h-9 w-9 items-center justify-center rounded-full text-lg hover:bg-sunken disabled:cursor-not-allowed disabled:opacity-30";

export function DatePicker({ value, onChange, labelledBy }: DatePickerProps) {
  const today = useToday();
  const min = today && addDays(today, 1); // the first pickable day
  // The month on screen; null means "the chosen date's month, or the first pickable month".
  const [shown, setShown] = useState<{ year: number; month: number } | null>(null);

  if (!min) {
    // Same size as the calendar, so the page doesn't jump when it appears.
    return <div className="h-80 w-72" />;
  }

  const [minYear, minMonth] = min.split("-").map(Number);
  const [startYear, startMonth] = (value || min).split("-").map(Number);
  // month is 0-based here (January = 0), like JavaScript's Date.
  const { year, month } = shown ?? { year: startYear, month: startMonth - 1 };

  const canGoBack = year > minYear || (year === minYear && month > minMonth - 1);
  const goToMonth = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setShown({ year: d.getFullYear(), month: d.getMonth() });
  };

  const blanks = (new Date(year, month, 1).getDay() + 6) % 7; // Monday-first week
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = new Date(year, month, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <div role="group" aria-labelledby={labelledBy} className="w-72 max-w-full p-3">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => goToMonth(-1)}
          disabled={!canGoBack}
          aria-label="Previous month"
          className={navButtonClass}
        >
          ‹
        </button>
        <p aria-live="polite" className="text-sm font-medium">
          {monthLabel}
        </p>
        <button
          type="button"
          onClick={() => goToMonth(1)}
          aria-label="Next month"
          className={navButtonClass}
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-ink-muted" aria-hidden="true">
        {WEEKDAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {Array.from({ length: blanks }, (_, i) => (
          <span key={`blank-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const date = new Date(year, month, i + 1);
          const iso = todayISO(date); // formats any date as "YYYY-MM-DD"
          const selected = iso === value;
          return (
            <button
              key={iso}
              type="button"
              disabled={iso < min}
              aria-pressed={selected}
              aria-label={date.toLocaleDateString(undefined, {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              onClick={() => onChange(iso)}
              className={`h-10 rounded-full text-sm tabular-nums transition-colors disabled:cursor-not-allowed disabled:text-ink-faint/60 ${
                selected
                  ? "bg-brand font-semibold text-brand-ink"
                  : "hover:bg-sunken"
              }`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
