import { normalizeSearch } from "./normalize.js";
import { alternativesOf } from "./words.js";

// A search: each word, with what it may match. Every word must be found.
export type SearchQuery = string[][];

export function parseSearch(text: string): SearchQuery {
  const words = normalizeSearch(text).split(" ").filter(Boolean);
  // Two words written as one thing ("x ray", "check up")
  const joined: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const pair = `${words[i]} ${words[i + 1] ?? ""}`.trim();
    if (i + 1 < words.length && alternativesOf(pair).length > 1) {
      joined.push(pair);
      i++;
    } else {
      joined.push(words[i]);
    }
  }
  return [...new Set(joined)].map(alternativesOf);
}

// Short words ("dr", "ob") only as whole words; longer ones at the start of a
// word ("hemo" finds "hemoglobin", "2026" finds "2026 03 02")
function findIn(plain: string, word: string, start = 0): number {
  const whole = word.length <= 2;
  let from = start;
  while (from <= plain.length) {
    const at = plain.indexOf(word, from);
    if (at < 0) return -1;
    const startsWord = at === 0 || plain[at - 1] === " ";
    const end = at + word.length;
    const endsWord = end === plain.length || plain[end] === " ";
    if (startsWord && (!whole || endsWord)) return at;
    from = at + 1;
  }
  return -1;
}

export interface SearchField {
  text: string;
  // How much a match here counts (a title more than notes)
  weight: number;
}

// 0 when a word isn't found anywhere; otherwise higher is better. Also says
// which field matched best (to show it under the result).
export function scoreSearch(
  query: SearchQuery,
  fields: SearchField[],
): { score: number; field: number } {
  if (query.length === 0) return { score: 0, field: -1 };
  const plain = fields.map((f) => normalizeSearch(f.text));
  let score = 0;
  const hits = new Array<number>(fields.length).fill(0);
  for (const alternatives of query) {
    let best = 0;
    let bestField = -1;
    for (let i = 0; i < fields.length; i++) {
      for (const [n, word] of alternatives.entries()) {
        const at = findIn(plain[i], word);
        if (at < 0) continue;
        // The word as typed counts more than a word it stands for, a whole
        // word more than its start
        const end = at + word.length;
        const whole = end === plain[i].length || plain[i][end] === " ";
        const value =
          fields[i].weight * (n === 0 ? 1 : 0.8) * (whole ? 1.2 : 1);
        if (value > best) {
          best = value;
          bestField = i;
        }
      }
    }
    if (bestField < 0) return { score: 0, field: -1 };
    score += best;
    hits[bestField] += best;
  }
  const field = hits.indexOf(Math.max(...hits));
  return { score, field };
}

// Where the searched words are in a text, to highlight them: [start, end)
export function highlightRanges(
  text: string,
  query: SearchQuery,
): [number, number][] {
  if (query.length === 0) return [];
  // Map each character of the plain text back to the original
  const map: number[] = [];
  let plain = "";
  let space = true;
  for (let i = 0; i < text.length; i++) {
    // An apostrophe joins ("Luke's" is one word)
    if (/['’`]/.test(text[i])) continue;
    const ch = normalizeSearch(text[i]);
    if (ch === "") {
      if (!space) {
        plain += " ";
        map.push(i);
        space = true;
      }
      continue;
    }
    for (const c of ch) {
      plain += c;
      map.push(i);
    }
    space = false;
  }
  const ranges: [number, number][] = [];
  for (const alternatives of query) {
    for (const word of alternatives) {
      let from = 0;
      while (from < plain.length) {
        const start = findIn(plain, word, from);
        if (start < 0) break;
        const end = start + word.length;
        ranges.push([map[start], map[end - 1] + 1]);
        from = end;
      }
    }
  }
  // Sorted, overlaps joined
  ranges.sort((a, b) => a[0] - b[0]);
  const joined: [number, number][] = [];
  for (const r of ranges) {
    const last = joined.at(-1);
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else joined.push([...r]);
  }
  return joined;
}

// A part of a long text around the first match ("…was clear. No active lung…")
export function excerpt(text: string, query: SearchQuery, length = 140) {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= length) return flat;
  const first = highlightRanges(flat, query)[0];
  if (!first) return `${flat.slice(0, length).trimEnd()}…`;
  const start = Math.max(0, first[0] - Math.floor(length / 3));
  const end = Math.min(flat.length, start + length);
  return `${start > 0 ? "…" : ""}${flat.slice(start, end).trim()}${end < flat.length ? "…" : ""}`;
}
