import { describe, expect, it } from "vitest";
import { escapeText, foldLine, generateIcs } from "./ics";
import type { Module, StudySession } from "@/types";

const NOW = new Date(Date.UTC(2026, 10, 17, 12, 30, 0));

const MODULES: Module[] = [
  { id: "hi", name: "History, Art; Culture", examDate: "2026-11-27", difficulty: 2, estimatedHours: 10 },
];

const session = (id: string, date: string, startTime: string, endTime: string, status: StudySession["status"]): StudySession => ({
  id,
  moduleId: "hi",
  date,
  startTime,
  endTime,
  status,
});

/** The calendar's lines, with folded lines joined back together. */
const unfolded = (ics: string) => ics.replace(/\r\n /g, "").split("\r\n");

describe("generateIcs", () => {
  it("builds a calendar with one event per session, using CRLF line endings", () => {
    const ics = generateIcs([session("a", "2026-11-18", "18:00", "20:00", "planned")], MODULES, NOW);

    expect(ics.endsWith("\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/); // no lone \n or \r anywhere
    expect(unfolded(ics)).toEqual([
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//StudySprint//Study plan//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:StudySprint plan",
      "BEGIN:VEVENT",
      "UID:a@studysprint",
      "DTSTAMP:20261117T123000Z",
      "DTSTART:20261118T180000",
      "DTEND:20261118T200000",
      "SUMMARY:Study: History\\, Art\\; Culture",
      "DESCRIPTION:Exam on 2026-11-27. Planned with StudySprint.",
      "END:VEVENT",
      "END:VCALENDAR",
      "", // the file ends with a line break
    ]);
  });

  it("writes times in local (floating) time, without Z or a time zone", () => {
    const ics = generateIcs([session("a", "2026-12-01", "07:05", "09:00", "planned")], MODULES, NOW);
    const lines = unfolded(ics);
    expect(lines).toContain("DTSTART:20261201T070500");
    expect(lines).toContain("DTEND:20261201T090000");
    expect(lines.filter((l) => l.startsWith("DTSTART") || l.startsWith("DTEND")).join()).not.toMatch(/Z|TZID/);
  });

  it("leaves missed sessions out, keeps done and planned ones, in time order", () => {
    const ics = generateIcs(
      [
        session("later", "2026-11-20", "18:00", "20:00", "planned"),
        session("skipped", "2026-11-18", "18:00", "20:00", "missed"),
        session("first", "2026-11-17", "08:00", "09:00", "done"),
      ],
      MODULES,
      NOW,
    );
    const uids = unfolded(ics).filter((l) => l.startsWith("UID:"));
    expect(uids).toEqual(["UID:first@studysprint", "UID:later@studysprint"]);
  });

  it("gives an empty but valid calendar when there are no sessions", () => {
    expect(unfolded(generateIcs([], MODULES, NOW))).toEqual([
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//StudySprint//Study plan//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:StudySprint plan",
      "END:VCALENDAR",
      "",
    ]);
  });

  it("names sessions of deleted modules plainly", () => {
    const orphan = { ...session("x", "2026-11-18", "18:00", "19:00", "planned"), moduleId: "gone" };
    const lines = unfolded(generateIcs([orphan], MODULES, NOW));
    expect(lines).toContain("SUMMARY:Study session");
    expect(lines.some((l) => l.startsWith("DESCRIPTION"))).toBe(false);
  });

  it("folds long lines to at most 75 bytes", () => {
    const long: Module = { ...MODULES[0], name: "Advanced Topics in Computational Neuroscience and Machine Learning Methods" };
    const ics = generateIcs([session("a", "2026-11-18", "18:00", "20:00", "planned")], [long], NOW);
    for (const line of ics.split("\r\n")) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
    expect(unfolded(ics)).toContain(`SUMMARY:Study: ${long.name}`);
  });
});

describe("escapeText", () => {
  it("escapes backslashes, semicolons, commas and new lines", () => {
    expect(escapeText("a\\b;c,d\ne")).toBe("a\\\\b\\;c\\,d\\ne");
  });
});

describe("foldLine", () => {
  it("leaves short lines alone", () => {
    expect(foldLine("SUMMARY:Short")).toBe("SUMMARY:Short");
  });

  it("never splits a multi-byte character", () => {
    const line = `SUMMARY:${"é".repeat(60)}`; // 8 + 120 bytes
    const pieces = foldLine(line).split("\r\n");
    expect(pieces.length).toBeGreaterThan(1);
    for (const piece of pieces) {
      expect(new TextEncoder().encode(piece).length).toBeLessThanOrEqual(75);
      expect(piece).not.toContain("�");
    }
    expect(pieces.map((p, i) => (i === 0 ? p : p.slice(1))).join("")).toBe(line);
  });
});
