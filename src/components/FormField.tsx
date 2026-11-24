// A label + input + error message wrapper, reused by every form field.
// The error is linked to the input (aria-describedby) so screen readers read it out.

import type { ReactElement } from "react";
import { cloneElement } from "react";

interface FormFieldProps {
  id: string;
  label: string;
  /** Short help shown under the label (also read out by screen readers). */
  hint?: string;
  error?: string;
  /** A single <input> or <select> element. */
  children: ReactElement<{
    id?: string;
    "aria-invalid"?: boolean;
    "aria-describedby"?: string;
  }>;
}

export function FormField({ id, label, hint, error, children }: FormFieldProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ");

  return (
    <div className="flex flex-col gap-1">
      {/* The label id lets non-input fields (calendar, time wheel) use it as their name. */}
      <label id={`${id}-label`} htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="text-xs text-ink-muted">
          {hint}
        </p>
      )}
      {cloneElement(children, {
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy || undefined,
      })}
      {error && (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
