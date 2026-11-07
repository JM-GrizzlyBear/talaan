import { BLOOD_COUNT_TESTS } from "./bloodCount.js";
import { CHEMISTRY_TESTS } from "./chemistry.js";
import type { KnownLabTest } from "./knownLabTest.js";
import { URINALYSIS_TESTS } from "./urinalysis.js";

export type { KnownLabTest } from "./knownLabTest.js";
export { NOT_A_TEST } from "./notATest.js";

export const KNOWN_LAB_TESTS: KnownLabTest[] = [
  ...BLOOD_COUNT_TESTS,
  ...CHEMISTRY_TESTS,
  ...URINALYSIS_TESTS,
];

// Every alias with its test, longest first, so "rbc count" wins over "rbc"
export const LAB_ALIASES = KNOWN_LAB_TESTS.flatMap((test) =>
  test.aliases.map((alias) => ({ alias, test })),
).sort((a, b) => b.alias.length - a.alias.length);
