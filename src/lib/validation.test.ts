import { describe, expect, it } from "vitest";
import {
  hasErrors,
  isValidDate,
  todayISO,
  validateModule,
  cleanName,
  validateName,
  validateSlot,
} from "./validation";

const TODAY = "2026-11-17";

const validModule = {
  name: "Linear Algebra",
  examDate: "2026-12-15",
  difficulty: 3,
  estimatedHours: 20,
};

describe("todayISO", () => {
  it("formats a local date as YYYY-MM-DD", () => {
    expect(todayISO(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("isValidDate", () => {
  it("accepts real dates and rejects impossible ones", () => {
    expect(isValidDate("2026-02-28")).toBe(true);
    expect(isValidDate("2026-02-30")).toBe(false);
    expect(isValidDate("15/12/2026")).toBe(false);
    expect(isValidDate("")).toBe(false);
  });
});

describe("validateModule", () => {
  it("accepts a valid module", () => {
    expect(validateModule(validModule, TODAY)).toEqual({});
  });

  it("rejects an exam date in the past", () => {
    const errors = validateModule({ ...validModule, examDate: "2026-11-01" }, TODAY);
    expect(errors.examDate).toMatch(/future/);
  });

  it("rejects an exam date of today", () => {
    const errors = validateModule({ ...validModule, examDate: TODAY }, TODAY);
    expect(errors.examDate).toMatch(/future/);
  });

  it("rejects an empty name, bad difficulty and non-positive hours", () => {
    const errors = validateModule(
      { name: "   ", examDate: "2026-12-15", difficulty: 6, estimatedHours: 0 },
      TODAY,
    );
    expect(Object.keys(errors).sort()).toEqual(
      ["difficulty", "estimatedHours", "name"].sort(),
    );
  });

  it("when editing, keeps a saved exam date even if that exam has passed", () => {
    const passed = { ...validModule, examDate: "2026-11-01" };
    expect(validateModule(passed, TODAY, "2026-11-01")).toEqual({});
  });

  it("when editing, still rejects changing to a different past date", () => {
    const errors = validateModule({ ...validModule, examDate: "2026-11-02" }, TODAY, "2026-11-01");
    expect(errors.examDate).toMatch(/future/);
  });
});

describe("validateSlot", () => {
  it("accepts a slot where end is after start", () => {
    expect(validateSlot({ dayOfWeek: 1, startTime: "18:00", endTime: "20:00" })).toEqual({});
  });

  it("rejects an end time equal to or before the start time", () => {
    expect(
      validateSlot({ dayOfWeek: 1, startTime: "18:00", endTime: "18:00" }).endTime,
    ).toMatch(/after/);
    expect(
      validateSlot({ dayOfWeek: 1, startTime: "18:00", endTime: "09:00" }).endTime,
    ).toMatch(/after/);
  });

  it("rejects an invalid day and malformed times", () => {
    const errors = validateSlot({ dayOfWeek: 7, startTime: "25:00", endTime: "" });
    expect(hasErrors(errors)).toBe(true);
    expect(errors.dayOfWeek).toBeDefined();
    expect(errors.startTime).toBeDefined();
    expect(errors.endTime).toBeDefined();
  });
});

describe("validateName", () => {
  it("accepts real names from any language", () => {
    for (const ok of ["Sam", "Yassien Ahamed", "Mary-Jane O'Neil", "J. R. Smith", "José Núñez", "محمد علي", "x".repeat(40), "  padded  "]) {
      expect(validateName(ok)).toBeNull();
    }
  });

  it("rejects an empty or too long name", () => {
    expect(validateName("   ")).toMatch(/enter your name/);
    expect(validateName("x".repeat(41))).toMatch(/40 characters or less/);
  });

  it("rejects numbers and other symbols", () => {
    for (const bad of ["sam99", "sam@home", "<b>", "sam!", "-sam", "'"]) {
      expect(validateName(bad)).toMatch(/Use only letters/);
    }
  });
});

describe("cleanName", () => {
  it("removes spaces at the ends and double spaces inside", () => {
    expect(cleanName("  Yassien    Ahamed ")).toBe("Yassien Ahamed");
  });
});
