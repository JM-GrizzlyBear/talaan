import {
  formatRange,
  labFlag,
  recordFieldsSchema,
  type RecordFields,
} from "@talaan/shared";
import { describe, expect, it } from "vitest";
import { diffRecords } from "../../src/domain/record/diff.js";
import {
  outOfRangeCount,
  purgeAt,
  purgeCutoff,
} from "../../src/domain/record/rules.js";

const lab = (results: object[], extra: object = {}) =>
  recordFieldsSchema.parse({
    type: "lab",
    title: "CBC",
    recordDate: "2026-11-01",
    details: { results },
    ...extra,
  });
const hb = (
  value: string,
  range: [number | null, number | null] = [12, 16],
) => ({
  name: "Hemoglobin",
  value,
  unit: "g/dL",
  rangeLow: range[0],
  rangeHigh: range[1],
});
const names = (id: string | null) =>
  id === null ? "Maria Santos" : "Juanito Santos";

describe("lab flags", () => {
  it("flags plain numbers outside the range only", () => {
    expect(labFlag(hb("6.0"))).toBe("low");
    expect(labFlag(hb("17"))).toBe("high");
    expect(labFlag(hb("13.5"))).toBeNull();
    expect(labFlag(hb("1,200", [null, 1000]))).toBe("high");
    expect(labFlag(hb("<0.5", [0, 1]))).toBeNull();
    expect(labFlag(hb("Negative", [null, null]))).toBeNull();
  });

  it("writes ranges people can read", () => {
    expect(formatRange({ rangeLow: 12, rangeHigh: 16 })).toBe("12–16");
    expect(formatRange({ rangeLow: null, rangeHigh: 200 })).toBe("< 200");
    expect(formatRange({ rangeLow: 40, rangeHigh: null })).toBe("> 40");
    expect(formatRange({ rangeLow: null, rangeHigh: null })).toBe("");
  });

  it("counts results outside the range", () => {
    expect(outOfRangeCount(lab([hb("6.0"), hb("13")]))).toBe(1);
  });
});

describe("the Trash", () => {
  it("keeps records for 30 days", () => {
    const deleted = new Date("2026-11-01T00:00:00Z");
    expect(purgeAt(deleted).toISOString()).toBe("2026-12-01T00:00:00.000Z");
    expect(purgeCutoff(new Date("2026-12-01T00:00:00Z")).toISOString()).toBe(
      deleted.toISOString(),
    );
  });
});

describe("what an edit changed", () => {
  it("names each changed field with before and after", () => {
    const before = lab([hb("6.0")], { doctor: "Dr. Cruz" });
    const after = lab([hb("8.0")], {
      doctor: "Dr. Reyes",
      title: "CBC (repeat)",
      profileId: "00000000-0000-4000-8000-000000000009",
    });
    expect(diffRecords(before, after, names)).toEqual([
      { field: "For", from: "Maria Santos", to: "Juanito Santos" },
      { field: "Title", from: "CBC", to: "CBC (repeat)" },
      { field: "Doctor", from: "Dr. Cruz", to: "Dr. Reyes" },
      { field: "Hemoglobin result", from: "6.0 g/dL", to: "8.0 g/dL" },
    ]);
  });

  it("lists added and removed lab tests and range changes", () => {
    const before = lab([
      hb("6.0"),
      { name: "WBC", value: "9", unit: "", rangeLow: null, rangeHigh: null },
    ]);
    const after = lab([
      hb("6.0", [11, 15]),
      {
        name: "Platelet",
        value: "250",
        unit: "x10^9/L",
        rangeLow: 150,
        rangeHigh: 400,
      },
    ]);
    expect(diffRecords(before, after, names)).toEqual([
      { field: "Hemoglobin normal range", from: "12–16", to: "11–15" },
      { field: "Lab test removed", from: "WBC: 9", to: null },
      {
        field: "Lab test added",
        from: null,
        to: "Platelet: 250 x10^9/L (normal 150–400)",
      },
    ]);
  });

  it("finds nothing when nothing changed", () => {
    expect(diffRecords(lab([hb("6.0")]), lab([hb("6.0")]), names)).toEqual([]);
  });

  it("compares medicines and money", () => {
    const rx = (medicines: object[]) =>
      recordFieldsSchema.parse({
        type: "prescription",
        title: "Rx",
        recordDate: "2026-11-01",
        details: { medicines },
      });
    expect(
      diffRecords(
        rx([{ name: "Amoxicillin", dose: "500 mg", frequency: "3x a day" }]),
        rx([{ name: "Amoxicillin", dose: "250 mg", frequency: "3x a day" }]),
        names,
      ),
    ).toEqual([{ field: "Amoxicillin dose", from: "500 mg", to: "250 mg" }]);

    const bill = (details: object) =>
      recordFieldsSchema.parse({
        type: "billing",
        title: "SOA",
        recordDate: "2026-11-01",
        details,
      });
    expect(
      diffRecords(
        bill({ hmo: "Maxicare", totalAmount: 12500 }),
        bill({ hmo: "Maxicare", totalAmount: 12500, hmoCovered: 10000.5 }),
        names,
      ),
    ).toEqual([{ field: "HMO covered", from: null, to: "₱10,000.50" }]);
  });

  it("notes a type change and the fields that came or went", () => {
    const before = recordFieldsSchema.parse({
      type: "imaging",
      title: "Chest",
      recordDate: "2026-11-01",
      details: { bodyPart: "Chest PA", reading: "Normal" },
    }) as RecordFields;
    const after = recordFieldsSchema.parse({
      type: "other",
      title: "Chest",
      recordDate: "2026-11-01",
    }) as RecordFields;
    expect(diffRecords(before, after, names)).toEqual([
      { field: "Type", from: "X-ray / imaging", to: "Other" },
      { field: "What was imaged", from: "Chest PA", to: null },
      { field: "Reading", from: "Normal", to: null },
    ]);
  });
});
