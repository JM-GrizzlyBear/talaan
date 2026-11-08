import { LAB_ALIASES, NOT_A_TEST, type KnownLabTest } from "./tests/index.js";

// The test a line starts with: a known one (by any of its names), or the
// words before the first number when they look like a test name
export function findTest(
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
