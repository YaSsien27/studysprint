import { afterEach, describe, expect, it, vi } from "vitest";
import { newId } from "./id";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("newId", () => {
  it("still makes unique ids when crypto.randomUUID is missing (plain http)", () => {
    vi.stubGlobal("crypto", { getRandomValues: crypto.getRandomValues.bind(crypto) });
    const a = newId();
    const b = newId();
    expect(a).not.toBe("");
    expect(a).not.toBe(b);
  });
});
