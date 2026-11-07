import { describe, expect, it } from "vitest";
import { addToForm, chosenRows, toCheckRows } from "./checkRows";

describe("checking read rows", () => {
  const read = toCheckRows([
    {
      name: "Hemoglobin",
      value: "6.0",
      unit: "g/dL",
      rangeLow: 12,
      rangeHigh: 16,
      doubts: [],
      line: "Hemoglobin 6.0 g/dL 12.0 - 16.0",
    },
    {
      name: "WBC",
      value: "9.1",
      unit: "",
      rangeLow: null,
      rangeHigh: null,
      doubts: ["Hard to read on the photo"],
      line: "WBC 9.1",
    },
  ]);

  it("starts with every row ticked, ranges as text", () => {
    expect(read[0]).toMatchObject({
      include: true,
      rangeLow: "12",
      rangeHigh: "16",
    });
    expect(read[1]).toMatchObject({
      rangeLow: "",
      doubts: ["Hard to read on the photo"],
    });
  });

  it("adds only ticked rows, after what's already typed, dropping empty rows", () => {
    read[1].include = false;
    const empty = {
      name: "",
      value: "",
      unit: "",
      rangeLow: "",
      rangeHigh: "",
    };
    const typed = {
      name: "Platelet count",
      value: "250",
      unit: "",
      rangeLow: "",
      rangeHigh: "",
    };
    expect(addToForm([typed, empty], chosenRows(read))).toEqual([
      typed,
      {
        name: "Hemoglobin",
        value: "6.0",
        unit: "g/dL",
        rangeLow: "12",
        rangeHigh: "16",
      },
    ]);
  });
});
