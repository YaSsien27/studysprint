// Rules that check user input before it is saved.
// Each function returns an object of error messages keyed by field name.
// An empty object means the input is valid.

export interface ModuleInput {
  name: string;
  examDate: string;
  difficulty: number;
  estimatedHours: number;
}

export interface SlotInput {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Today's date in the user's local time zone, as "YYYY-MM-DD". */
export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** True if the string is a real calendar date like "2026-02-28" (not "2026-02-30"). */
export function isValidDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return (
    date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
  );
}

/** True if the string is a 24-hour time like "09:30". */
function isValidTime(value: string): boolean {
  return TIME_PATTERN.test(value);
}

/**
 * Checks a new or edited module. `today` is passed in (as "YYYY-MM-DD") so
 * tests can use a fixed date.
 *
 * `savedExamDate` is for editing: the module's current exam date. Keeping it
 * is always fine, even if that exam has passed, so you can still fix the name
 * or hours. A new date must be in the future.
 */
export function validateModule(
  input: ModuleInput,
  today: string = todayISO(),
  savedExamDate?: string,
): FieldErrors<ModuleInput> {
  const errors: FieldErrors<ModuleInput> = {};

  if (input.name.trim() === "") {
    errors.name = "Please enter a module name.";
  }

  if (!isValidDate(input.examDate)) {
    errors.examDate = "Please enter a valid exam date.";
  } else if (input.examDate <= today && input.examDate !== savedExamDate) {
    // "YYYY-MM-DD" strings sort the same way as the dates they represent.
    errors.examDate = "The exam date must be in the future.";
  }

  if (
    !Number.isInteger(input.difficulty) ||
    input.difficulty < 1 ||
    input.difficulty > 5
  ) {
    errors.difficulty = "Difficulty must be a whole number from 1 to 5.";
  }

  if (!Number.isFinite(input.estimatedHours) || input.estimatedHours <= 0) {
    errors.estimatedHours = "Estimated hours must be more than 0.";
  } else if (input.estimatedHours > 1000) {
    errors.estimatedHours = "Estimated hours must be 1000 or less.";
  }

  return errors;
}

/** Checks a new weekly free-time slot. */
export function validateSlot(input: SlotInput): FieldErrors<SlotInput> {
  const errors: FieldErrors<SlotInput> = {};

  if (
    !Number.isInteger(input.dayOfWeek) ||
    input.dayOfWeek < 0 ||
    input.dayOfWeek > 6
  ) {
    errors.dayOfWeek = "Please choose a day of the week.";
  }

  if (!isValidTime(input.startTime)) {
    errors.startTime = "Please enter a valid start time.";
  }

  if (!isValidTime(input.endTime)) {
    errors.endTime = "Please enter a valid end time.";
  } else if (isValidTime(input.startTime) && input.endTime <= input.startTime) {
    // "HH:MM" strings sort the same way as the times they represent.
    errors.endTime = "The end time must be after the start time.";
  }

  return errors;
}

/** True if a validation result has no errors. */
export function hasErrors(errors: object): boolean {
  return Object.keys(errors).length > 0;
}

export const NAME_MAX = 40;
// Letters from any language (é, ñ, ü, Arabic, …), plus spaces, apostrophes,
// dots and dashes, e.g. "Mary-Jane O'Neil" or "J. R. Smith".
const NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M} '.-]*$/u;

/** Tidies a name before checking or saving it: no spaces at the ends, no double spaces. */
export function cleanName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

/**
 * Checks the name asked for at sign-up (shown in the header).
 * Returns an error message, or null when it is fine.
 */
export function validateName(name: string): string | null {
  const clean = cleanName(name);
  if (clean === "") return "Please enter your name.";
  if (clean.length > NAME_MAX) return `Your name must be ${NAME_MAX} characters or less.`;
  if (!NAME_PATTERN.test(clean)) return "Use only letters, spaces, dots, dashes and apostrophes in your name.";
  return null;
}
