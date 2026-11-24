import { describe, expect, it } from "vitest";
import { toCurrentUser } from "./auth";

describe("toCurrentUser", () => {
  it("reads the email and the name saved at sign-up", () => {
    expect(toCurrentUser({ email: "sam@example.com", user_metadata: { name: "Sam Smith" } })).toEqual({
      email: "sam@example.com",
      name: "Sam Smith",
    });
  });

  it("has no name for older accounts or odd saved values", () => {
    for (const user_metadata of [undefined, {}, { name: "" }, { name: 42 }]) {
      expect(toCurrentUser({ email: "sam@example.com", user_metadata })?.name).toBeNull();
    }
  });

  it("is null when logged out", () => {
    expect(toCurrentUser(null)).toBeNull();
    expect(toCurrentUser(undefined)).toBeNull();
  });
});
