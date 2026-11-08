import type { KnownLabTest } from "./knownLabTest.js";

// Complete blood count (CBC)
export const BLOOD_COUNT_TESTS: KnownLabTest[] = [
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
];
