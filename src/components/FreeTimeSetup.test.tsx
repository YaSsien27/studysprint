import { fireEvent, screen, within } from "@testing-library/react";
import { rowsIn, seed } from "@/test/fakeBackend";
import { renderLoaded } from "@/test/render";
import { describe, expect, it } from "vitest";
import type { AvailabilitySlot } from "@/types";
import { SlotsSection } from "./SlotsSection";

function saved() {
  return rowsIn("availability");
}

function choose(name: string) {
  fireEvent.click(screen.getByRole("radio", { name }));
}

function suggestion() {
  return within(screen.getByRole("list", { name: "Suggested free time" }))
    .getAllByRole("listitem")
    .map((li) => li.textContent);
}

describe("Quick setup", () => {
  it("suggests a week from the answers and saves it with Use these", async () => {
    await renderLoaded(<SlotsSection />);
    fireEvent.click(screen.getByRole("button", { name: "Quick setup" }));
    choose("Working full-time"); // evenings and 10 h are the defaults

    expect(suggestion()).toEqual([
      "Monday 19:00–21:00",
      "Tuesday 19:00–20:00",
      "Wednesday 19:00–20:00",
      "Thursday 19:00–20:00",
      "Friday 19:00–20:00",
      "Saturday 18:00–20:00",
      "Sunday 18:00–20:00",
    ]);
    expect(screen.getByText(/10 h a week/)).toBeInTheDocument();
    expect(saved()).toEqual([]); // nothing saved yet

    fireEvent.click(screen.getByRole("button", { name: "Use these" }));

    expect(saved()).toHaveLength(7);
    expect(saved()[0]).toMatchObject({ dayOfWeek: 1, startTime: "19:00", endTime: "21:00" });
    expect(screen.queryByRole("heading", { name: "Quick setup" })).not.toBeInTheDocument();
    expect(screen.queryByText("No free time added yet.")).not.toBeInTheDocument();
    expect(
      await within(screen.getByRole("region", { name: "Notifications" })).findByText("Added 7 free-time slots."),
    ).toBeInTheDocument();
  });

  it("asks which days you work only for a part-time job", async () => {
    await renderLoaded(<SlotsSection />);
    fireEvent.click(screen.getByRole("button", { name: "Quick setup" }));
    expect(screen.queryByRole("group", { name: "Which days do you work?" })).not.toBeInTheDocument();

    choose("Student with a part-time job");
    const workDays = screen.getByRole("group", { name: "Which days do you work?" });
    fireEvent.click(within(workDays).getByRole("checkbox", { name: "Monday" }));

    expect(suggestion()[0]).toBe("Monday 20:00–21:00");
  });

  it("says when not all hours fit", async () => {
    await renderLoaded(<SlotsSection />);
    fireEvent.click(screen.getByRole("button", { name: "Quick setup" }));
    choose("Student with a part-time job");
    const workDays = screen.getByRole("group", { name: "Which days do you work?" });
    for (const box of within(workDays).getAllByRole("checkbox")) fireEvent.click(box);
    choose("20+ h");

    // Working every day leaves one hour a day: 7 h placed, 13 h left over.
    expect(screen.getByText(/13 hours didn't fit/)).toBeInTheDocument();
  });

  it("can replace or add to free time you already have", async () => {
    const existing: AvailabilitySlot = { id: "x", dayOfWeek: 3, startTime: "07:00", endTime: "08:00" };
    seed("availability", [existing]);
    await renderLoaded(<SlotsSection />);

    fireEvent.click(screen.getByRole("button", { name: "Quick setup" }));
    choose("5 h");
    expect(screen.queryByRole("button", { name: "Use these" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add to my free time" }));
    expect(saved()).toHaveLength(1 + 5);
    expect(saved()[0]).toEqual(existing);

    fireEvent.click(screen.getByRole("button", { name: "Quick setup" }));
    choose("5 h");
    fireEvent.click(screen.getByRole("button", { name: "Replace my free time" }));
    expect(saved()).toHaveLength(5);
    expect(saved().some((s: { id: string }) => s.id === "x")).toBe(false);
  });

  it("saves nothing when cancelled", async () => {
    await renderLoaded(<SlotsSection />);
    fireEvent.click(screen.getByRole("button", { name: "Quick setup" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(saved()).toEqual([]);
    expect(screen.getByRole("button", { name: "Quick setup" })).toBeInTheDocument();
  });
});
