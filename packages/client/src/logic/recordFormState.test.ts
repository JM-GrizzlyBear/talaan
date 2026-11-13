import { describe, expect, it } from "vitest";
import {
  emptyForm,
  fieldsFromForm,
  parseNumber,
  sentRowIndexes,
} from "./recordFormState";

describe("the record form", () => {
  it("reads numbers the way people type them", () => {
    expect(parseNumber("1,234.50")).toBe(1234.5);
    expect(parseNumber("₱500")).toBe(500);
    expect(parseNumber("  ")).toBeNull();
    expect(parseNumber("12-16")).toBeUndefined();
  });

  it("skips empty lab rows and flags boxes that aren't numbers", () => {
    const form = {
      ...emptyForm(),
      type: "lab" as const,
      title: "CBC",
      results: [
        { name: "", value: "", unit: "", rangeLow: "", rangeHigh: "" },
        {
          name: "Hemoglobin",
          value: "6.0",
          unit: "g/dL",
          rangeLow: "12",
          rangeHigh: "sixteen",
        },
      ],
    };
    const { fields, errors } = fieldsFromForm(form);
    expect(fields).toBeNull();
    expect(errors).toEqual({
      "details.results.0.rangeHigh": "Enter a number, like 12.5",
    });
    expect(sentRowIndexes(form.results)).toEqual([1]);

    form.results[1].rangeHigh = "16";
    const ok = fieldsFromForm(form).fields;
    expect(ok?.type === "lab" && ok.details?.results).toEqual([
      {
        name: "Hemoglobin",
        value: "6.0",
        unit: "g/dL",
        rangeLow: 12,
        rangeHigh: 16,
      },
    ]);
  });

  it("needs a type first", () => {
    expect(fieldsFromForm(emptyForm()).errors).toEqual({
      type: "Choose a record type",
    });
  });
});
