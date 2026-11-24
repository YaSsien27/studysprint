"use client";

// The interactive part of /plan: generate a plan, show warnings, and show one
// week of sessions. Each day is a box: 7 side by side on wider screens, a
// day-by-day list on phones (same markup, different layout classes).

import { button } from "@/lib/ui";
import Link from "next/link";
import { useState } from "react";
import { addDays, formatDay, mondayOf } from "@/lib/dates";
import { downloadFile } from "@/lib/download";
import { generateIcs } from "@/lib/ics";
import { generateSchedule, rescheduleMissed } from "@/lib/scheduler";
import type { SessionStatus, StudySession } from "@/types";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { SaveError } from "@/components/SaveError";
import { SessionCard } from "@/components/SessionCard";
import { addRows, replaceRows, updateRow, useTable } from "@/lib/db/store";
import { confirmSave, toast } from "@/lib/toast";
import { useToday } from "@/lib/useToday";

// One colour set per module, by its position in your module list. The colours
// (m1–m8) are defined in globals.css: a strong stripe plus a light tint. The tint
// is mixed with the card colour (not see-through), so a session looks the same
// on a normal day and on a red exam day.
// Full class names are written out because Tailwind only ships classes it can find in the code.
const COLOURS = [
  "border-m1 bg-[color-mix(in_oklab,var(--m1)_12%,var(--surface))]",
  "border-m2 bg-[color-mix(in_oklab,var(--m2)_12%,var(--surface))]",
  "border-m3 bg-[color-mix(in_oklab,var(--m3)_12%,var(--surface))]",
  "border-m4 bg-[color-mix(in_oklab,var(--m4)_12%,var(--surface))]",
  "border-m5 bg-[color-mix(in_oklab,var(--m5)_12%,var(--surface))]",
  "border-m6 bg-[color-mix(in_oklab,var(--m6)_12%,var(--surface))]",
  "border-m7 bg-[color-mix(in_oklab,var(--m7)_12%,var(--surface))]",
  "border-m8 bg-[color-mix(in_oklab,var(--m8)_12%,var(--surface))]",
];
const DELETED_COLOUR = "border-line-strong bg-sunken text-ink-muted";


