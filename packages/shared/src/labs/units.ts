// Converting lab units, so results from different labs line up. Each table
// says how much one of that unit is in a common base unit; converting is
// value × from ÷ to. Only well-known, fixed conversions are here.

// "mg/dl", "MG/DL", "umol/L", "μmol/L" → one spelling to compare
export function unitKey(unit: string) {
  return unit
    .trim()
    .toLowerCase()
    .replace(/[μµ]/g, "u")
    .replace(/\s+/g, "")
    .replace(/^x?10\^?9\/l$/, "x10^9/l")
    .replace(/^x?10\^?12\/l$/, "x10^12/l")
    .replace(/^(cells\/)?(ul|mm3|cumm|cu\.mm|\/ul|\/mm3|\/cumm)$/, "/ul")
    .replace(/^\/(ul|mm3|cumm)$/, "/ul")
    .replace(/^meq\/l$/, "mmol/l");
}

const GLUCOSE = { "mg/dl": 1, "mmol/l": 18.016 };
const CHOLESTEROL = { "mg/dl": 1, "mmol/l": 38.67 };

// By the test's name in Talaan (scan/tests)
export const UNIT_TABLES: Record<string, Record<string, number>> = {
  FBS: GLUCOSE,
  RBS: GLUCOSE,
  "Total cholesterol": CHOLESTEROL,
  HDL: CHOLESTEROL,
  LDL: CHOLESTEROL,
  VLDL: CHOLESTEROL,
  Triglycerides: { "mg/dl": 1, "mmol/l": 88.57 },
  Creatinine: { "umol/l": 1, "mg/dl": 88.42 },
  "Uric acid": { "umol/l": 1, "mg/dl": 59.48 },
  BUN: { "mg/dl": 1, "mmol/l": 2.801 },
  Calcium: { "mg/dl": 1, "mmol/l": 4.008 },
  Hemoglobin: { "g/l": 1, "g/dl": 10 },
  // 38 % = 0.38 L/L
  Hematocrit: { "%": 1, "l/l": 100 },
  // 9.1 x10^9/L = 9,100 /µL
  WBC: { "/ul": 1, "x10^9/l": 1000 },
  "Platelet count": { "/ul": 1, "x10^9/l": 1000 },
  // 30 ng/mL = 74.9 nmol/L (25-OH vitamin D)
  "Vitamin D": { "nmol/l": 1, "ng/ml": 2.496 },
  Sodium: { "mmol/l": 1 },
  Potassium: { "mmol/l": 1 },
  Chloride: { "mmol/l": 1 },
};

// The factor to multiply by, or null when it can't be converted
export function conversionFactor(test: string, from: string, to: string) {
  const a = unitKey(from);
  const b = unitKey(to);
  if (a === b) return 1;
  const table = UNIT_TABLES[test];
  if (!table || !(a in table) || !(b in table)) return null;
  return table[a] / table[b];
}

// Rounded to what a lab would print: 2 decimals under 10, 1 under 100
export function roundLab(value: number) {
  const size = Math.abs(value);
  const decimals = size < 10 ? 2 : size < 100 ? 1 : 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
