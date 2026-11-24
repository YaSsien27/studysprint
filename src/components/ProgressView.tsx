"use client";

// The interactive part of /progress: hours studied against your target, and
// one bar per module (green = done, light = still planned), with days left.

import { card } from "@/lib/ui";
import Link from "next/link";
import { SaveError } from "@/components/SaveError";
import { formatDay, formatDuration } from "@/lib/dates";
import { useTable } from "@/lib/db/store";
import { computeProgress, describeDaysUntil } from "@/lib/progress";
import { useToday } from "@/lib/useToday";

const percent = (part: number, whole: number) => (whole > 0 ? Math.min(100, (part / whole) * 100) : 0);

export function ProgressView() {
  const today = useToday();
  const modulesTable = useTable("modules");
  const sessionsTable = useTable("study_sessions");

  if (!today || modulesTable.status === "loading" || sessionsTable.status === "loading") {
    return <p className="text-ink-muted">Loading your progress…</p>;
  }

  const error = modulesTable.error ?? sessionsTable.error;
  const progress = computeProgress(modulesTable.rows, sessionsTable.rows, today);

  if (progress.modules.length === 0) {
    return (
      <>
        <SaveError error={error} />
        <p className="text-ink-muted">
          No modules yet. Add them on the{" "}
          <Link href="/modules" className="font-medium underline">
            Modules page
          </Link>
          , then make a plan and mark sessions as done.
        </p>
      </>
    );
  }

  const totalPercent = Math.round(percent(progress.doneMinutes, progress.targetMinutes));

  return (
    <div className="flex flex-col gap-8">
      <SaveError error={error} />

      <section aria-labelledby="total-heading" className={`flex flex-col gap-2 ${card} p-4`}>
        <h2 id="total-heading" className="text-lg font-semibold">
          Hours studied
        </h2>
        <p className="text-3xl font-semibold text-brand tabular-nums">
          {formatDuration(progress.doneMinutes)}{" "}
          <span className="text-base font-normal text-ink-muted">
            of {formatDuration(progress.targetMinutes)} target ({totalPercent}%)
          </span>
        </p>
        <div
          role="progressbar"
          aria-label="Hours studied of target"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={totalPercent}
          className="h-3 overflow-hidden rounded-full bg-line"
        >
          <div className="h-full rounded-full bg-accent" style={{ width: `${totalPercent}%` }} />
        </div>
      </section>

      <section aria-labelledby="modules-heading" className="flex flex-col gap-3">
        <h2 id="modules-heading" className="text-lg font-semibold">
          By module
        </h2>
        <ul className="flex flex-col gap-3">
          {progress.modules.map((m) => {
            // The bar's full width is the target, or more if you've planned past it.
            const scale = Math.max(m.targetMinutes, m.doneMinutes + m.plannedMinutes);
            const passed = m.daysUntilExam < 0;
            return (
              <li
                key={m.id}
                aria-label={m.name}
                className={`flex flex-col gap-2 ${card} p-4`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                  <p className="font-medium">{m.name}</p>
                  <p
                    className={`text-sm ${
                      !passed && m.daysUntilExam <= 3 ? "font-semibold text-danger" : "text-ink-muted"
                    }`}
                  >
                    {describeDaysUntil(m.daysUntilExam)} · {formatDay(m.examDate, { weekday: "short", day: "numeric", month: "short" })}
                  </p>
                </div>

                <div aria-hidden="true" className="flex h-3 overflow-hidden rounded-full bg-line">
                  <div className="h-full bg-success" style={{ width: `${percent(m.doneMinutes, scale)}%` }} />
                  <div className="h-full bg-brand-muted" style={{ width: `${percent(m.plannedMinutes, scale)}%` }} />
                </div>

                <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm tabular-nums">
                  <span>
                    <span aria-hidden="true" className="mr-1 inline-block size-2.5 rounded-full bg-success" />
                    {formatDuration(m.doneMinutes)} done
                  </span>
                  <span>
                    <span aria-hidden="true" className="mr-1 inline-block size-2.5 rounded-full bg-brand-muted" />
                    {formatDuration(m.plannedMinutes)} still planned
                  </span>
                  <span className="text-ink-muted">of {formatDuration(m.targetMinutes)} target</span>
                  {m.missedMinutes > 0 && (
                    <span className="text-ink-muted">· {formatDuration(m.missedMinutes)} missed</span>
                  )}
                </p>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
