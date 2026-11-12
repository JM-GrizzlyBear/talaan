import { describe, expect, it } from "vitest";
import type { TextLine } from "../types.js";
import { datesIn, findRecordDate } from "./dates.js";
import { readDetails } from "./readDetails.js";

const TODAY = "2026-11-12";
const text = (s: string, confidence: number | null = null): TextLine[] =>
  s
    .trim()
    .split("\n")
    .map((t) => ({ text: t.trim(), confidence }));

describe("dates", () => {
  it("reads month/day/year, and says when it could be the other way", () => {
    expect(datesIn("10/05/2026")).toEqual([
      { iso: "2026-10-05", otherWay: "May 10" },
    ]);
    expect(datesIn("10/5/26")[0].iso).toBe("2026-10-05");
    // Only one way works
    expect(datesIn("25/10/2026")).toEqual([
      { iso: "2026-10-25", otherWay: null },
    ]);
    expect(datesIn("10/10/2026")[0].otherWay).toBeNull();
    expect(datesIn("2026-03-02")[0].iso).toBe("2026-03-02");
    expect(datesIn("Oct. 5, 2026")[0].iso).toBe("2026-10-05");
    expect(datesIn("5 October 2026")[0].iso).toBe("2026-10-05");
    expect(datesIn("13/13/2026")).toEqual([]);
  });

  it("takes the record's date, not the birth date", () => {
    const found = findRecordDate(
      text(`
        Name: SANTOS, MARIA L.     Birthdate: 03/14/1980
        Date Collected: 10/05/2026
      `),
      TODAY,
    );
    expect(found).toMatchObject({ value: "2026-10-05" });
    expect(found?.doubts).toEqual([
      "Read as month/day/year. Could it be May 10?",
    ]);
  });

  it("marks a date without a label, or in the future", () => {
    const guessed = findRecordDate(text("Manila, November 2, 2026"), TODAY);
    expect(guessed?.doubts).toContain("Guessed: there was no label for it");
    const future = findRecordDate(text("Date: 12/25/2026"), TODAY);
    expect(future?.doubts).toContain("This date is in the future");
  });
});

