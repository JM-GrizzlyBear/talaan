import { describe, expect, it } from "vitest";
import { sheetLayout, toSheets } from "./labelLayout";
import { LABEL_SIZES, PAPER_SIZES } from "./sizes";

describe("fitting labels on paper", () => {
  it("fits 24 medium labels on A4 sticker sheets", () => {
    const layout = sheetLayout(PAPER_SIZES.a4, LABEL_SIZES.medium, 0);
    expect(layout).toMatchObject({ columns: 3, rows: 8, perSheet: 24 });
    expect(layout.left).toBeCloseTo(0);
    expect(layout.top).toBeCloseTo(0.5);
  });

  it("fits fewer with a margin, and more on long paper", () => {
    expect(sheetLayout(PAPER_SIZES.a4, LABEL_SIZES.medium, 5).perSheet).toBe(
      14,
    );
    expect(sheetLayout(PAPER_SIZES.a4, LABEL_SIZES.small, 0).perSheet).toBe(36);
    expect(sheetLayout(PAPER_SIZES.long, LABEL_SIZES.small, 0).perSheet).toBe(
      44,
    );
    expect(sheetLayout(PAPER_SIZES.legal, LABEL_SIZES.small, 5).perSheet).toBe(
      33,
    );
  });

  it("fits none when the label is bigger than the paper", () => {
    expect(
      sheetLayout({ width: 60, height: 60 }, LABEL_SIZES.large, 0).perSheet,
    ).toBe(0);
  });
});

describe("filling sheets", () => {
  it("fills sheets in order", () => {
    expect(toSheets([1, 2, 3, 4, 5], 2, 0)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("leaves used spaces empty on the first sheet", () => {
    expect(toSheets(["a", "b"], 3, 2)).toEqual([[null, null, "a"], ["b"]]);
  });

  it("never skips a whole sheet", () => {
    expect(toSheets(["a"], 3, 10)).toEqual([[null, null, "a"]]);
  });

  it("makes no sheets when there's nothing to print", () => {
    expect(toSheets([], 24, 0)).toEqual([]);
    expect(toSheets(["a"], 0, 0)).toEqual([]);
  });
});
