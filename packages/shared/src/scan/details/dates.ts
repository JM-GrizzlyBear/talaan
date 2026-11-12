import type { TextLine } from "../types.js";
import { lineDoubts } from "./lines.js";
import { DETAIL_DOUBTS, type ReadField } from "./types.js";

const MONTHS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

function real(y: number, m: number, d: number) {
  if (m < 1 || m > 12 || d < 1 || y < 1900 || y > 2100) return false;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCDate() === d && date.getUTCMonth() === m - 1;
}

const fullYear = (y: number) => (y < 100 ? (y > 50 ? 1900 + y : 2000 + y) : y);
const monthOf = (word: string) =>
  MONTHS.indexOf(word.slice(0, 3).toLowerCase()) + 1;

export interface FoundDate {
  iso: string;
  // Numbers that could be read the other way (day/month)
  otherWay: string | null;
}

// Every date in a line: 10/05/2026, 10-5-26, 2026-10-05, Oct 5, 2026,
// 5 October 2026. Numbers are month/day/year, like most Philippine printouts.
export function datesIn(text: string): FoundDate[] {
  const found: FoundDate[] = [];
  const add = (y: number, m: number, d: number, otherWay: string | null) => {
    if (real(y, m, d)) found.push({ iso: iso(y, m, d), otherWay });
  };
  for (const m of text.matchAll(/\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/g)) {
    add(+m[1], +m[2], +m[3], null);
  }
  for (const m of text.matchAll(
    /\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})\b/g,
  )) {
    const [month, day, year] = [+m[1], +m[2], fullYear(+m[3])];
    const swapped =
      month !== day && day <= 12 && real(year, day, month)
        ? `${MONTH_NAMES[day - 1]} ${month}`
        : null;
    if (real(year, month, day)) add(year, month, day, swapped);
    // 25/10/2026 can only be day/month
    else if (real(year, day, month)) add(year, day, month, null);
  }
  const word =
    "(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?";
  for (const m of text.matchAll(
    new RegExp(
      `\\b${word}\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})\\b`,
      "gi",
    ),
  )) {
    add(+m[3], monthOf(m[1]), +m[2], null);
  }
  for (const m of text.matchAll(
    new RegExp(
      `\\b(\\d{1,2})(?:st|nd|rd|th)?[\\s-]+${word}[\\s,-]+(\\d{4})\\b`,
      "gi",
    ),
  )) {
    add(+m[3], monthOf(m[2]), +m[1], null);
  }
  return found;
}

// Which labels say "this is the record's date", best first
const GOOD = [
  /\b(date\s*(of\s*)?(exam(ination)?|procedure|collect(ed|ion)|request(ed)?|consult(ation)?|visit|service|admission|vaccination|issued?))\b/i,
  /\b(collected|released|reported|examined|issued|requested)\s*(on|date)?\b/i,
  /\b(date|petsa|fecha)\b/i,
];
// Dates that aren't the record's
const NOT_IT =
  /\b(birth|b-?day|dob|born|kapanganakan|expir|valid until|exp\.?|due date|next (visit|dose)|follow[- ]?up|printed|print date)\b/i;

// The record's date: one with a good label, else the first one on the page
export function findRecordDate(
  lines: TextLine[],
  today: string,
): ReadField | null {
  let best: { field: ReadField; rank: number } | null = null;
  for (const line of lines) {
    if (NOT_IT.test(line.text)) continue;
    const dates = datesIn(line.text);
    if (dates.length === 0) continue;
    const label = GOOD.findIndex((g) => g.test(line.text));
    const rank = label === -1 ? GOOD.length : label;
    if (best && best.rank <= rank) continue;
    const date = dates[0];
    const doubts = lineDoubts(line);
    if (label === -1) doubts.push(DETAIL_DOUBTS.guessed);
    if (date.otherWay) doubts.push(DETAIL_DOUBTS.eitherWay(date.otherWay));
    if (date.iso > today) doubts.push(DETAIL_DOUBTS.future);
    best = { field: { value: date.iso, doubts, line: line.text }, rank };
  }
  return best?.field ?? null;
}
