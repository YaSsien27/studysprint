import { fireEvent, screen, within } from "@testing-library/react";
import { rowsIn, seed } from "@/test/fakeBackend";
import { renderLoaded } from "@/test/render";
import { beforeEach, describe, expect, it } from "vitest";
import type { AvailabilitySlot } from "@/types";
import { SlotsSection } from "./SlotsSection";

const MONDAY: AvailabilitySlot = { id: "mon", dayOfWeek: 1, startTime: "18:00", endTime: "19:00" };

beforeEach(() => {
  seed("availability", [MONDAY]);
});

function saved() {
  return rowsIn("availability");
}

function openEditor() {
  fireEvent.click(screen.getByRole("button", { name: "Edit Monday 18:00–19:00" }));
  return screen.getByRole("dialog", { name: "Edit free time" });
}

/** Tap a number on one of the pop-up's time wheels. */
function tapWheel(dialog: HTMLElement, wheel: string, value: string) {
  const listbox = within(dialog).getByRole("listbox", { name: wheel });
  fireEvent.click(within(listbox).getByRole("option", { name: value }));
}

describe("Adding free time", () => {
  it("shows Quick setup and Add manually side by side, with the manual form hidden", async () => {
    await renderLoaded(<SlotsSection />);
    expect(screen.getByRole("button", { name: "Quick setup" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: "Add manually" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("form", { name: "Add free time manually" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add manually" }));
    expect(screen.getByRole("form", { name: "Add free time manually" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add manually" })).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("form", { name: "Add free time manually" })).not.toBeInTheDocument();
  });

  it("switches between Quick setup and the manual form", async () => {
    await renderLoaded(<SlotsSection />);
    fireEvent.click(screen.getByRole("button", { name: "Add manually" }));
    fireEvent.click(screen.getByRole("button", { name: "Quick setup" }));

    expect(screen.getByRole("heading", { name: "Quick setup" })).toBeInTheDocument();
    expect(screen.queryByRole("form", { name: "Add free time manually" })).not.toBeInTheDocument();
  });
});

describe("Deleting free time", () => {
  function askToDelete() {
    fireEvent.click(screen.getByRole("button", { name: "Delete Monday 18:00–19:00" }));
    return screen.getByRole("alertdialog", { name: "Delete free time?" });
  }

  it("asks first, and deletes only after Delete is pressed", async () => {
    await renderLoaded(<SlotsSection />);
    const confirm = askToDelete();
    expect(confirm).toHaveAccessibleDescription(/Monday 18:00–19:00 will be removed/);
    expect(within(confirm).getByRole("button", { name: "Cancel" })).toHaveFocus();
    expect(saved()).toEqual([MONDAY]); // nothing deleted yet

    fireEvent.click(within(confirm).getByRole("button", { name: "Delete" }));
    expect(saved()).toEqual([]);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("keeps the slot on Cancel, Escape, or a tap outside the box", async () => {
    await renderLoaded(<SlotsSection />);

    fireEvent.click(within(askToDelete()).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete Monday 18:00–19:00" })).toHaveFocus();

    const confirm = askToDelete();
    fireEvent.keyDown(within(confirm).getByRole("button", { name: "Cancel" }), { key: "Escape" });
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

    fireEvent.click(askToDelete()); // the dark area around the box
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

    expect(saved()).toEqual([MONDAY]);
  });
});

describe("Editing free time in a pop-up", () => {
  it("opens with the slot's values and saves the change in place", async () => {
    await renderLoaded(<SlotsSection />);
    const dialog = openEditor();

    expect(within(dialog).getByLabelText("Day")).toHaveValue("1");
    expect(
      within(within(dialog).getByRole("listbox", { name: "End time hours" })).getByRole("option", {
        selected: true,
      }),
    ).toHaveTextContent("19");

    fireEvent.change(within(dialog).getByLabelText("Day"), { target: { value: "2" } });
    tapWheel(dialog, "End time hours", "20");
    fireEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));

    expect(
      await within(screen.getByRole("region", { name: "Notifications" })).findByText("Saved Tuesday 18:00–20:00."),
    ).toBeInTheDocument();
    // Same slot (same id), new values; nothing added; pop-up closed.
    expect(saved()).toEqual([{ id: "mon", dayOfWeek: 2, startTime: "18:00", endTime: "20:00" }]);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    // Focus goes back to the slot's Edit button, so you stay where you were.
    expect(screen.getByRole("button", { name: "Edit Tuesday 18:00–20:00" })).toHaveFocus();
  });

  it("shows the time error inside the pop-up and saves nothing", async () => {
    await renderLoaded(<SlotsSection />);
    const dialog = openEditor();
    tapWheel(dialog, "End time hours", "17");
    fireEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));

    expect(within(dialog).getByRole("alert")).toHaveTextContent("The end time must be after the start time.");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(saved()).toEqual([MONDAY]);
  });

  it("closes without saving on Cancel, Escape, or a tap outside the box", async () => {
    await renderLoaded(<SlotsSection />);

    let dialog = openEditor();
    tapWheel(dialog, "End time hours", "21");
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit Monday 18:00–19:00" })).toHaveFocus();

    dialog = openEditor();
    fireEvent.keyDown(within(dialog).getByLabelText("Day"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    dialog = openEditor();
    fireEvent.click(dialog); // the dark area around the box is the <dialog> itself
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    expect(saved()).toEqual([MONDAY]);
  });

  it("starts fresh each time, without leftovers from a cancelled edit", async () => {
    await renderLoaded(<SlotsSection />);
    let dialog = openEditor();
    tapWheel(dialog, "End time hours", "21");
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

    dialog = openEditor();
    expect(
      within(within(dialog).getByRole("listbox", { name: "End time hours" })).getByRole("option", {
        selected: true,
      }),
    ).toHaveTextContent("19");
  });
});
