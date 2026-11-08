import { NUMBER } from "./numbers.js";

// "12.0 - 16.0", "12 to 16", "< 200", "up to 40", "> 40"
export function takeRange(text: string) {
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
