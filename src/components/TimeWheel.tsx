"use client";

// An iPhone-style time picker: two scrollable wheels (hours and minutes) that
// snap to the middle row. Works with touch, mouse wheel, tapping a number, and
// the keyboard (↑ ↓ Home End).

import { useEffect, useRef, type KeyboardEvent } from "react";

const ROW = 40; // height of one row in px (Tailwind h-10)
const VISIBLE_ROWS = 5;
const PAD = ((VISIBLE_ROWS - 1) / 2) * ROW; // space above/below so the first and last rows can reach the middle
const FADE = "linear-gradient(to bottom, transparent, black 35%, black 65%, transparent)";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

interface WheelColumnProps {
  id: string;
  labelledBy: string;
  options: string[];
  selected: number;
  onSelect: (index: number) => void;
}

function WheelColumn({ id, labelledBy, options, selected, onSelect }: WheelColumnProps) {
  const ref = useRef<HTMLDivElement>(null);
  const scrollTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Line the wheel up with the value: on first show, after a tap, or after a form reset.
  // The CSS class scroll-smooth makes this glide instead of jump.
  useEffect(() => {
    const el = ref.current;
    if (el && Math.abs(el.scrollTop - selected * ROW) > 1) el.scrollTop = selected * ROW;
  }, [selected]);

  useEffect(() => () => clearTimeout(scrollTimer.current), []);

  // Pick the row in the middle once scrolling has stopped for a moment.
  function handleScroll() {
    clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const index = Math.min(options.length - 1, Math.max(0, Math.round(el.scrollTop / ROW)));
      if (index !== selected) onSelect(index);
    }, 120);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const next =
      event.key === "ArrowDown" ? selected + 1
      : event.key === "ArrowUp" ? selected - 1
      : event.key === "Home" ? 0
      : event.key === "End" ? options.length - 1
      : null;
    if (next === null) return;
    event.preventDefault();
    onSelect(Math.min(options.length - 1, Math.max(0, next)));
  }

  return (
    <div className="relative w-16" style={{ height: VISIBLE_ROWS * ROW }}>
      {/* The highlight band behind the middle row. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 h-10 rounded-md bg-sunken"
        style={{ top: PAD }}
      />
      <div
        ref={ref}
        role="listbox"
        tabIndex={0}
        aria-labelledby={labelledBy}
        aria-activedescendant={`${id}-${selected}`}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        className="relative h-full snap-y snap-mandatory overflow-y-scroll overscroll-contain scroll-smooth rounded-md outline-offset-2 [scrollbar-width:none] focus-visible:outline-2 focus-visible:outline-accent motion-reduce:scroll-auto [&::-webkit-scrollbar]:hidden"
        style={{ paddingBlock: PAD, maskImage: FADE, WebkitMaskImage: FADE }}
      >
        {options.map((option, index) => (
          <div
            key={option}
            id={`${id}-${index}`}
            role="option"
            aria-selected={index === selected}
            onClick={() => onSelect(index)}
            className={`flex h-10 cursor-pointer snap-center items-center justify-center text-lg tabular-nums transition-colors ${
              index === selected
                ? "font-semibold text-ink"
                : "text-ink-muted"
            }`}
          >
            {option}
          </div>
        ))}
      </div>
    </div>
  );
}

interface TimeWheelProps {
  /** Used to build unique ids for the wheel rows. */
  id: string;
  /** id of the element that names this picker (its label), e.g. "Start time". */
  labelledBy: string;
  /** "HH:MM", 24-hour. */
  value: string;
  onChange: (value: string) => void;
}

export function TimeWheel({ id, labelledBy, value, onChange }: TimeWheelProps) {
  const [hours, minutes] = value.split(":").map(Number);
  const hourIndex = Math.min(23, Math.max(0, hours || 0));
  const minuteIndex = Math.min(11, Math.round((minutes || 0) / 5)); // nearest 5 minutes

  return (
    <div role="group" aria-labelledby={labelledBy} className="flex w-fit items-center gap-1">
      {/* Hidden words that finish each wheel's name, e.g. "Start time hours". */}
      <span id={`${id}-hours`} hidden>
        hours
      </span>
      <span id={`${id}-minutes`} hidden>
        minutes
      </span>

      <WheelColumn
        id={`${id}-h`}
        labelledBy={`${labelledBy} ${id}-hours`}
        options={HOURS}
        selected={hourIndex}
        onSelect={(i) => onChange(`${HOURS[i]}:${MINUTES[minuteIndex]}`)}
      />
      <span aria-hidden="true" className="text-lg font-semibold">
        :
      </span>
      <WheelColumn
        id={`${id}-m`}
        labelledBy={`${labelledBy} ${id}-minutes`}
        options={MINUTES}
        selected={minuteIndex}
        onSelect={(i) => onChange(`${HOURS[hourIndex]}:${MINUTES[i]}`)}
      />
    </div>
  );
}
