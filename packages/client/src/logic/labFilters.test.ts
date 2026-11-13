import { buildLabSeries, type LabRecordResults } from "@talaan/shared";
import { describe, expect, it } from "vitest";
import { columnsFor, filterSeries, NO_FILTERS } from "./labFilters";

const records: LabRecordResults[] = [
  {
    recordId: "old",
    title: "CBC",
    date: "2020-05-01",
    facility: "",
    results: [
      {
        name: "Hemoglobin",
        value: "13",
        unit: "g/dL",
        rangeLow: 12,
        rangeHigh: 16,
      },
    ],
  },
  {
    recordId: "new",
    title: "Chemistry",
    date: "2026-09-01",
    facility: "St. Luke's",
    results: [
      {
        name: "FBS",
        value: "130",
        unit: "mg/dL",
        rangeLow: 70,
        rangeHigh: 110,
      },
      {
        name: "Hemoglobin",
        value: "12.5",
        unit: "g/dL",
        rangeLow: 12,
        rangeHigh: 16,
      },
    ],
  },
];
const series = buildLabSeries(records);
const names = (list: typeof series) => list.map((s) => s.name);

describe("choosing what to show", () => {
  it("shows everything by default", () => {
    expect(names(filterSeries(series, NO_FILTERS, "2026-11-09"))).toEqual([
      "Hemoglobin",
      "FBS",
    ]);
  });

  it("filters by name, group, and results out of range", () => {
    expect(
      names(
        filterSeries(series, { ...NO_FILTERS, search: "hemo" }, "2026-11-09"),
      ),
    ).toEqual(["Hemoglobin"]);
    expect(
      names(
        filterSeries(
          series,
          { ...NO_FILTERS, group: "Chemistry" },
          "2026-11-09",
        ),
      ),
    ).toEqual(["FBS"]);
    expect(
      names(
        filterSeries(series, { ...NO_FILTERS, onlyOut: true }, "2026-11-09"),
      ),
    ).toEqual(["FBS"]);
  });

  it("keeps only recent years, and the columns they need", () => {
    const recent = filterSeries(
      series,
      { ...NO_FILTERS, years: 2 },
      "2026-11-09",
    );
    expect(recent.find((s) => s.name === "Hemoglobin")?.points).toHaveLength(1);
    expect(columnsFor(records, recent).map((r) => r.recordId)).toEqual(["new"]);
    expect(columnsFor(records, series).map((r) => r.recordId)).toEqual([
      "new",
      "old",
    ]);
  });
});
