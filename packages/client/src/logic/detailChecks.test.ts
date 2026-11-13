import type { ReadDetails } from "@talaan/shared";
import { describe, expect, it } from "vitest";
import { emptyForm } from "./recordFormState";
import {
  applyChecks,
  notFound,
  toDetailChecks,
  toMedicineChecks,
} from "./detailChecks";

const TODAY = "2026-11-12";
const read = (value: string, doubts: string[] = []) => ({
  value,
  doubts,
  line: value,
});
const none: ReadDetails = {
  type: null,
  title: null,
  recordDate: null,
  doctor: null,
  facility: null,
  bodyPart: null,
  reading: null,
  vaccine: null,
  dose: null,
  hmo: null,
  loaNumber: null,
  totalAmount: null,
  hmoCovered: null,
  youPaid: null,
  medicines: [],
  labRows: [],
};
const form = () => ({ ...emptyForm(), recordDate: TODAY });

describe("checking what was read", () => {
  it("fills empty boxes, and asks before replacing typed ones", () => {
    const details: ReadDetails = {
      ...none,
      type: { ...read("lab"), value: "lab" },
      title: read("CBC"),
      recordDate: read("2026-10-05", ["Read as month/day/year"]),
      doctor: read("Dr. Juan dela Cruz"),
    };
    const typed = { ...form(), doctor: "Dr. Reyes" };
    const checks = toDetailChecks(details, typed, TODAY);
    expect(checks.map((c) => [c.key, c.include, c.current])).toEqual([
      ["type", true, ""],
      ["title", true, ""],
      // Today's date was only the starting value
      ["recordDate", true, ""],
      ["doctor", false, "Dr. Reyes"],
    ]);
    const next = applyChecks(typed, checks, [], []);
    expect(next).toMatchObject({
      type: "lab",
      title: "CBC",
      recordDate: "2026-10-05",
      doctor: "Dr. Reyes",
    });
  });

  it("adds medicines and lab rows after the typed ones", () => {
    const details: ReadDetails = {
      ...none,
      medicines: [
        {
          name: "Losartan",
          dose: "50 mg",
          frequency: "",
          doubts: [],
          line: "",
        },
        {
          name: "Mtfrmn",
          dose: "500 mg",
          frequency: "",
          doubts: ["Hard"],
          line: "",
        },
      ],
    };
    const meds = toMedicineChecks(details);
    meds[1].include = false;
    const start = {
      ...form(),
      medicines: [{ name: "Aspirin", dose: "80 mg", frequency: "" }],
    };
    const next = applyChecks(start, [], [], meds);
    expect(next.medicines.map((m) => m.name)).toEqual(["Aspirin", "Losartan"]);
    const lab = applyChecks(
      form(),
      [],
      [
        {
          name: "Hemoglobin",
          value: "12",
          unit: "g/dL",
          rangeLow: "",
          rangeHigh: "",
        },
      ],
      [],
    );
    // The empty starting row is replaced
    expect(lab.results.map((r) => r.name)).toEqual(["Hemoglobin"]);
  });

  it("lists what couldn't be found, to fill in now or later", () => {
    expect(
      notFound({ ...none, title: read("Statement of account") }, "billing"),
    ).toEqual([
      "Type",
      "Date",
      "Doctor",
      "Clinic or hospital",
      "HMO",
      "LOA number",
      "Total bill (₱)",
      "HMO covered (₱)",
      "You paid (₱)",
    ]);
    expect(notFound(none, "prescription")).toContain("Medicines");
  });
});
