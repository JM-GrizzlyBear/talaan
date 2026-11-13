import { describe, expect, it } from "vitest";
import { labelFromScan } from "./labelFromScan";

describe("scanning a QR label", () => {
  it("reads the code from a label's link or the printed code", () => {
    expect(labelFromScan("https://talaan.netlify.app/l/7K4QM2XD")).toBe(
      "7K4QM2XD",
    );
    expect(labelFromScan("https://talaan.netlify.app/l/7k4q-m2xd?x=1")).toBe(
      "7K4QM2XD",
    );
    expect(labelFromScan("7K4Q-M2XD")).toBe("7K4QM2XD");
  });
  it("ignores other QR codes", () => {
    expect(labelFromScan("https://example.com/menu")).toBeNull();
    expect(labelFromScan("WIFI:S:home;;")).toBeNull();
  });
});
