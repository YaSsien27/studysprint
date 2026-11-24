import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { resetStore } from "@/lib/db/store";
import { resetToasts } from "@/lib/toast";
import { resetFakeDb } from "@/test/fakeBackend";

// Tests never talk to the real Supabase: every test file gets the in-memory
// fake database instead of src/lib/db/backend.ts.
vi.mock("@/lib/db/backend", () => import("@/test/fakeBackend"));

// Remove rendered components and saved data between tests so they don't affect each other.
afterEach(() => {
  cleanup();
  resetStore();
  resetFakeDb();
  resetToasts();
});
