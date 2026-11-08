import type { KnownLabTest } from "./knownLabTest.js";

// Urinalysis: many results are words ("Negative") or counts ("0-2")
export const URINALYSIS_TESTS: KnownLabTest[] = [
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