describe("reading a printout", () => {
  it("reads a lab result", () => {
    const d = readDetails(
      text(`
        ST. LUKE'S MEDICAL CENTER
        279 E. Rodriguez Sr. Ave., Quezon City   Tel. 8723-0101
        DEPARTMENT OF PATHOLOGY AND LABORATORY MEDICINE
        HEMATOLOGY
        Patient: SANTOS, MARIA L.    Age/Sex: 46/F
        Requesting Physician: DR. JUAN DELA CRUZ, MD
        Date Collected: 10/05/2026
        COMPLETE BLOOD COUNT
        Hemoglobin 112 g/L 120-160
        Hematocrit 0.36 L/L 0.37-0.47
        Platelet 250 x10^9/L 150-400
        ANA REYES, MD, FPSP  Pathologist
      `),
      TODAY,
    );
    expect(d.type?.value).toBe("lab");
    expect(d.title?.value).toBe("CBC");
    expect(d.recordDate?.value).toBe("2026-10-05");
    expect(d.doctor?.value).toBe("Dr. Juan dela Cruz");
    expect(d.doctor?.doubts).toEqual([]);
    expect(d.facility?.value).toBe("St. Luke's Medical Center");
    expect(d.labRows.map((r) => r.name)).toEqual([
      "Hemoglobin",
      "Hematocrit",
      "Platelet count",
    ]);
  });

  it("reads an X-ray report: body part and the impression", () => {
    const d = readDetails(
      text(`
        THE MEDICAL CITY
        DEPARTMENT OF RADIOLOGY
        ROENTGENOLOGIC REPORT
        Name: SANTOS, MARIA    Date of Exam: September 12, 2026
        Examination: CHEST PA
        Referring Physician: Dr. Jose Rizal
        FINDINGS:
        The lungs are clear. The heart is not enlarged.
        IMPRESSION:
        No active lung disease.
        PEDRO CRUZ, MD, FPCR
        Radiologist
      `),
      TODAY,
    );
    expect(d.type?.value).toBe("imaging");
    expect(d.title?.value).toBe("Chest X-ray");
    expect(d.bodyPart?.value).toBe("Chest PA");
    expect(d.reading?.value).toBe("No active lung disease.");
    expect(d.recordDate?.value).toBe("2026-09-12");
    expect(d.doctor?.value).toBe("Dr. Jose Rizal");
    expect(d.facility?.value).toBe("The Medical City");
  });

  it("reads a printed prescription, and marks hard-to-read lines", () => {
    const d = readDetails(
      text(
        `
        DR. ANA SANTOS-LIM, MD
        Internal Medicine
        Healthway Clinic, SM Megamall
        Date: 11/10/2026
        Rx
        1. Losartan 50mg tab #30
        Sig: 1 tab once a day
        2. Metformin 500 mg tab #60
        Sig: 1 tab twice a day after meals
        Lic. No. 0123456   PTR 789
      `,
        60,
      ),
      TODAY,
    );
    expect(d.type?.value).toBe("prescription");
    expect(d.doctor?.value).toBe("Dr. Ana Santos-Lim");
    expect(d.facility?.value).toBe("Healthway Clinic, SM Megamall");
    expect(
      d.medicines.map(({ name, dose, frequency }) => [name, dose, frequency]),
    ).toEqual([
      ["Losartan", "50 mg", "1 tab once a day"],
      ["Metformin", "500 mg", "1 tab twice a day after meals"],
    ]);
    // Read from a blurry photo: every part says so
    expect(d.medicines[0].doubts).toContain("Hard to read: check each word");
    expect(d.recordDate?.doubts).toContain("Hard to read on the photo");
  });

  it("reads a hospital bill with the HMO and LOA number", () => {
    const d = readDetails(
      text(`
        ASIAN HOSPITAL AND MEDICAL CENTER
        STATEMENT OF ACCOUNT
        Patient: SANTOS, MARIA    Admission Date: 09/12/2026
        HMO: MAXICARE HEALTHCARE CORP.
        LOA No.: LOA-2026-55821
        Total Hospital Bill      ₱ 48,250.75
        Less: HMO Coverage       ₱ 40,000.00
        Amount Due               ₱ 8,250.75
      `),
      TODAY,
    );
    expect(d.type?.value).toBe("billing");
    expect(d.title?.value).toBe("Statement of account");
    expect(d.facility?.value).toBe("Asian Hospital and Medical Center");
    expect(d.hmo?.value).toBe("Maxicare Healthcare Corp.");
    expect(d.loaNumber?.value).toBe("LOA-2026-55821");
    expect(d.totalAmount?.value).toBe("48250.75");
    expect(d.hmoCovered?.value).toBe("40000.00");
    expect(d.youPaid?.value).toBe("8250.75");
    expect(d.recordDate?.value).toBe("2026-09-12");
  });

  it("reads a vaccination card", () => {
    const d = readDetails(
      text(`
        CITY HEALTH OFFICE
        VACCINATION CARD
        Vaccine: Influenza (Vaxigrip Tetra)
        2nd dose
        Date of Vaccination: 04/18/2026
      `),
      TODAY,
    );
    expect(d.type?.value).toBe("vaccination");
    expect(d.vaccine?.value).toBe("Influenza (Vaxigrip Tetra)");
    expect(d.dose?.value).toBe("2nd Dose");
    expect(d.recordDate?.value).toBe("2026-04-18");
  });

  it("leaves blank what it can't find", () => {
    const d = readDetails(text("blurry\nnothing here"), TODAY);
    expect(d).toMatchObject({
      type: null,
      title: null,
      recordDate: null,
      doctor: null,
      facility: null,
      medicines: [],
      labRows: [],
    });
  });
});
