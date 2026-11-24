"use client";

// The four module fields (name, exam date, difficulty, hours), shared by the
// "add a module" form and the "Edit module" pop-up so both look and work the same.

import { inputClass } from "@/lib/ui";
import { DatePicker } from "@/components/DatePicker";
import { FormField } from "@/components/FormField";
import { PickerField } from "@/components/PickerField";
import { formatDay } from "@/lib/dates";
import type { FieldErrors, ModuleInput } from "@/lib/validation";
import type { Difficulty } from "@/types";

/** What the fields hold while you type (all text; turned into numbers on save). */
export interface ModuleForm {
  name: string;
  examDate: string;
  difficulty: string;
  estimatedHours: string;
}

export const EMPTY_MODULE_FORM: ModuleForm = { name: "", examDate: "", difficulty: "3", estimatedHours: "" };

const DIFFICULTIES: Difficulty[] = [1, 2, 3, 4, 5];

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  1: "1 – Easy",
  2: "2",
  3: "3 – Medium",
  4: "4",
  5: "5 – Very hard",
};

export function formatExamDate(iso: string): string {
  return formatDay(iso, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

/** Turns the typed text into a module's values (an empty hours box becomes NaN, an error). */
export function toModuleInput(form: ModuleForm): ModuleInput {
  return {
    name: form.name.trim(),
    examDate: form.examDate,
    difficulty: Number(form.difficulty),
    estimatedHours: form.estimatedHours === "" ? NaN : Number(form.estimatedHours),
  };
}

interface ModuleFieldsProps {
  /** Start of every field id, e.g. "module" or "edit-module", so ids stay unique. */
  idPrefix: string;
  form: ModuleForm;
  errors: FieldErrors<ModuleInput>;
  onChange: (field: keyof ModuleForm, value: string) => void;
}

export function ModuleFields({ idPrefix, form, errors, onChange }: ModuleFieldsProps) {
  return (
    <>
      <FormField id={`${idPrefix}-name`} label="Module name" error={errors.name}>
        <input
          type="text"
          className={inputClass}
          value={form.name}
          onChange={(e) => onChange("name", e.target.value)}
          placeholder="e.g. Linear Algebra"
        />
      </FormField>

      <FormField id={`${idPrefix}-exam-date`} label="Exam date" error={errors.examDate}>
        <PickerField display={form.examDate ? formatExamDate(form.examDate) : ""} placeholder="Choose a date">
          {(close) => (
            <DatePicker
              value={form.examDate}
              labelledBy={`${idPrefix}-exam-date-label`}
              onChange={(date) => {
                onChange("examDate", date);
                close();
              }}
            />
          )}
        </PickerField>
      </FormField>

      <FormField id={`${idPrefix}-difficulty`} label="Difficulty" error={errors.difficulty}>
        <select className={inputClass} value={form.difficulty} onChange={(e) => onChange("difficulty", e.target.value)}>
          {DIFFICULTIES.map((level) => (
            <option key={level} value={level}>
              {DIFFICULTY_LABELS[level]}
            </option>
          ))}
        </select>
      </FormField>

      <FormField id={`${idPrefix}-hours`} label="Estimated study hours" error={errors.estimatedHours}>
        <input
          type="number"
          min="0.5"
          step="0.5"
          className={inputClass}
          value={form.estimatedHours}
          onChange={(e) => onChange("estimatedHours", e.target.value)}
          placeholder="e.g. 20"
        />
      </FormField>
    </>
  );
}
