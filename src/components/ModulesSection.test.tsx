import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { failNextSave, rowsIn, seed } from "@/test/fakeBackend";
import { renderLoaded } from "@/test/render";
import { ModulesSection } from "./ModulesSection";

const CHEMISTRY = { id: "1", name: "Chemistry", examDate: "2027-01-10", difficulty: 2 as const, estimatedHours: 8 };

beforeEach(() => {
  // Pretend today is 17 Nov 2026 so "future date" checks are predictable.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 17, 12, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

const dialog = () => screen.getByRole("dialog", { name: "Edit module" });
const inDialog = (label: string) => within(dialog()).getByLabelText(label);
const notifications = () => screen.getByRole("region", { name: "Notifications" });

async function openEdit(name = "Chemistry") {
  fireEvent.click(screen.getByRole("button", { name: `Edit ${name}` }));
  return dialog();
}

describe("Editing a module", () => {
  it("opens a pop-up with the module's details filled in", async () => {
    seed("modules", [CHEMISTRY]);
    await renderLoaded(<ModulesSection />);
    await openEdit();

    expect(inDialog("Module name")).toHaveValue("Chemistry");
    expect(within(dialog()).getByRole("button", { name: "Exam date" })).toHaveTextContent(/Jan.*10.*2027|10.*Jan.*2027/);
    expect(inDialog("Difficulty")).toHaveValue("2");
    expect(inDialog("Estimated study hours")).toHaveValue(8);
  });

  it("saves the changes to the same module, with a toast", async () => {
    seed("modules", [CHEMISTRY]);
    await renderLoaded(<ModulesSection />);
    await openEdit();

    fireEvent.change(inDialog("Module name"), { target: { value: "Organic Chemistry" } });
    fireEvent.change(inDialog("Difficulty"), { target: { value: "4" } });
    fireEvent.change(inDialog("Estimated study hours"), { target: { value: "12.5" } });
    fireEvent.click(within(dialog()).getByRole("button", { name: "Exam date" }));
    fireEvent.click(within(dialog()).getByRole("button", { name: /January 20, 2027/ }));
    fireEvent.click(within(dialog()).getByRole("button", { name: "Save changes" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(rowsIn("modules")).toEqual([
      { id: "1", name: "Organic Chemistry", examDate: "2027-01-20", difficulty: 4, estimatedHours: 12.5 },
    ]);
    const list = screen.getByRole("list", { name: "Your modules" });
    expect(within(list).getByText("Organic Chemistry")).toBeInTheDocument();
    expect(within(list).getByText(/Difficulty 4\/5 · 12.5 h/)).toBeInTheDocument();
    expect(await within(notifications()).findByText("Saved Organic Chemistry.")).toBeInTheDocument();
    // Focus goes back to the Edit button you started from.
    expect(screen.getByRole("button", { name: "Edit Organic Chemistry" })).toHaveFocus();
  });

  it("suggests a new plan when the exam, difficulty or hours change and sessions exist", async () => {
    seed("modules", [CHEMISTRY]);
    seed("study_sessions", [
      { id: "s1", moduleId: "1", date: "2026-11-20", startTime: "18:00", endTime: "19:00", status: "planned" },
    ]);
    await renderLoaded(<ModulesSection />);
    await openEdit();
    fireEvent.change(inDialog("Estimated study hours"), { target: { value: "20" } });
    fireEvent.click(within(dialog()).getByRole("button", { name: "Save changes" }));

    expect(
      await within(notifications()).findByText("Saved Chemistry. Generate a new plan on the Plan page to fit the changes."),
    ).toBeInTheDocument();
    // The existing sessions are kept, not deleted.
    expect(rowsIn("study_sessions")).toHaveLength(1);
  });

  it("doesn't suggest a new plan when only the name changes", async () => {
    seed("modules", [CHEMISTRY]);
    seed("study_sessions", [
      { id: "s1", moduleId: "1", date: "2026-11-20", startTime: "18:00", endTime: "19:00", status: "planned" },
    ]);
    await renderLoaded(<ModulesSection />);
    await openEdit();
    fireEvent.change(inDialog("Module name"), { target: { value: "Chem" } });
    fireEvent.click(within(dialog()).getByRole("button", { name: "Save changes" }));
    expect(await within(notifications()).findByText("Saved Chem.")).toBeInTheDocument();
  });

  it("shows errors and saves nothing when the changes are invalid", async () => {
    seed("modules", [CHEMISTRY]);
    await renderLoaded(<ModulesSection />);
    await openEdit();
    fireEvent.change(inDialog("Module name"), { target: { value: "  " } });
    fireEvent.change(inDialog("Estimated study hours"), { target: { value: "0" } });
    fireEvent.click(within(dialog()).getByRole("button", { name: "Save changes" }));

    expect(dialog()).toBeInTheDocument(); // still open
    expect(within(dialog()).getByText("Please enter a module name.")).toBeInTheDocument();
    expect(within(dialog()).getByText("Estimated hours must be more than 0.")).toBeInTheDocument();
    expect(rowsIn("modules")).toEqual([CHEMISTRY]);
  });

  it("lets you fix a module whose exam has already passed, without changing the date", async () => {
    const passed = { ...CHEMISTRY, examDate: "2026-11-10" };
    seed("modules", [passed]);
    await renderLoaded(<ModulesSection />);
    await openEdit();
    fireEvent.change(inDialog("Estimated study hours"), { target: { value: "9" } });
    fireEvent.click(within(dialog()).getByRole("button", { name: "Save changes" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(rowsIn("modules")).toEqual([{ ...passed, estimatedHours: 9 }]);
  });

  it("changes nothing when you press Cancel", async () => {
    seed("modules", [CHEMISTRY]);
    await renderLoaded(<ModulesSection />);
    await openEdit();
    fireEvent.change(inDialog("Module name"), { target: { value: "Something else" } });
    fireEvent.click(within(dialog()).getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(rowsIn("modules")).toEqual([CHEMISTRY]);
    expect(screen.getByText("Chemistry")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit Chemistry" })).toHaveFocus();
  });

  it("shows a red toast and keeps the old details when saving fails", async () => {
    seed("modules", [CHEMISTRY]);
    await renderLoaded(<ModulesSection />);
    await openEdit();
    fireEvent.change(inDialog("Module name"), { target: { value: "Lost change" } });
    failNextSave("network down");
    fireEvent.click(within(dialog()).getByRole("button", { name: "Save changes" }));

    expect(await within(notifications()).findByText(/Couldn't save your change/)).toBeInTheDocument();
    expect(rowsIn("modules")).toEqual([CHEMISTRY]);
    expect(await screen.findByText("Chemistry")).toBeInTheDocument();
  });
});
