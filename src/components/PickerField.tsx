"use client";

// A field that looks like a normal input box. Tapping it opens a panel
// (the calendar or the time wheels) just below it. Tapping outside the
// field or pressing Escape closes the panel again.

import { inputClass } from "@/lib/ui";
import { useEffect, useRef, useState, type ReactNode } from "react";

interface PickerFieldProps {
  id?: string;
  /** Text shown in the box, e.g. "Tue, Dec 15, 2026" or "18:00". */
  display: string;
  placeholder?: string;
  /** The panel content; call close() to shut the panel (e.g. after a pick). */
  children: (close: () => void) => ReactNode;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

export function PickerField({
  id = "picker",
  display,
  placeholder = "",
  children,
  ...aria
}: PickerFieldProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // While open, a tap anywhere outside this field closes the panel.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function close() {
    setOpen(false);
    document.getElementById(id)?.focus(); // keep keyboard users where they were
  }

  return (
    <div
      ref={rootRef}
      className="relative"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          close();
        }
      }}
    >
      <button
        id={id}
        type="button"
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        {...aria}
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        className={`${inputClass} flex w-full items-center justify-between gap-2 text-left`}
      >
        <span className={display ? "" : "text-ink-muted"}>{display || placeholder}</span>
        <span
          aria-hidden="true"
          className={`text-ink-faint transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>

      {open && (
        <div
          id={`${id}-panel`}
          // starting: is Tailwind's @starting-style variant: the panel fades and slides in when it appears.
          className="absolute left-0 top-full z-20 mt-2 rounded-lg bg-surface shadow-lg ring-1 ring-line transition duration-150 ease-out starting:-translate-y-1 starting:opacity-0 motion-reduce:transition-none"
        >
          {children(close)}
        </div>
      )}
    </div>
  );
}
