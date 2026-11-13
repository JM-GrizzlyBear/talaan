import { describe, expect, it } from "vitest";
import { openedText, sharedThings } from "./shareText";

const record = {
  id: "1",
  title: "CBC",
  type: "lab" as const,
  recordDate: "2026-10-01",
};
const view = { openedAt: "2026-11-10T00:00:00Z", device: "Chrome on Android" };

describe("how a link reads", () => {
  it("says what's in it", () => {
    expect(
      sharedThings({ medicalId: true, labs: true, records: [record] }),
    ).toBe("Medical ID, lab results, 1 record");
    expect(sharedThings({ medicalId: false, labs: true, records: [] })).toBe(
      "Lab results",
    );
  });

  it("says how often it was opened", () => {
    expect(openedText({ views: [], maxViews: null })).toBe("Not opened yet");
    expect(openedText({ views: [], maxViews: 2 })).toBe(
      "Not opened yet (up to 2 devices)",
    );
    expect(openedText({ views: [view], maxViews: null })).toBe(
      "Opened on 1 device",
    );
    expect(openedText({ views: [view, view], maxViews: 3 })).toBe(
      "Opened on 2 of 3 devices",
    );
  });
});
