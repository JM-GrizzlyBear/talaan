import { describe, expect, it } from "vitest";
import {
  ageOn,
  allergiesBySeverity,
  emergencyName,
  isEmptyMedicalId,
  telLink,
} from "./helpers.js";
import { EMPTY_MEDICAL_ID, medicalIdSchema } from "./schema.js";

describe("the Medical ID form", () => {
  it("can be empty", () => {
    expect(isEmptyMedicalId(medicalIdSchema.parse({}))).toBe(true);
  });

  it("writes a PhilHealth ID the usual way, and checks its digits", () => {
    expect(
      medicalIdSchema.parse({ philhealth: "123456789012" }).philhealth,
    ).toBe("12-345678901-2");
    const bad = medicalIdSchema.safeParse({ philhealth: "1234" });
    expect(bad.error?.issues[0].message).toBe("A PhilHealth ID has 12 digits");
  });

  it("takes phone numbers as people write them", () => {
    for (const phone of [
      "0917 123 4567",
      "+63 917-123-4567",
      "(02) 8123 4567",
    ]) {
      expect(
        medicalIdSchema.safeParse({
          contacts: [{ name: "Ana", phone }],
        }).success,
      ).toBe(true);
    }
    expect(
      medicalIdSchema.safeParse({
        contacts: [{ name: "Ana", phone: "call me" }],
      }).success,
    ).toBe(false);
  });

  it("needs a name for each item, and limits contacts to 5", () => {
    expect(
      medicalIdSchema.safeParse({ allergies: [{ name: " " }] }).error?.issues[0]
        .message,
    ).toBe("Enter the allergy");
    const six = Array.from({ length: 6 }, () => ({
      name: "A",
      phone: "09171234567",
    }));
    expect(medicalIdSchema.safeParse({ contacts: six }).success).toBe(false);
  });

  it("refuses a birth date in the future", () => {
    expect(medicalIdSchema.safeParse({ birthDate: "2999-01-01" }).success).toBe(
      false,
    );
  });
});

describe("Medical ID helpers", () => {
  it("puts life-threatening allergies first", () => {
    expect(
      allergiesBySeverity([
        { name: "Dust", reaction: "", severity: "mild" },
        { name: "Penicillin", reaction: "", severity: "life-threatening" },
      ]).map((a) => a.name),
    ).toEqual(["Penicillin", "Dust"]);
  });

  it("works out the age", () => {
    expect(ageOn("1990-11-10", "2026-11-10")).toBe(36);
    expect(ageOn("1990-11-11", "2026-11-10")).toBe(35);
    expect(ageOn("", "2026-11-10")).toBeNull();
  });

  it("shortens the name for the emergency page, and makes call links", () => {
    expect(emergencyName("Maria", "Santos")).toBe("Maria S.");
    expect(telLink("+63 917-123-4567")).toBe("tel:+639171234567");
    expect(telLink("0917 123 4567")).toBe("tel:09171234567");
  });

  it("starts empty", () => {
    expect(EMPTY_MEDICAL_ID.contacts).toEqual([]);
    expect(EMPTY_MEDICAL_ID.doctor.phone).toBe("");
  });
});
