"use client";

// "Quick setup": a few tap-only questions that suggest a week of free time.
// The suggestion updates live as you answer. Nothing is saved until you press
// "Use these" (or Replace / Add when you already have free time).

import { button, card } from "@/lib/ui";
import { useState } from "react";
import { DAY_NAMES, MONDAY_FIRST, formatDuration, toMinutes } from "@/lib/dates";
import {
  suggestSlots,
  type SetupAnswers,
  type Situation,
  type TimeOfDay,
} from "@/lib/freeTimePresets";
import type { AvailabilitySlot, DayOfWeek } from "@/types";

const SITUATIONS: { value: Situation; label: string }[] = [
  { value: "student", label: "Full-time student" },
  { value: "part-time", label: "Student with a part-time job" },
  { value: "full-time", label: "Working full-time" },
  { value: "other", label: "Other" },
];

const TIMES: { value: TimeOfDay; label: string }[] = [
  { value: "morning", label: "Mornings" },
  { value: "afternoon", label: "Afternoons" },
  { value: "evening", label: "Evenings" },
];

const HOURS: { value: number; label: string }[] = [
  { value: 5, label: "5 h" },
  { value: 10, label: "10 h" },
  { value: 15, label: "15 h" },
  { value: 20, label: "20+ h" },
];

const DEFAULT_ANSWERS: SetupAnswers = {
  situation: "student",
  timeOfDay: "evening",
  hoursPerWeek: 10,
  workDays: [],
};

// A radio button or checkbox that looks like a tappable pill. has-checked: styles the
// label when its hidden input is ticked; has-focus-visible: shows the keyboard focus.
const pillClass =
  "cursor-pointer select-none rounded-full border border-line-strong bg-surface px-3 py-1.5 text-sm hover:bg-sunken has-checked:border-brand has-checked:bg-brand has-checked:text-brand-ink has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent";


function ChoiceGroup<T extends string | number>({
  legend,
  name,
  options,
  value,
  onChange,
}: {
  legend: string;
  name: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label key={String(option.value)} className={pillClass}>
            <input
              type="radio"
              name={name}
              className="sr-only"
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

interface FreeTimeSetupProps {
  /** How many free-time slots are saved already (decides Use vs Replace/Add). */
  existingCount: number;
  onApply: (slots: Omit<AvailabilitySlot, "id">[], mode: "replace" | "add") => void;
  onClose: () => void;
}

export function FreeTimeSetup({ existingCount, onApply, onClose }: FreeTimeSetupProps) {
  const [answers, setAnswers] = useState(DEFAULT_ANSWERS);

  const update = (changes: Partial<SetupAnswers>) => setAnswers((prev) => ({ ...prev, ...changes }));
  const toggleWorkDay = (day: DayOfWeek) =>
    update({
      workDays: answers.workDays.includes(day)
        ? answers.workDays.filter((d) => d !== day)
        : [...answers.workDays, day],
    });

  const { slots, unplacedHours } = suggestSlots(answers);
  const totalMinutes = slots.reduce((sum, s) => sum + toMinutes(s.endTime) - toMinutes(s.startTime), 0);

  const apply = (mode: "replace" | "add") => {
    onApply(slots, mode);
    onClose();
  };

  return (
    <section
      aria-labelledby="quick-setup-heading"
      className={`flex flex-col gap-5 ${card} p-4`}
    >
      <h3 id="quick-setup-heading" className="font-semibold">
        Quick setup
      </h3>

      <ChoiceGroup
        legend="What's your situation?"
        name="situation"
        options={SITUATIONS}
        value={answers.situation}
        onChange={(situation) => update({ situation })}
      />

      {answers.situation === "part-time" && (
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Which days do you work?</legend>
          <div className="flex flex-wrap gap-2">
            {MONDAY_FIRST.map((day) => (
              <label key={day} className={pillClass}>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={answers.workDays.includes(day)}
                  onChange={() => toggleWorkDay(day)}
                />
                {DAY_NAMES[day]}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <ChoiceGroup
        legend="When do you like to study?"
        name="time-of-day"
        options={TIMES}
        value={answers.timeOfDay}
        onChange={(timeOfDay) => update({ timeOfDay })}
      />

      <ChoiceGroup
        legend="About how many hours a week can you study?"
        name="hours-per-week"
        options={HOURS}
        value={answers.hoursPerWeek}
        onChange={(hoursPerWeek) => update({ hoursPerWeek })}
      />

      <div aria-live="polite" className="rounded-lg bg-brand-soft p-3">
        <p className="text-sm font-medium">
          Suggested free time · {formatDuration(totalMinutes)} a week
        </p>
        <ul aria-label="Suggested free time" className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
          {slots.map((s) => (
            <li key={s.dayOfWeek}>
              <span className="font-medium">{DAY_NAMES[s.dayOfWeek]}</span> {s.startTime}–{s.endTime}
            </li>
          ))}
        </ul>
        {unplacedHours > 0 && (
          <p className="mt-2 text-sm text-ink">
            {unplacedHours} {unplacedHours === 1 ? "hour" : "hours"} didn&apos;t fit in these days. You can add
            more free time yourself below.
          </p>
        )}
        <p className="mt-2 text-xs text-ink-muted">
          These are only suggestions. You can edit or delete any of them afterwards.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {existingCount === 0 ? (
          <button type="button" onClick={() => apply("replace")} className={button.primary}>
            Use these
          </button>
        ) : (
          <>
            <button type="button" onClick={() => apply("replace")} className={button.primary}>
              Replace my free time
            </button>
            <button type="button" onClick={() => apply("add")} className={button.secondary}>
              Add to my free time
            </button>
          </>
        )}
        <button type="button" onClick={onClose} className={button.secondary}>
          Cancel
        </button>
      </div>
    </section>
  );
}
