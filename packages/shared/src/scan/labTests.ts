// Common lab tests in the Philippines and the names printouts use for them.
// Only for recognising lines: Talaan never fills in a normal range itself,
// because every lab has its own.

export interface KnownLabTest {
  // How Talaan writes it in the form
  name: string;
  // Lowercase spellings seen on printouts, the full name first
  aliases: string[];
  // Results like "0-2" (cells per field) or "Negative" are normal here
  textResults?: boolean;
}

export const KNOWN_LAB_TESTS: KnownLabTest[] = [
  // Complete blood count (CBC)
  { name: "Hemoglobin", aliases: ["hemoglobin", "haemoglobin", "hgb", "hb"] },
  { name: "Hematocrit", aliases: ["hematocrit", "haematocrit", "hct"] },
  {
    name: "RBC",
    aliases: [
      "rbc count",
      "red blood cell count",
      "red blood cells",
      "erythrocytes",
      "rbc",
    ],
  },
  {
    name: "WBC",
    aliases: [
      "wbc count",
      "white blood cell count",
      "white blood cells",
      "leukocytes",
      "wbc",
    ],
  },
  {
    name: "Platelet count",
    aliases: ["platelet count", "platelets", "platelet", "plt"],
  },
  { name: "MCV", aliases: ["mcv"] },
  { name: "MCH", aliases: ["mch"] },
  { name: "MCHC", aliases: ["mchc"] },
  { name: "RDW", aliases: ["rdw-cv", "rdw"] },
  {
    name: "Neutrophils",
    aliases: ["neutrophils", "neutrophil", "segmenters", "segs"],
  },
  { name: "Lymphocytes", aliases: ["lymphocytes", "lymphocyte", "lymphs"] },
  { name: "Monocytes", aliases: ["monocytes", "monocyte"] },
  { name: "Eosinophils", aliases: ["eosinophils", "eosinophil"] },
  { name: "Basophils", aliases: ["basophils", "basophil"] },
  { name: "Stabs", aliases: ["stabs", "bands"] },

  // Blood chemistry
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

  // Urinalysis
  { name: "Color", aliases: ["colour", "color"], textResults: true },
  {
    name: "Transparency",
    aliases: ["transparency", "clarity", "appearance"],
    textResults: true,
  },
  { name: "pH", aliases: ["ph", "reaction"] },
  {
    name: "Specific gravity",
    aliases: ["specific gravity", "sp. gravity", "sp gravity", "sg"],
  },
  {
    name: "Protein",
    aliases: ["protein", "albumin (urine)"],
    textResults: true,
  },
  { name: "Sugar", aliases: ["sugar", "glucose (urine)"], textResults: true },
  {
    name: "Pus cells",
    aliases: ["pus cells", "pus cell", "wbc/hpf"],
    textResults: true,
  },
  { name: "RBC (urine)", aliases: ["rbc/hpf"], textResults: true },
  {
    name: "Epithelial cells",
    aliases: ["epithelial cells", "squamous epithelial cells", "epithelial"],
    textResults: true,
  },
  { name: "Bacteria", aliases: ["bacteria"], textResults: true },
  {
    name: "Mucus threads",
    aliases: ["mucus threads", "mucus"],
    textResults: true,
  },
  {
    name: "Amorphous urates",
    aliases: ["amorphous urates", "amorphous phosphates", "amorphous"],
    textResults: true,
  },
];

// Every alias with its test, longest first, so "rbc count" wins over "rbc"
export const LAB_ALIASES = KNOWN_LAB_TESTS.flatMap((test) =>
  test.aliases.map((alias) => ({ alias, test })),
).sort((a, b) => b.alias.length - a.alias.length);

// Words that start lines which aren't results (names, dates, headings)
export const NOT_A_TEST = new Set([
  "name",
  "patient",
  "age",
  "sex",
  "gender",
  "date",
  "time",
  "physician",
  "doctor",
  "requested",
  "received",
  "released",
  "printed",
  "page",
  "room",
  "bed",
  "ward",
  "case",
  "no",
  "lab",
  "specimen",
  "control",
  "address",
  "birthday",
  "test",
  "examination",
  "result",
  "results",
  "reference",
  "medtech",
  "pathologist",
  "verified",
  "remarks",
]);
