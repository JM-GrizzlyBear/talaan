import { LAB_ALIASES, NOT_A_TEST, type KnownLabTest } from "./labTests.js";

// One line of text, as a reader (Tesseract, a PDF, a phone) gives it
export interface TextLine {
  text: string;
  // 0–100: how sure the reader is of the letters; null when exact (a PDF's text)
  confidence: number | null;
}

// A lab result found in the text, for the person to check before it's used
export interface ReadLabRow {
  name: string;
  value: string;
  unit: string;
  rangeLow: number | null;
  rangeHigh: number | null;
  // Why it may be wrong (empty: looks right). Shown on the check screen.
  doubts: string[];
  // The line it came from, to compare against the photo
  line: string;
}

const NUMBER = String.raw`\d+(?:\.\d+)?`;
const FLAG = /^(?:\(?[hl]\)?|high|low|\*+|↑|↓|[hl]\*)$/i;
const TEXT_RESULTS =
  /^(negative|positive|trace|reactive|non-?reactive|nil|none(?: seen)?|rare|few|moderate|many|occasional|clear|hazy|cloudy|turbid|slightly turbid|yellow|light yellow|dark yellow|straw|amber|red|[1-4]\+|\+{1,4})\b/i;
// "g/dL", "mmol/L", "x10^9/L", "%", "fL", "/hpf", "U/L" …
const UNIT =
  /^(?:x\s?10[\^"'*`°]?\s?\d+\s?\/\s?[a-zµμ]+|10\^\d+\/[a-z]+|[a-zµμ]{1,5}\/[a-zµμ0-9^]{1,6}|\/[a-z]{2,4}|%|fl|pg|sec(?:onds)?|ratio|cells\/[a-zµμ]+)$/i;
const UNIT_SPELLING: [RegExp, string][] = [
  [/^g\/dl$/i, "g/dL"],
  [/^mg\/dl$/i, "mg/dL"],
  [/^mmol\/l$/i, "mmol/L"],
  [/^umol\/l$|^µmol\/l$|^μmol\/l$/i, "µmol/L"],
  [/^g\/l$/i, "g/L"],
  [/^u\/l$/i, "U/L"],
  [/^iu\/l$/i, "IU/L"],
  [/^meq\/l$/i, "mEq/L"],
  [/^fl$/i, "fL"],
  // The ^ is often read as " ' * or °
  [/^x\s?10[\^"'*`°]?\s?(\d+)\s?\/\s?l$/i, "x10^$1/L"],
  [/^10\^(\d+)\/l$/i, "x10^$1/L"],
];

function tidyUnit(unit: string) {
  for (const [pattern, spelling] of UNIT_SPELLING) {
    if (pattern.test(unit)) return unit.replace(pattern, spelling);
  }
  return unit;
}

// What readers commonly get wrong in numbers, and spacing quirks
function tidyLine(text: string) {
  return text
    .replace(/[–—−~]/g, "-")
    .replace(/(\d),(\d{3})(?!\d)/g, "$1$2") // "250,000" → "250000"
    .replace(/(\d)\s*\.\s*(\d)/g, "$1.$2") // "6 .0" → "6.0"
    .replace(/(\d)\s*-\s*(\d)/g, "$1 - $2")
    .replace(/^[\s•·.:|*-]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

// "0" read as the letter O inside a number ("1O.5" → "10.5")
function fixLetterO(text: string) {
  const fixed = text.replace(
    /(?<=\d)[oO](?=[\d.]|\b)|(?<=\b)[oO](?=\.\d)/g,
    "0",
  );
  return { text: fixed, changed: fixed !== text };
}

function findTest(
  line: string,
): { test: KnownLabTest | null; rest: string; name: string } | null {
  const lower = line.toLowerCase();
  for (const { alias, test } of LAB_ALIASES) {
    if (lower.startsWith(alias) && !/[a-z]/i.test(line.charAt(alias.length))) {
      return { test, rest: line.slice(alias.length), name: test.name };
    }
  }
  // Not on the list: the words before the first number, if they look like a name
  const match = /^([a-z][a-z .()/'+-]{1,40}?)\s*[:=]?\s*(?=[<>]?\d)/i.exec(
    line,
  );
  if (!match) return null;
  const name = match[1].trim().replace(/[\s:(-]+$/, "");
  const first = name.split(/[\s:]/)[0].toLowerCase();
  if (name.replace(/[^a-z]/gi, "").length < 3 || NOT_A_TEST.has(first))
    return null;
  return { test: null, rest: line.slice(match[0].length), name };
}

// "12.0 - 16.0", "12 to 16", "< 200", "up to 40", "> 40"
function takeRange(text: string) {
  const patterns: [
    RegExp,
    (m: RegExpExecArray) => [number | null, number | null],
  ][] = [
    [
      new RegExp(String.raw`(${NUMBER})\s*(?:-|to)\s*(${NUMBER})`, "i"),
      (m) => [Number(m[1]), Number(m[2])],
    ],
    [
      new RegExp(
        String.raw`(?:<=?|≤|less than|up to|below)\s*(${NUMBER})`,
        "i",
      ),
      (m) => [null, Number(m[1])],
    ],
    [
      new RegExp(
        String.raw`(?:>=?|≥|greater than|above|at least)\s*(${NUMBER})`,
        "i",
      ),
      (m) => [Number(m[1]), null],
    ],
  ];
  for (const [pattern, toRange] of patterns) {
    const match = pattern.exec(text);
    if (match) {
      const [low, high] = toRange(match);
      return {
        low,
        high,
        rest:
          text.slice(0, match.index) +
          " " +
          text.slice(match.index + match[0].length),
      };
    }
  }
  return { low: null, high: null, rest: text };
}

export function readLabLine(input: TextLine): ReadLabRow | null {
  const tidied = tidyLine(input.text);
  const { text: line, changed: fixedO } = fixLetterO(tidied);
  const found = findTest(line);
  if (!found) return null;

  // Skip "(FBS)", ":" and a unit printed before the result,
  // and leader dots ("Uric acid ........ 420")
  let rest = found.rest.replace(/^\s*(\([^)\d]*\))?[\s:=.-]*/, "");
  let unit = "";
  const leadingUnit = /^(\S+)\s+(?=[<>]?\d)/.exec(rest);
  if (leadingUnit && UNIT.test(leadingUnit[1])) {
    unit = tidyUnit(leadingUnit[1]);
    rest = rest.slice(leadingUnit[0].length);
  }

  // The result: a number (maybe "<0.5"), a count range for urine ("0-2"), or a word
  let value = "";
  const textOk = found.test?.textResults ?? false;
  const countRange = textOk
    ? new RegExp(String.raw`^(${NUMBER}\s*-\s*${NUMBER})`).exec(rest)
    : null;
  const number = new RegExp(String.raw`^([<>]=?\s*)?(${NUMBER})`).exec(rest);
  const word = TEXT_RESULTS.exec(rest);
  if (countRange) value = countRange[1].replace(/\s+/g, "");
  else if (number)
    value = `${number[1]?.replace(/\s+/g, "") ?? ""}${number[2]}`;
  else if (word) value = word[1];
  if (!value) return null;
  rest = rest.slice((countRange ?? number ?? word)![0].length);

  const range = takeRange(rest);
  const doubts: string[] = [];
  const words = range.rest.split(/\s+/).filter((w) => w && !FLAG.test(w));
  if (!unit) {
    const candidate = words.find((w) => UNIT.test(w));
    if (candidate) unit = tidyUnit(candidate);
  }

  if (!found.test) doubts.push("Not a test Talaan knows: check the name");
  // A name off the list with no normal range is too likely to be something else
  if (!found.test && range.low === null && range.high === null) return null;
  let { low, high } = range;
  if (low !== null && high !== null && low > high) {
    doubts.push("The normal range looks wrong");
    low = high = null;
  }
  if (input.confidence !== null && input.confidence < 75) {
    doubts.push("Hard to read on the photo");
  }
  if (fixedO) doubts.push("A letter O was read as 0");

  return {
    name: found.name,
    value,
    unit,
    rangeLow: low,
    rangeHigh: high,
    doubts,
    line: input.text.trim(),
  };
}

// Every result found, in order, without repeats of the same line
export function readLabLines(lines: TextLine[]): ReadLabRow[] {
  const rows: ReadLabRow[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const row = readLabLine(line);
    if (!row) continue;
    const key = `${row.name}|${row.value}|${row.unit}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(row);
  }
  return rows;
}
