// "g/dL", "mmol/L", "x10^9/L", "%", "fL", "/hpf", "U/L" …
export const UNIT =
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

// The usual spelling: "mg/dl" → "mg/dL", "x10\"9/l" → "x10^9/L"
export function tidyUnit(unit: string) {
  for (const [pattern, spelling] of UNIT_SPELLING) {
    if (pattern.test(unit)) return unit.replace(pattern, spelling);
  }
  return unit;
}
