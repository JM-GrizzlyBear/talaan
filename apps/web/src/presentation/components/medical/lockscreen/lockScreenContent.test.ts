import { EMPTY_MEDICAL_ID } from "@talaan/shared";
import { describe, expect, it } from "vitest";
import { DEFAULT_LOCK_SCREEN, lockScreenSections } from "./lockScreenContent";

const fields = {
  ...EMPTY_MEDICAL_ID,
  allergies: [
    { name: "Shrimp", reaction: "", severity: "mild" as const },
    { name: "Penicillin", reaction: "", severity: "life-threatening" as const },
  ],
  medicines: [{ name: "Losartan", dose: "50 mg" }],
  contacts: [{ name: "Ana", relationship: "Anak", phone: "0917 123 4567" }],
  philhealth: "12-345678901-2",
  address: "12 Mabini St., Marikina City",
};

describe("the lock screen picture", () => {
  it("shows allergies (worst first) and contacts, not medicines or PhilHealth by default", () => {
    const sections = lockScreenSections(fields, DEFAULT_LOCK_SCREEN);
    expect(sections.map((s) => s.title)).toEqual([
      "Allergies",
      "In an emergency, call",
    ]);
    expect(sections[0].lines[0]).toEqual({
      text: "Penicillin (life-threatening)",
      strong: true,
      alert: true,
    });
    expect(sections[1].lines[0].text).toBe("Ana (Anak): 0917 123 4567");
  });

  it("adds what's turned on", () => {
    const sections = lockScreenSections(fields, {
      ...DEFAULT_LOCK_SCREEN,
      medicines: true,
      philhealth: true,
      address: true,
    });
    expect(sections.map((s) => s.title)).toContain("PhilHealth ID");
    expect(
      sections.find((s) => s.title === "Home address")?.lines[0].text,
    ).toBe("12 Mabini St., Marikina City");
    expect(sections.find((s) => s.title === "Medicines")?.lines[0].text).toBe(
      "Losartan, 50 mg",
    );
  });
});
