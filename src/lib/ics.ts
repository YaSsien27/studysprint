// Turns the study plan into an .ics calendar file (the iCalendar standard,
// RFC 5545) that Google Calendar, Apple Calendar and Outlook can import.
// A pure function: it builds text and returns it; downloading is done elsewhere.
//
// Rules from the standard that matter here:
// - Every line ends with CRLF ("\r\n"), not just "\n".
// - In text, "\" , ";" and "," need a backslash in front, and new lines become "\n".
// - Lines longer than 75 bytes are "folded": broken with CRLF + one space.
// - Times without "Z" or a time zone are "floating": 18:00 means 18:00 local time.

import type { Module, StudySession } from "@/types";

/** Escapes text for SUMMARY and DESCRIPTION. */
export function escapeText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/** Breaks a line into pieces of at most 75 bytes, never splitting a character. */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  let bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    // The first piece may be 75 bytes; later pieces start with a space, so 74 more.
    const limit = parts.length === 0 ? 75 : 74;
    if (bytes + size > limit) {
      parts.push(current);
      current = "";
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

/** "2026-11-18" + "18:00" → "20261118T180000" (local, floating time). */
const localDateTime = (date: string, time: string) => `${date.replaceAll("-", "")}T${time.replace(":", "")}00`;

/** A moment in UTC, e.g. 20261117T120000Z, for DTSTAMP. */
const utcStamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/**
 * Builds the calendar. Missed sessions are left out; done and planned ones are kept.
 * `now` is only used for DTSTAMP (when the file was made); tests pass a fixed time.
 */
export function generateIcs(sessions: StudySession[], modules: Module[], now: Date = new Date()): string {
  const nameOf = new Map(modules.map((m) => [m.id, m.name]));
  const examOf = new Map(modules.map((m) => [m.id, m.examDate]));
  const stamp = utcStamp(now);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//StudySprint//Study plan//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:StudySprint plan",
  ];

  const kept = sessions
    .filter((s) => s.status !== "missed")
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

  for (const s of kept) {
    const name = nameOf.get(s.moduleId);
    const exam = examOf.get(s.moduleId);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${s.id}@studysprint`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${localDateTime(s.date, s.startTime)}`,
      `DTEND:${localDateTime(s.date, s.endTime)}`,
      `SUMMARY:${escapeText(name ? `Study: ${name}` : "Study session")}`,
      ...(exam ? [`DESCRIPTION:${escapeText(`Exam on ${exam}. Planned with StudySprint.`)}`] : []),
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
