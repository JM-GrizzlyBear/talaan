import { DOUBTS, SURE_ENOUGH } from "./doubts.js";
import { findTest } from "./findTest.js";
import { takeRange } from "./takeRange.js";
import { takeValue } from "./takeValue.js";
import { fixLetterO, tidyLine } from "./tidyLine.js";
import type { ReadLabRow, TextLine } from "./types.js";
import { tidyUnit, UNIT } from "./units.js";

// "H", "(L)", "*", "↑": the lab's own flag, ignored (Talaan works it out)
const FLAG = /^(?:\(?[hl]\)?|high|low|\*+|↑|↓|[hl]\*)$/i;

// One line → test, result, unit and normal range, or null when it isn't a result
export function readLabLine(input: TextLine): ReadLabRow | null {
  const { text: line, changed: fixedO } = fixLetterO(tidyLine(input.text));
  const found = findTest(line);
  if (!found) return null;

  // Skip "(FBS)", ":" and leader dots ("Uric acid ........ 420"),
  // then a unit printed before the result
  let rest = found.rest.replace(/^\s*(\([^)\d]*\))?[\s:=.-]*/, "");
  let unit = "";
  const leadingUnit = /^(\S+)\s+(?=[<>]?\d)/.exec(rest);
  if (leadingUnit && UNIT.test(leadingUnit[1])) {
    unit = tidyUnit(leadingUnit[1]);
    rest = rest.slice(leadingUnit[0].length);
  }

  const result = takeValue(rest, found.test?.textResults ?? false);
  if (!result) return null;
  const range = takeRange(result.rest);
  if (!unit) {
    const words = range.rest.split(/\s+/).filter((w) => w && !FLAG.test(w));
    const candidate = words.find((w) => UNIT.test(w));
    if (candidate) unit = tidyUnit(candidate);
  }

  // A name off the list with no normal range is too likely to be something else
  if (!found.test && range.low === null && range.high === null) return null;

  const doubts: string[] = [];
  if (!found.test) doubts.push(DOUBTS.unknownTest);
  let { low, high } = range;
  if (low !== null && high !== null && low > high) {
    doubts.push(DOUBTS.badRange);
    low = high = null;
  }
  if (input.confidence !== null && input.confidence < SURE_ENOUGH) {
    doubts.push(DOUBTS.hardToRead);
  }
  if (fixedO) doubts.push(DOUBTS.letterO);

  return {
    name: found.name,
    value: result.value,
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
