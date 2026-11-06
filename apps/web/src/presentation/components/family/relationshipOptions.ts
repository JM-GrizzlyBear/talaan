import { FAMILY_RELATIONSHIPS } from "@talaan/shared";

// The "Who they are to you" choices ("Other" reads "Other family")
export const relationshipOptions = FAMILY_RELATIONSHIPS.map((r) => ({
  value: r,
  label: r === "Other" ? "Other family" : r,
}));
