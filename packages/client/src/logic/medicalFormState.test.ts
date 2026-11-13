import { EMPTY_MEDICAL_ID } from "@talaan/shared";
import { describe, expect, it } from "vitest";
import {
  medicalFieldsFromForm,
  formFromFields,
  moveItem,
} from "./medicalFormState";

const form = formFromFields(EMPTY_MEDICAL_ID);

describe("the Medical ID form", () => {
  it("reads height and weight, and marks text that isn't a number", () => {
    expect(
      medicalFieldsFromForm({ ...form, heightCm: "158", weightKg: "62,5" })
        .fields,
    ).toMatchObject({
      heightCm: 158,
      weightKg: 62.5,
    });
    expect(
      medicalFieldsFromForm({ ...form, heightCm: "tall" }).errors,
    ).toHaveProperty("heightCm");
  });

  it("drops blank rows, and “no known allergies” when some are listed", () => {
    const { fields } = medicalFieldsFromForm({
      ...form,
      noKnownAllergies: true,
      allergies: [
        { name: "Penicillin", reaction: "", severity: "severe" },
        { name: " ", reaction: "", severity: "mild" },
      ],
      contacts: [{ name: "", relationship: "", phone: "" }],
    });
    expect(fields?.allergies).toHaveLength(1);
    expect(fields?.noKnownAllergies).toBe(false);
    expect(fields?.contacts).toEqual([]);
  });

  it("moves contacts up and down", () => {
    expect(moveItem(["a", "b", "c"], 2, -1)).toEqual(["a", "c", "b"]);
    expect(moveItem(["a", "b"], 0, -1)).toEqual(["a", "b"]);
  });
});
