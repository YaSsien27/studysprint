import { fireEvent, screen, within } from "@testing-library/react";
import { rowsIn, seed } from "@/test/fakeBackend";
import { renderLoaded } from "@/test/render";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AvailabilitySlot, Module } from "@/types";
import PlanPage from "./page";

// Today is Tuesday 17 November 2026. This week: Mon 16 – Sun 22.
const MODULES: Module[] = [
  { id: "la", name: "Linear Algebra", examDate: "2026-11-20", difficulty: 3, estimatedHours: 4 },
  { id: "hi", name: "History", examDate: "2026-11-27", difficulty: 2, estimatedHours: 30 },
];
const EVERY_EVENING: AvailabilitySlot[] = ([0, 1, 2, 3, 4, 5, 6] as const).map((d) => ({
  id: `s${d}`,
  dayOfWeek: d,
  startTime: "18:00",
  endTime: "20:00",
}));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 17, 12, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

function saveSetup() {
  seed("modules", MODULES);
  seed("availability", EVERY_EVENING);
}

/** The box for one day, e.g. day(/November 19/). */
function day(name: RegExp) {
  return screen.getByRole("listitem", { name });
}

describe("/plan page", () => {
  it("asks for modules and free time when there are none", async () => {
    await renderLoaded(<PlanPage />);
    expect(screen.getByRole("link", { name: "Modules page" })).toHaveAttribute("href", "/modules");
    expect(screen.getByRole("link", { name: "Answer 3 quick questions" })).toHaveAttribute(
      "href",
      "/modules#free-time",
    );
    expect(screen.getByText(/No plan yet/)).toBeInTheDocument();
  });

  it("only points to quick setup when free time is the missing part", async () => {
    seed("modules", MODULES);
    await renderLoaded(<PlanPage />);
    expect(screen.queryByRole("link", { name: "Modules page" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Answer 3 quick questions" })).toBeInTheDocument();
  });

  it("generates a plan from today, saves it, and shows this week", async () => {
    saveSetup();
    await renderLoaded(<PlanPage />);
    fireEvent.click(screen.getByRole("button", { name: "Generate plan" }));

    // Saved in the database: History Tue–Wed, Fri–Thu (9 evenings) + Linear Algebra Thu 19.
    const saved = rowsIn("study_sessions");
    expect(saved).toHaveLength(10);
    expect(saved[0]).toMatchObject({ moduleId: "hi", date: "2026-11-17", status: "planned" });

    expect(screen.getByRole("heading", { name: /Nov 16.*Nov 22, 2026/ })).toBeInTheDocument();

    expect(within(day(/November 16/)).getByText("Nothing planned")).toBeInTheDocument(); // before today
    expect(within(day(/November 17/)).getByText("Today")).toBeInTheDocument();
    expect(within(day(/November 17/)).getByText("History")).toBeInTheDocument();

    // Thursday is the day before the Linear Algebra exam.
    const thursday = within(day(/November 19/));
    expect(thursday.getByText("Linear Algebra")).toBeInTheDocument();
    expect(thursday.getByText("18:00–20:00")).toBeInTheDocument();
    expect(thursday.queryByText("History")).not.toBeInTheDocument();

    // Friday is exam day.
    expect(within(day(/November 20/)).getByText("Exam: Linear Algebra")).toBeInTheDocument();
  });

  it("shows the scheduler's warnings above the grid", async () => {
    saveSetup();
    await renderLoaded(<PlanPage />);
    fireEvent.click(screen.getByRole("button", { name: "Generate plan" }));

    const warnings = screen.getByRole("region", { name: "Warnings" });
    expect(within(warnings).getByText(/Linear Algebra: 2 hours couldn't be scheduled/)).toBeInTheDocument();
    expect(within(warnings).getByText(/History: 12 hours couldn't be scheduled/)).toBeInTheDocument();
    // "Above the grid": the warnings come before the week in the page.
    const week = screen.getByRole("region", { name: /Nov 16/ });
    expect(warnings.compareDocumentPosition(week) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("gives each module its own colour", async () => {
    saveSetup();
    await renderLoaded(<PlanPage />);
    fireEvent.click(screen.getByRole("button", { name: "Generate plan" }));

    const laCard = within(day(/November 19/)).getByText("Linear Algebra").closest("div")!;
    const hiCard = within(day(/November 18/)).getByText("History").closest("div")!;
    const hiCard2 = within(day(/November 21/)).getByText("History").closest("div")!;
    expect(laCard.className).not.toBe(hiCard.className);
    expect(hiCard.className).toBe(hiCard2.className); // same module, same colour
  });

  it("moves between weeks", async () => {
    saveSetup();
    await renderLoaded(<PlanPage />);
    fireEvent.click(screen.getByRole("button", { name: "Generate plan" }));

    fireEvent.click(screen.getByRole("button", { name: "Next week →" }));
    expect(screen.getByRole("heading", { name: /Nov 23.*Nov 29, 2026/ })).toBeInTheDocument();
    expect(within(day(/November 26/)).getByText("History")).toBeInTheDocument();
    expect(within(day(/November 27/)).getByText("Exam: History")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "← Previous week" }));
    fireEvent.click(screen.getByRole("button", { name: "← Previous week" }));
    expect(screen.getByRole("heading", { name: /Nov 9.*Nov 15, 2026/ })).toBeInTheDocument();
    expect(screen.getAllByText("Nothing planned")).toHaveLength(7);
  });

  it("marks a session done or missed and saves it; pressing again undoes it", async () => {
    saveSetup();
    await renderLoaded(<PlanPage />);
    fireEvent.click(screen.getByRole("button", { name: "Generate plan" }));
    const notifications = screen.getByRole("region", { name: "Notifications" });
    expect(await within(notifications).findByText("Plan ready: 10 study sessions.")).toBeInTheDocument();

    const card = within(day(/November 19/)).getByRole("group", { name: "Linear Algebra 18:00–20:00" });
    const statusOf = () => rowsIn("study_sessions").find((s) => s.date === "2026-11-19")!.status;

    fireEvent.click(within(card).getByRole("button", { name: "Done" }));
    expect(within(card).getByRole("button", { name: "Done" })).toHaveAttribute("aria-pressed", "true");
    expect(within(card).getByText("✓ Done")).toBeInTheDocument();
    expect(statusOf()).toBe("done");
    expect(
      await within(notifications).findByText("Nice work! Linear Algebra 18:00–20:00 marked as done."),
    ).toBeInTheDocument();

    fireEvent.click(within(card).getByRole("button", { name: "Missed" }));
    expect(statusOf()).toBe("missed");

    fireEvent.click(within(card).getByRole("button", { name: "Missed" }));
    expect(statusOf()).toBe("planned");
  });

  it("moves missed sessions into new ones, and only once", async () => {
    // A plan with just one History session (yesterday), so the evenings are free.
    saveSetup();
    seed("study_sessions", [
      { id: "hi-2026-11-16-18:00", moduleId: "hi", date: "2026-11-16", startTime: "18:00", endTime: "20:00", status: "planned" },
    ]);
    await renderLoaded(<PlanPage />);
    expect(screen.getByRole("button", { name: "Move missed sessions" })).toBeDisabled();

    const monday = within(day(/November 16/)).getByRole("group", { name: "History 18:00–20:00" });
    fireEvent.click(within(monday).getByRole("button", { name: "Missed" }));
    fireEvent.click(screen.getByRole("button", { name: "Move missed sessions (1)" }));

    const notifications = screen.getByRole("region", { name: "Notifications" });
    expect(await within(notifications).findByText(/Added 1 new session/)).toBeInTheDocument();
    const moved = rowsIn("study_sessions").filter((s) => s.movedFrom === "hi-2026-11-16-18:00");
    // Tomorrow (Wed 18th) evening; the plan shows it as Moved.
    expect(moved).toMatchObject([{ date: "2026-11-18", startTime: "18:00", endTime: "20:00", status: "planned" }]);
    expect(within(day(/November 18/)).getByText("Moved")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Move missed sessions" })).toBeDisabled(); // nothing left to move
  });

  it("asks before a new plan throws away Done and Missed marks", async () => {
    saveSetup();
    await renderLoaded(<PlanPage />);
    fireEvent.click(screen.getByRole("button", { name: "Generate plan" }));
    const card = within(day(/November 19/)).getByRole("group", { name: "Linear Algebra 18:00–20:00" });
    fireEvent.click(within(card).getByRole("button", { name: "Done" }));

    fireEvent.click(screen.getByRole("button", { name: "Generate new plan" }));
    const confirm = screen.getByRole("alertdialog", { name: "Replace your plan?" });
    fireEvent.click(within(confirm).getByRole("button", { name: "Cancel" }));
    expect(rowsIn("study_sessions").some((s) => s.status === "done")).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Generate new plan" }));
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Replace plan" }));
    expect(rowsIn("study_sessions").every((s) => s.status === "planned")).toBe(true);
  });

  it("downloads the plan as studysprint-plan.ics", async () => {
    saveSetup();
    await renderLoaded(<PlanPage />);
    expect(screen.queryByRole("button", { name: "Export to calendar" })).not.toBeInTheDocument(); // no plan yet
    fireEvent.click(screen.getByRole("button", { name: "Generate plan" }));

    // jsdom can't really download, so catch the file and the link click instead.
    let file: Blob | undefined;
    URL.createObjectURL = vi.fn((blob: Blob) => {
      file = blob;
      return "blob:plan";
    });
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe("studysprint-plan.ics");
      expect(this.href).toBe("blob:plan");
    });

    fireEvent.click(screen.getByRole("button", { name: "Export to calendar" }));
    expect(click).toHaveBeenCalledOnce();
    expect(screen.getByRole("region", { name: "Notifications" })).toHaveTextContent("Downloaded studysprint-plan.ics");
    expect(file!.type).toBe("text/calendar;charset=utf-8");
    const text = await file!.text();
    expect(text).toMatch(/^BEGIN:VCALENDAR\r\n/);
    expect(text).toContain("SUMMARY:Study: Linear Algebra\r\n");
    click.mockRestore();
  });

  it("keeps the plan after the page is reopened", async () => {
    saveSetup();
    const { unmount } = await renderLoaded(<PlanPage />);
    fireEvent.click(screen.getByRole("button", { name: "Generate plan" }));
    unmount();

    await renderLoaded(<PlanPage />);
    expect(within(day(/November 19/)).getByText("Linear Algebra")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate new plan" })).toBeInTheDocument();
  });
});
