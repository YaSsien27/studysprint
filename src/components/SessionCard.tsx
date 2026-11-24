"use client";

// One study session on the plan: module name, time, and two buttons to mark
// it Done or Missed. Pressing the chosen one again sets it back to planned.

import type { SessionStatus, StudySession } from "@/types";

interface SessionCardProps {
  session: StudySession;
  moduleName: string;
  colourClass: string;
  onSetStatus: (status: SessionStatus) => void;
}

const markClass =
  "rounded-md border border-line bg-surface px-1.5 py-0.5 text-xs font-medium text-ink-muted transition-colors hover:text-ink aria-pressed:border-transparent";

export function SessionCard({ session, moduleName, colourClass, onSetStatus }: SessionCardProps) {
  const { status } = session;
  const label = `${moduleName} ${session.startTime}–${session.endTime}`;

  return (
    <div
      role="group"
      aria-label={label}
      // Missed cards look set aside (dashed, grey) but keep readable text:
      // fading them with opacity made the text too faint to read.
      className={`flex flex-col gap-1 rounded-md border border-l-4 px-2 py-1.5 text-sm ${
        status === "missed" ? "border-dashed border-line-strong bg-sunken text-ink-muted" : `text-ink ${colourClass}`
      }`}
    >
      <p className={`font-medium break-words ${status === "done" ? "line-through decoration-2" : ""}`}>{moduleName}</p>
      <p className="text-xs text-ink-muted tabular-nums">
        {session.startTime}–{session.endTime}
      </p>
      {(status !== "planned" || session.movedFrom) && (
        <p className={`text-xs font-semibold ${status === "done" ? "text-ink" : "text-ink-muted"}`}>
          {status === "done" ? "✓ Done" : status === "missed" ? "✗ Missed" : null}
          {status !== "planned" && session.movedFrom ? " · " : null}
          {session.movedFrom ? "Moved" : null}
        </p>
      )}
      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          aria-pressed={status === "done"}
          onClick={() => onSetStatus("done")}
          className={`${markClass} aria-pressed:bg-success aria-pressed:text-success-ink`}
        >
          Done
        </button>
        <button
          type="button"
          aria-pressed={status === "missed"}
          onClick={() => onSetStatus("missed")}
          className={`${markClass} aria-pressed:bg-ink aria-pressed:text-canvas`}
        >
          Missed
        </button>
      </div>
    </div>
  );
}
