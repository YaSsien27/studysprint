import { describe, expect, it } from "vitest";
import { afterLoginUrl, isProtected } from "./proxy";

describe("isProtected", () => {
  it("guards the private pages and anything under them", () => {
    for (const path of ["/modules", "/plan", "/progress", "/plan/next-week"]) {
      expect(isProtected(path)).toBe(true);
    }
  });

  it("leaves public pages open", () => {
    for (const path of ["/", "/login", "/auth/callback", "/planner-info", "/modulesx"]) {
      expect(isProtected(path)).toBe(false);
    }
  });
});

describe("afterLoginUrl", () => {
  const go = (search: string) => afterLoginUrl(new URL(`http://localhost:3000/login${search}`)).href;

  it("goes back to the page you were heading to", () => {
    expect(go("?next=%2Fplan")).toBe("http://localhost:3000/plan");
    expect(go("?next=%2Fprogress")).toBe("http://localhost:3000/progress");
  });

  it("uses /modules when there is no next, or it points to another site", () => {
    expect(go("")).toBe("http://localhost:3000/modules");
    expect(go("?next=%2F%2Fevil.example")).toBe("http://localhost:3000/modules");
    expect(go("?next=https%3A%2F%2Fevil.example")).toBe("http://localhost:3000/modules");
  });
});
