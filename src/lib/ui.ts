// Shared looks for buttons, boxes and form inputs, so every page uses the
// same few styles. The colour names (bg-brand, text-ink …) come from
// src/app/globals.css: 70% paper, 20% ink navy, 10% marigold accent.

const shape =
  "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const base = `${shape} px-4 py-2 text-sm`;

export const button = {
  /** The main action of a form or section. Ink navy (the 20%). */
  primary: `${base} bg-brand text-brand-ink hover:bg-brand-hover`,
  /** The ONE most important action on a page. Marigold (part of the 10%). */
  accent: `${base} bg-accent text-accent-ink shadow-sm hover:bg-accent-hover`,
  /** The accent action, bigger: for the home page. */
  accentLarge: `${shape} px-5 py-3 text-base bg-accent text-accent-ink shadow-sm hover:bg-accent-hover`,
  /** Everything else: Cancel, Close, week navigation… */
  secondary: `${base} border border-line-strong bg-surface text-ink hover:bg-sunken`,
  /** Only for deleting. */
  danger: `${base} bg-danger text-danger-ink hover:bg-danger-hover`,
  /** Small text buttons inside lists (Edit, Delete). */
  quiet: "rounded-md px-3 py-1 text-sm text-ink-muted transition-colors hover:bg-sunken hover:text-ink",
  quietDanger: "rounded-md px-3 py-1 text-sm text-danger transition-colors hover:bg-danger-soft",
} as const;

/** A white card on the paper background. */
export const card = "rounded-xl border border-line bg-surface";

/** Text inputs and selects. */
export const inputClass =
  "rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint aria-[invalid=true]:border-danger";
