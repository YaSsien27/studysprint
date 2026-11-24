import { describe, expect, it } from "vitest";
import { safeNext } from "./safeNext";

describe("safeNext", () => {
  it("keeps paths on this site", () => {
    expect(safeNext("/plan")).toBe("/plan");
    expect(safeNext("/modules#free-time")).toBe("/modules#free-time");
  });

  it("falls back for missing or outside addresses", () => {
    expect(safeNext(null)).toBe("/modules");
    expect(safeNext("")).toBe("/modules");
    expect(safeNext("https://evil.example")).toBe("/modules");
    expect(safeNext("//evil.example")).toBe("/modules");
    expect(safeNext("/\\evil.example")).toBe("/modules"); // browsers treat "/\" like "//"
  });
});
