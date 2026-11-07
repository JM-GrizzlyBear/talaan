import { describe, expect, it } from "vitest";
import { readLabLine } from "./readLabLines.js";

const read = (text: string, confidence: number | null = 95) =>
  readLabLine({ text, confidence });

describe("reading the ways printouts write a result", () => {
  it("reads test, result, unit and range in the usual order", () => {
    expect(read("Hemoglobin 6.0 g/dL 12.0 - 16.0")).toMatchObject({
      name: "Hemoglobin",
      value: "6.0",
      unit: "g/dL",
      rangeLow: 12,
      rangeHigh: 16,
      doubts: [],
    });
  });

  it("understands the many ways printouts write it", () => {
    const cases: [string, object][] = [
      [
        "HGB: 135 g/L (120-160)",
        {
          name: "Hemoglobin",
          value: "135",
          unit: "g/L",
          rangeLow: 120,
          rangeHigh: 160,
        },
      ],
      [
        "Hematocrit 0.38 0.37-0.47",
        {
          name: "Hematocrit",
          value: "0.38",
          unit: "",
          rangeLow: 0.37,
          rangeHigh: 0.47,
        },
      ],
      [
        "WBC 9.1 x10^9/L 4.5 – 11.0",
        {
          name: "WBC",
          value: "9.1",
          unit: "x10^9/L",
          rangeLow: 4.5,
          rangeHigh: 11,
        },
      ],
      [
        "Platelet Count 250 x 10^9/L 150-400",
        {
          name: "Platelet count",
          value: "250",
          unit: "x10^9/L",
          rangeLow: 150,
          rangeHigh: 400,
        },
      ],
      [
        "FBS 7.2 H mmol/L 4.1 - 5.9",
        {
          name: "FBS",
          value: "7.2",
          unit: "mmol/L",
          rangeLow: 4.1,
          rangeHigh: 5.9,
        },
      ],
      [
        "Fasting Blood Sugar (FBS) : 98 mg/dl 70 to 100",
        {
          name: "FBS",
          value: "98",
          unit: "mg/dL",
          rangeLow: 70,
          rangeHigh: 100,
        },
      ],
      [
        "Total Cholesterol 6.4 mmol/L < 5.2",
        {
          name: "Total cholesterol",
          value: "6.4",
          unit: "mmol/L",
          rangeLow: null,
          rangeHigh: 5.2,
        },
      ],
      [
        "HDL 0.9 mmol/L > 1.04",
        {
          name: "HDL",
          value: "0.9",
          unit: "mmol/L",
          rangeLow: 1.04,
          rangeHigh: null,
        },
      ],
      [
        "SGPT/ALT 52 U/L up to 40",
        {
          name: "SGPT / ALT",
          value: "52",
          unit: "U/L",
          rangeLow: null,
          rangeHigh: 40,
        },
      ],
      [
        "Creatinine umol/L 88 53-115",
        {
          name: "Creatinine",
          value: "88",
          unit: "µmol/L",
          rangeLow: 53,
          rangeHigh: 115,
        },
      ],
      [
        "HbA1c 6.8 % 4.0-5.6",
        { name: "HbA1c", value: "6.8", unit: "%", rangeLow: 4, rangeHigh: 5.6 },
      ],
      [
        "Potassium 3.2 L mEq/L 3.5 - 5.1",
        {
          name: "Potassium",
          value: "3.2",
          unit: "mEq/L",
          rangeLow: 3.5,
          rangeHigh: 5.1,
        },
      ],
      [
        "Platelet 250,000 /uL 150,000 - 400,000",
        {
          name: "Platelet count",
          value: "250000",
          unit: "/uL",
          rangeLow: 150000,
          rangeHigh: 400000,
        },
      ],
      [
        "• Uric Acid ........ 420 umol/l 150-420",
        {
          name: "Uric acid",
          value: "420",
          unit: "µmol/L",
          rangeLow: 150,
          rangeHigh: 420,
        },
      ],
    ];
    for (const [line, expected] of cases) {
      expect(read(line), line).toMatchObject(expected);
    }
  });

  it("reads urinalysis words and cell counts", () => {
    expect(read("Pus cells 0-2 /hpf")).toMatchObject({
      name: "Pus cells",
      value: "0-2",
      unit: "/hpf",
    });
    expect(read("Sugar Negative")).toMatchObject({
      name: "Sugar",
      value: "Negative",
    });
    expect(read("Color Light Yellow")).toMatchObject({
      name: "Color",
      value: "Light Yellow",
    });
    expect(read("Protein Trace")).toMatchObject({
      name: "Protein",
      value: "Trace",
    });
    expect(read("Bacteria Few")).toMatchObject({
      name: "Bacteria",
      value: "Few",
    });
  });

  it("keeps results like <0.5", () => {
    expect(read("TSH <0.01 mIU/L 0.4-4.0")).toMatchObject({
      value: "<0.01",
      rangeLow: 0.4,
      rangeHigh: 4,
    });
  });

  it("prefers the longest name (RBC count over RBC, MCHC over MCH)", () => {
    expect(read("RBC Count 4.5 x10^12/L 4.2-5.4")?.name).toBe("RBC");
    expect(read("MCHC 33 g/dL 32-36")?.name).toBe("MCHC");
    expect(read("MCH 28 pg 27-31")?.name).toBe("MCH");
  });
});
