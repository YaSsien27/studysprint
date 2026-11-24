import { describe, expect, it } from "vitest";
import {
  moduleFromRow,
  moduleToRow,
  sessionFromRow,
  sessionToRow,
  slotFromRow,
  slotToRow,
} from "./mappers";
import type { AvailabilitySlot, Module, StudySession } from "@/types";

describe("database mappers", () => {
  it("round-trips a module and reads numeric hours sent as text", () => {
    const m: Module = { id: "m1", name: "History", examDate: "2026-12-15", difficulty: 3, estimatedHours: 12.5 };
    expect(moduleToRow(m)).toEqual({
      id: "m1",
      name: "History",
      exam_date: "2026-12-15",
      difficulty: 3,
      estimated_hours: 12.5,
    });
    expect(moduleFromRow(moduleToRow(m))).toEqual(m);
    expect(moduleFromRow({ ...moduleToRow(m), estimated_hours: "12.50" }).estimatedHours).toBe(12.5);
  });

  it("round-trips a free-time slot", () => {
    const s: AvailabilitySlot = { id: "a", dayOfWeek: 0, startTime: "09:00", endTime: "11:30" };
    expect(slotToRow(s)).toEqual({ id: "a", day_of_week: 0, start_time: "09:00", end_time: "11:30" });
    expect(slotFromRow(slotToRow(s))).toEqual(s);
  });

  it("round-trips sessions, with and without movedFrom", () => {
    const plain: StudySession = {
      id: "s1", moduleId: "m1", date: "2026-12-01", startTime: "18:00", endTime: "20:00", status: "planned",
    };
    expect(sessionToRow(plain).moved_from).toBeNull();
    expect(sessionFromRow(sessionToRow(plain))).toEqual(plain);

    const moved: StudySession = { ...plain, id: "s2", movedFrom: "s1" };
    expect(sessionToRow(moved)).toMatchObject({ module_id: "m1", start_time: "18:00", moved_from: "s1" });
    expect(sessionFromRow(sessionToRow(moved))).toEqual(moved);
  });
});
