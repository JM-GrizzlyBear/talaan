import { describe, expect, it } from "vitest";
import { ageFrom } from "./age";

const today = new Date(2026, 10, 7); // Nov 7, 2026

describe("ages", () => {
  it("uses years from 2, months under 2, weeks and days for babies", () => {
    expect(ageFrom("1950-01-15", today)).toBe("76 years old");
    expect(ageFrom("2021-11-07", today)).toBe("5 years old");
    expect(ageFrom("2021-11-08", today)).toBe("4 years old");
    expect(ageFrom("2025-03-14", today)).toBe("19 months old");
    expect(ageFrom("2026-10-07", today)).toBe("1 month old");
    expect(ageFrom("2026-10-20", today)).toBe("2 weeks old");
    expect(ageFrom("2026-11-06", today)).toBe("1 day old");
  });
});
