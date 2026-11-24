import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { failNextSave, rowsIn, seed } from "@/test/fakeBackend";
import type { Module, StudySession } from "@/types";
import { addRows, deleteRow, updateRow, useTable } from "./store";

const flush = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

const HISTORY: Module = { id: "hi", name: "History", examDate: "2026-12-15", difficulty: 2, estimatedHours: 10 };
const SESSION: StudySession = {
  id: "hi-2026-12-01-18:00", moduleId: "hi", date: "2026-12-01", startTime: "18:00", endTime: "20:00", status: "planned",
};

describe("data store", () => {
  it("loads, then shows and saves changes straight away", async () => {
    seed("modules", [HISTORY]);
    const { result } = renderHook(() => useTable("modules"));
    expect(result.current.status).toBe("loading");
    await flush();
    expect(result.current).toMatchObject({ status: "ready", rows: [HISTORY], error: null });

    const renamed = { ...HISTORY, name: "World History" };
    await act(() => updateRow("modules", renamed));
    expect(result.current.rows).toEqual([renamed]);
    expect(rowsIn("modules")).toEqual([renamed]);
  });

  it("keeps components in sync", async () => {
    const a = renderHook(() => useTable("modules"));
    const b = renderHook(() => useTable("modules"));
    await flush();
    await act(() => addRows("modules", [HISTORY]));
    expect(a.result.current.rows).toEqual([HISTORY]);
    expect(b.result.current.rows).toEqual([HISTORY]);
  });

  it("shows an error and the real data when a save fails", async () => {
    const { result } = renderHook(() => useTable("modules"));
    await flush();
    failNextSave("network down");
    let ok = true;
    await act(async () => {
      ok = await addRows("modules", [HISTORY]);
    });
    expect(ok).toBe(false);
    expect(result.current.rows).toEqual([]); // not pretending it was saved
    expect(result.current.error).toBe("Couldn't save your change: network down");
  });

  it("removes a deleted module's sessions too, like the database does", async () => {
    seed("modules", [HISTORY]);
    seed("study_sessions", [SESSION]);
    const sessions = renderHook(() => useTable("study_sessions"));
    renderHook(() => useTable("modules"));
    await flush();
    expect(sessions.result.current.rows).toHaveLength(1);

    await act(() => deleteRow("modules", "hi"));
    expect(sessions.result.current.rows).toEqual([]);
    expect(rowsIn("study_sessions")).toEqual([]);
  });
});