export function PlanView() {
  const today = useToday();
  const modulesTable = useTable("modules");
  const slotsTable = useTable("availability");
  const sessionsTable = useTable("study_sessions");
  const modules = modulesTable.rows;
  const slots = slotsTable.rows;
  const sessions = sessionsTable.rows;
  // Warnings from the last "Generate plan" or "Move missed sessions" press. Shown, not saved.
  const [warnings, setWarnings] = useState<string[]>([]);
  // Asking "Replace your plan?" before Generate throws away Done/Missed marks.
  const [confirmingReplace, setConfirmingReplace] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0); // 0 = this week, -1 = last week, 1 = next week

  // Until the page runs in the browser we don't know today's date.
  const loading = [modulesTable, slotsTable, sessionsTable].some((t) => t.status === "loading");
  const error = modulesTable.error ?? slotsTable.error ?? sessionsTable.error;
  if (!today || loading) {
    return <p className="text-ink-muted">Loading your plan…</p>;
  }

  const generate = () => {
    const result = generateSchedule(modules, slots, today);
    const count = result.sessions.length;
    void confirmSave(
      replaceRows("study_sessions", result.sessions),
      count === 0
        ? "Plan updated, but no sessions fit. See the warnings."
        : `Plan ready: ${count} study ${count === 1 ? "session" : "sessions"}.`,
    );
    setWarnings(result.warnings);
    setWeekOffset(0);
  };

  // Marks you'd lose by generating again.
  const hasMarks = sessions.some((s) => s.status !== "planned");
  const onGenerateClick = () => (hasMarks ? setConfirmingReplace(true) : generate());

  // Pressing the status you already chose takes it back to "planned".
  const setStatus = (session: StudySession, status: SessionStatus) => {
    const next = session.status === status ? "planned" : status;
    const what = `${nameOf.get(session.moduleId) ?? "Session"} ${session.startTime}–${session.endTime}`;
    const message =
      next === "done" ? `Nice work! ${what} marked as done.` : next === "missed" ? `${what} marked as missed.` : `${what} is planned again.`;
    void confirmSave(updateRow("study_sessions", { ...session, status: next }), message);
  };

  const movedIds = new Set(sessions.map((s) => s.movedFrom));
  const missedToMove = sessions.filter((s) => s.status === "missed" && !movedIds.has(s.id)).length;

  const moveMissed = () => {
    const result = rescheduleMissed(sessions, modules, slots, today);
    setWarnings(result.warnings);
    const count = result.sessions.length;
    if (count === 0) {
      toast.error("No free time was found for your missed sessions before their exams.");
      return;
    }
    void confirmSave(
      addRows("study_sessions", result.sessions),
      `Added ${count} new ${count === 1 ? "session" : "sessions"} for your missed study time. They are marked "Moved".`,
    );
  };

  const colourOf = new Map(modules.map((m, i) => [m.id, COLOURS[i % COLOURS.length]]));
  const nameOf = new Map(modules.map((m) => [m.id, m.name]));

  const weekStart = addDays(mondayOf(today), weekOffset * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekLabel = `${formatDay(days[0], { day: "numeric", month: "short" })} – ${formatDay(days[6], {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;
  const hasPlan = sessions.length > 0 || warnings.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          id="generate-plan"
          type="button"
          onClick={onGenerateClick}
          className={button.accent}
        >
          {hasPlan ? "Generate new plan" : "Generate plan"}
        </button>
        {sessions.length > 0 && (
          <button
            type="button"
            onClick={moveMissed}
            disabled={missedToMove === 0}
            className={button.secondary}
          >
            Move missed sessions{missedToMove > 0 ? ` (${missedToMove})` : ""}
          </button>
        )}
        {sessions.length > 0 && (
          <button
            type="button"
            onClick={() => {
              downloadFile("studysprint-plan.ics", generateIcs(sessions, modules), "text/calendar;charset=utf-8");
              toast.success("Downloaded studysprint-plan.ics. Open it to add the plan to your calendar.");
            }}
            className={button.secondary}
          >
            Export to calendar
          </button>
        )}
        {modules.length === 0 && (
          <p className="text-sm text-ink-muted">
            First add the modules you have exams for on the{" "}
            <Link href="/modules" className="font-medium underline">
              Modules page
            </Link>
            .
          </p>
        )}
        {slots.length === 0 && (
          <p className="text-sm text-ink-muted">
            No free time yet?{" "}
            <Link href="/modules#free-time" className="font-medium underline">
              Answer 3 quick questions
            </Link>{" "}
            to get a suggested week.
          </p>
        )}
      </div>

      <SaveError error={error} />

      {warnings.length > 0 && (
        <section
          aria-labelledby="warnings-heading"
          className="rounded-lg border border-accent bg-accent-soft p-4 text-ink"
        >
          <h2 id="warnings-heading" className="font-semibold">
            Warnings
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </section>
      )}

      {!hasPlan ? (
        <p className="text-ink-muted">No plan yet. Press “Generate plan” to make one.</p>
      ) : (
        <section aria-labelledby="week-heading" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button type="button" onClick={() => setWeekOffset((w) => w - 1)} className={button.secondary}>
              ← Previous week
            </button>
            <h2 id="week-heading" aria-live="polite" className="order-first w-full text-center text-lg font-semibold sm:order-none sm:w-auto">
              {weekLabel}
            </h2>
            <button type="button" onClick={() => setWeekOffset((w) => w + 1)} className={button.secondary}>
              Next week →
            </button>
          </div>

          <ol className="grid grid-cols-1 gap-3 md:grid-cols-7 md:gap-2">
            {days.map((day) => {
              const exams = modules.filter((m) => m.examDate === day);
              const daySessions = sessions
                .filter((s) => s.date === day)
                .sort((a, b) => a.startTime.localeCompare(b.startTime));

              return (
                <li
                  key={day}
                  aria-label={formatDay(day, { weekday: "long", day: "numeric", month: "long" })}
                  className={`flex min-w-0 flex-col gap-2 rounded-lg border p-2 md:min-h-40 ${
                    exams.length > 0
                      ? "border-2 border-danger bg-danger-soft"
                      : day === today
                        ? "border-2 border-accent bg-surface"
                        : "border-line bg-surface"
                  }`}
                >
                  <p className="flex flex-wrap items-baseline gap-x-1 text-sm font-medium">
                    <span>{formatDay(day, { weekday: "short" })}</span>
                    <span className="text-ink-muted">{formatDay(day, { day: "numeric", month: "short" })}</span>
                    {day === today && (
                      <span className="rounded-full bg-accent px-1.5 text-xs font-semibold text-accent-ink">
                        Today
                      </span>
                    )}
                  </p>

                  {exams.map((m) => (
                    <p key={m.id} className="rounded bg-danger px-2 py-1 text-xs font-semibold text-danger-ink">
                      Exam: {m.name}
                    </p>
                  ))}

                  {daySessions.map((s) => (
                    <SessionCard
                      key={s.id}
                      session={s}
                      moduleName={nameOf.get(s.moduleId) ?? "Deleted module"}
                      colourClass={colourOf.get(s.moduleId) ?? DELETED_COLOUR}
                      onSetStatus={(status) => setStatus(s, status)}
                    />
                  ))}

                  {exams.length === 0 && daySessions.length === 0 && (
                    <p className="text-xs text-ink-muted">Nothing planned</p>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {confirmingReplace && (
        <ConfirmDialog
          title="Replace your plan?"
          message="A new plan replaces every session, so the sessions you marked Done or Missed will be lost. To keep them and only catch up on missed time, use “Move missed sessions” instead."
          confirmLabel="Replace plan"
          returnFocusTo="generate-plan"
          onConfirm={() => {
            setConfirmingReplace(false);
            generate();
          }}
          onCancel={() => setConfirmingReplace(false)}
        />
      )}
    </div>
  );
}
