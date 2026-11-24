import { fireEvent, screen, within } from "@testing-library/react";
import { failNextSave, rowsIn, seed } from "@/test/fakeBackend";
import { renderLoaded } from "@/test/render";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ModulesPage from "./page";

beforeEach(() => {
  // Pretend today is 17 Nov 2026 so "future date" checks are predictable.
  // Only Date is faked, so React's own timers keep working normally.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 17, 12, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

function change(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

/** Tap a field box (e.g. "Exam date", "Start time") to open its picker. */
function open(field: string) {
  fireEvent.click(screen.getByRole("button", { name: field }));
}

/** Show the manual free-time form (hidden until "Add manually" is tapped). */
function openManual() {
  fireEvent.click(screen.getByRole("button", { name: "Add manually" }));
}

/** Tap a number on a time wheel, opening its field first if needed. */
function tapWheel(wheel: string, value: string) {
  if (!screen.queryByRole("listbox", { name: wheel })) {
    open(wheel.replace(/ (hours|minutes)$/, ""));
  }
  const listbox = screen.getByRole("listbox", { name: wheel });
  fireEvent.click(within(listbox).getByRole("option", { name: value }));
}

function selectedOn(wheel: string) {
  const listbox = screen.getByRole("listbox", { name: wheel });
  return within(listbox).getByRole("option", { selected: true }).textContent;
}

describe("/modules page", () => {
  it("shows plain fields until you tap one", async () => {
    await renderLoaded(<ModulesPage />);
    openManual();
    expect(screen.getByRole("button", { name: "Exam date" })).toHaveTextContent("Choose a date");
    expect(screen.getByRole("button", { name: "Start time" })).toHaveTextContent("18:00");
    expect(screen.getByRole("button", { name: "End time" })).toHaveTextContent("19:00");
    expect(screen.queryByRole("button", { name: "Next month" })).not.toBeInTheDocument();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("only lets you pick exam days after today in the calendar", async () => {
    await renderLoaded(<ModulesPage />);
    open("Exam date");
    expect(screen.getByRole("button", { name: /November 1, 2026/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /November 17, 2026/ })).toBeDisabled(); // today
    expect(screen.getByRole("button", { name: /November 18, 2026/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Previous month" })).toBeDisabled();
  });

  it("closes the calendar after picking a day and shows the date in the field", async () => {
    await renderLoaded(<ModulesPage />);
    open("Exam date");
    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    fireEvent.click(screen.getByRole("button", { name: /December 15, 2026/ }));

    const field = screen.getByRole("button", { name: "Exam date" });
    expect(field).toHaveTextContent(/Dec 15, 2026/);
    expect(field).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: "Next month" })).not.toBeInTheDocument();
  });

  it("closes the time wheels with Done, Escape, or a tap outside", async () => {
    await renderLoaded(<ModulesPage />);
    openManual();
    open("Start time");
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

    open("Start time");
    fireEvent.keyDown(screen.getByRole("listbox", { name: "Start time hours" }), { key: "Escape" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

    open("Start time");
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("shows errors and saves nothing when the module form is invalid", async () => {
    await renderLoaded(<ModulesPage />);
    change("Module name", "History");
    change("Estimated study hours", "10");
    // No exam date picked.
    fireEvent.click(screen.getByRole("button", { name: "Add module" }));

    expect(screen.getByText("Please enter a valid exam date.")).toBeInTheDocument();
    expect(screen.getByText("No modules yet.")).toBeInTheDocument();
    expect(rowsIn("modules")).toEqual([]);
  });

  it("adds a module, saves it, and deletes it", async () => {
    await renderLoaded(<ModulesPage />);
    change("Module name", "Linear Algebra");
    open("Exam date");
    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    fireEvent.click(screen.getByRole("button", { name: /December 15, 2026/ }));
    change("Difficulty", "4");
    change("Estimated study hours", "20");
    fireEvent.click(screen.getByRole("button", { name: "Add module" }));

    const modules = screen.getByRole("region", { name: "Modules" });
    expect(within(modules).getByText("Linear Algebra")).toBeInTheDocument();
    const notifications = screen.getByRole("region", { name: "Notifications" });
    expect(await within(notifications).findByText("Added Linear Algebra.")).toBeInTheDocument();

    const saved = rowsIn("modules");
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      name: "Linear Algebra",
      examDate: "2026-12-15",
      difficulty: 4,
      estimatedHours: 20,
    });

    fireEvent.click(screen.getByRole("button", { name: "Delete Linear Algebra" }));
    // Nothing is deleted until you confirm.
    const confirm = screen.getByRole("alertdialog", { name: "Delete module?" });
    expect(confirm).toHaveAccessibleDescription(/Linear Algebra and its exam on .*Dec 15, 2026/);
    expect(within(modules).getByText("Linear Algebra")).toBeInTheDocument();

    fireEvent.click(within(confirm).getByRole("button", { name: "Delete" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(within(modules).queryByText("Linear Algebra")).not.toBeInTheDocument();
    expect(
      await within(notifications).findByText("Deleted Linear Algebra and its study sessions."),
    ).toBeInTheDocument();
    expect(rowsIn("modules")).toEqual([]);
  });

  it("shows a red toast, not a success one, when saving fails", async () => {
    await renderLoaded(<ModulesPage />);
    change("Module name", "History");
    open("Exam date");
    fireEvent.click(screen.getByRole("button", { name: /November 30, 2026/ }));
    change("Estimated study hours", "10");
    failNextSave("network down");
    fireEvent.click(screen.getByRole("button", { name: "Add module" }));

    const notifications = screen.getByRole("region", { name: "Notifications" });
    expect(await within(notifications).findByText(/Couldn't save your change/)).toBeInTheDocument();
    expect(within(notifications).queryByText("Added History.")).not.toBeInTheDocument();
    expect(rowsIn("modules")).toEqual([]);
  });

  it("keeps the module when the delete is cancelled", async () => {
    seed("modules", [
      { id: "1", name: "Chemistry", examDate: "2027-01-10", difficulty: 2, estimatedHours: 8 },
    ]);
    await renderLoaded(<ModulesPage />);
    fireEvent.click(screen.getByRole("button", { name: "Delete Chemistry" }));
    const confirm = screen.getByRole("alertdialog", { name: "Delete module?" });
    expect(within(confirm).getByRole("button", { name: "Cancel" })).toHaveFocus(); // the safe choice

    fireEvent.click(within(confirm).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.getByText("Chemistry")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete Chemistry" })).toHaveFocus();
  });

  it("rejects a slot whose end time is not after its start time", async () => {
    await renderLoaded(<ModulesPage />);
    openManual();
    // Fields start at 18:00 → 19:00; move the end back to 17:00.
    tapWheel("End time hours", "17");
    expect(screen.getByRole("button", { name: "End time" })).toHaveTextContent("17:00");
    fireEvent.click(screen.getByRole("button", { name: "Add time slot" }));

    expect(
      screen.getByText("The end time must be after the start time."),
    ).toBeInTheDocument();
    expect(screen.getByText("No free time added yet.")).toBeInTheDocument();
  });

  it("adds and deletes a weekly free-time slot", async () => {
    await renderLoaded(<ModulesPage />);
    openManual();
    change("Day", "3");
    tapWheel("Start time hours", "18");
    tapWheel("End time hours", "19");
    tapWheel("End time minutes", "30");
    fireEvent.click(screen.getByRole("button", { name: "Add time slot" }));

    // Look only in the saved list ("Wednesday" is also an option in the Day dropdown).
    const slots = screen.getByRole("region", { name: "Weekly free time" });
    const savedList = within(slots).getByRole("list");
    expect(within(savedList).getByText("Wednesday")).toBeInTheDocument();
    expect(within(savedList).getByText("(1 h 30 min)")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Delete Wednesday 18:00–19:30" }),
    );
    const confirm = screen.getByRole("alertdialog", { name: "Delete free time?" });
    expect(confirm).toHaveAccessibleDescription(/Wednesday 18:00–19:30 will be removed/);
    fireEvent.click(within(confirm).getByRole("button", { name: "Delete" }));
    expect(screen.getByText("No free time added yet.")).toBeInTheDocument();
    const notifications = screen.getByRole("region", { name: "Notifications" });
    expect(await within(notifications).findByText("Deleted Wednesday 18:00–19:30.")).toBeInTheDocument();
  });

  it("moves the time wheels with the keyboard", async () => {
    await renderLoaded(<ModulesPage />);
    openManual();
    open("Start time");
    const hours = screen.getByRole("listbox", { name: "Start time hours" });
    expect(selectedOn("Start time hours")).toBe("18");
    fireEvent.keyDown(hours, { key: "ArrowDown" });
    expect(selectedOn("Start time hours")).toBe("19");
    fireEvent.keyDown(hours, { key: "Home" });
    expect(selectedOn("Start time hours")).toBe("00");
  });

  it("shows modules saved in an earlier visit", async () => {
    seed("modules", [
      { id: "1", name: "Chemistry", examDate: "2027-01-10", difficulty: 2, estimatedHours: 8 },
    ]);
    await renderLoaded(<ModulesPage />);
    expect(screen.getByText("Chemistry")).toBeInTheDocument();
  });
});
