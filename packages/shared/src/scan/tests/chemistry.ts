import type { KnownLabTest } from "./knownLabTest.js";

// Blood chemistry: sugar, cholesterol, kidney, liver, salts, thyroid
export const CHEMISTRY_TESTS: KnownLabTest[] = [
  {
    name: "FBS",
    aliases: [
      "fasting blood sugar",
      "fasting blood glucose",
      "fasting glucose",
      "glucose fasting",
      "fbs",
    ],
  },
  {
    name: "RBS",
    aliases: ["random blood sugar", "random blood glucose", "rbs"],
  },
  {
    name: "HbA1c",
    aliases: [
      "glycosylated hemoglobin",
      "glycated hemoglobin",
      "hemoglobin a1c",
      "hba1c",
      "a1c",
    ],
  },
  { name: "Total cholesterol", aliases: ["total cholesterol", "cholesterol"] },
  { name: "Triglycerides", aliases: ["triglycerides", "triglyceride"] },
  { name: "HDL", aliases: ["hdl cholesterol", "hdl-c", "hdl"] },
  { name: "LDL", aliases: ["ldl cholesterol", "ldl-c", "ldl"] },
  { name: "VLDL", aliases: ["vldl"] },
  { name: "Creatinine", aliases: ["creatinine", "crea"] },
  { name: "BUN", aliases: ["blood urea nitrogen", "urea nitrogen", "bun"] },
  { name: "Uric acid", aliases: ["blood uric acid", "uric acid", "bua"] },
  {
    name: "SGPT / ALT",
    aliases: [
      "sgpt/alt",
      "alt/sgpt",
      "sgpt (alt)",
      "alanine aminotransferase",
      "sgpt",
      "alt",
    ],
  },
  {
    name: "SGOT / AST",
    aliases: [
      "sgot/ast",
      "ast/sgot",
      "sgot (ast)",
      "aspartate aminotransferase",
      "sgot",
      "ast",
    ],
  },
  { name: "Alkaline phosphatase", aliases: ["alkaline phosphatase", "alp"] },
  {
    name: "Total bilirubin",
    aliases: ["total bilirubin", "bilirubin total", "tbil"],
  },
  { name: "Albumin", aliases: ["albumin"] },
  { name: "Sodium", aliases: ["sodium", "na+", "na"] },
  { name: "Potassium", aliases: ["potassium", "k+", "k"] },
  { name: "Chloride", aliases: ["chloride", "cl-", "cl"] },
  { name: "Calcium", aliases: ["ionized calcium", "calcium", "ca"] },
  { name: "Magnesium", aliases: ["magnesium", "mg"] },
  { name: "TSH", aliases: ["tsh"] },
  { name: "FT4", aliases: ["free t4", "ft4"] },
];
