import { describe, expect, it } from "vitest";
import { addDays, mondayOf, toDayNumber, weekdayOf } from "./dates";

describe("date helpers", () => {
  it("adds days across month and year ends", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-11-16", -7)).toBe("2026-11-09");
  });

  it("adds days across a summer-time change without skipping or repeating a day", () => {
    // Europe moves its clocks on 29 March and 25 October 2026.
    expect(addDays("2026-03-28", 1)).toBe("2026-03-29");
    expect(addDays("2026-03-29", 1)).toBe("2026-03-30");
    expect(addDays("2026-10-24", 2)).toBe("2026-10-26");
  });

  it("finds the Monday of a week", () => {
    expect(mondayOf("2026-11-16")).toBe("2026-11-16"); // Monday itself
    expect(mondayOf("2026-11-19")).toBe("2026-11-16"); // Thursday
    expect(mondayOf("2026-11-22")).toBe("2026-11-16"); // Sunday belongs to the week before
    expect(mondayOf("2027-01-01")).toBe("2026-12-28"); // across a year end
  });

  it("knows the weekday, 0 = Sunday", () => {
    expect(weekdayOf(toDayNumber("2026-11-22"))).toBe(0);
    expect(weekdayOf(toDayNumber("2026-11-16"))).toBe(1);
  });
});
