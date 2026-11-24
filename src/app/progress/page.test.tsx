import { screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { seed } from "@/test/fakeBackend";
import { renderLoaded } from "@/test/render";
import type { Module, StudySession } from "@/types";
import ProgressPage from "./page";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 17, 12, 0)); // Tue 17 Nov 2026
});

afterEach(() => {
  vi.useRealTimers();
});

const MODULES: Module[] = [
  { id: "hi", name: "History", examDate: "2026-11-27", difficulty: 2, estimatedHours: 10 },
  { id: "la", name: "Linear Algebra", examDate: "2026-11-19", difficulty: 4, estimatedHours: 2 },
];

const session = (moduleId: string, date: string, status: StudySession["status"]): StudySession => ({
  id: `${moduleId}-${date}`,
  moduleId,
  date,
  startTime: "18:00",
  endTime: "20:00",
  status,
});

describe("/progress page", () => {
  it("shows total hours studied against the target", async () => {
    seed("modules", MODULES);
    seed("study_sessions", [session("hi", "2026-11-15", "done"), session("la", "2026-11-16", "done")]);
    await renderLoaded(<ProgressPage />);

    const total = screen.getByRole("region", { name: "Hours studied" });
    expect(total).toHaveTextContent("4 h of 12 h target (33%)");
    expect(within(total).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "33");
  });

  it("shows done vs still planned, and days until the exam, per module (soonest first)", async () => {
    seed("modules", MODULES);
    seed("study_sessions", [
      session("hi", "2026-11-15", "done"),
      session("hi", "2026-11-16", "missed"),
      session("hi", "2026-11-18", "planned"),
      session("hi", "2026-11-20", "planned"),
    ]);
    await renderLoaded(<ProgressPage />);

    const items = screen.getAllByRole("listitem");
    expect(items.map((li) => li.getAttribute("aria-label"))).toEqual(["Linear Algebra", "History"]);

    const history = screen.getByRole("listitem", { name: "History" });
    expect(history).toHaveTextContent("Exam in 10 days");
    expect(history).toHaveTextContent("2 h done");
    expect(history).toHaveTextContent("4 h still planned");
    expect(history).toHaveTextContent("of 10 h target");
    expect(history).toHaveTextContent("2 h missed");

    expect(screen.getByRole("listitem", { name: "Linear Algebra" })).toHaveTextContent("Exam in 2 days");
  });

  it("points to the Modules page when there is nothing yet", async () => {
    await renderLoaded(<ProgressPage />);
    expect(screen.getByRole("link", { name: "Modules page" })).toHaveAttribute("href", "/modules");
  });
});
