import { describe, expect, it } from "vitest";
import { newShareSchema, shareSettingsSchema } from "./schemas.js";
import { randomPin, shareStatus } from "./status.js";

const base = {
  recipient: "Dr. Reyes",
  medicalId: true,
  expiresAt: "2026-11-17T10:00:00+08:00",
};

describe("a new share link", () => {
  it("needs who it's for and at least one thing to share", () => {
    expect(newShareSchema.safeParse(base).success).toBe(true);
    const nothing = newShareSchema.safeParse({ ...base, medicalId: false });
    expect(nothing.error?.issues[0].path).toEqual(["what"]);
    const noName = newShareSchema.safeParse({ ...base, recipient: "  " });
    expect(noName.error?.issues[0].path).toEqual(["recipient"]);
  });

  it("takes a 6-digit PIN or none", () => {
    expect(newShareSchema.parse(base).pin).toBe("");
    expect(newShareSchema.parse({ ...base, pin: "048213" }).pin).toBe("048213");
    expect(newShareSchema.safeParse({ ...base, pin: "1234" }).success).toBe(
      false,
    );
    expect(newShareSchema.safeParse({ ...base, pin: "12a456" }).success).toBe(
      false,
    );
  });

  it("can limit how many times it's opened", () => {
    expect(newShareSchema.parse(base).maxViews).toBeNull();
    expect(newShareSchema.parse({ ...base, maxViews: 3 }).maxViews).toBe(3);
    expect(newShareSchema.safeParse({ ...base, maxViews: 0 }).success).toBe(
      false,
    );
  });

  it("keeps the PIN when changing other settings", () => {
    const parsed = shareSettingsSchema.parse({
      expiresAt: base.expiresAt,
      maxViews: null,
    });
    expect(parsed.pin).toBeUndefined();
  });
});

describe("a link's status", () => {
  const now = new Date("2026-11-10T00:00:00Z");
  const link = {
    stoppedAt: null,
    expiresAt: "2026-11-11T00:00:00Z",
    maxViews: null,
    viewCount: 0,
  };

  it("is open, used up, ended or stopped", () => {
    expect(shareStatus(link, now)).toBe("open");
    expect(shareStatus({ ...link, maxViews: 2, viewCount: 2 }, now)).toBe(
      "used",
    );
    expect(shareStatus({ ...link, expiresAt: now }, now)).toBe("expired");
    expect(shareStatus({ ...link, stoppedAt: now }, now)).toBe("stopped");
  });

  it("makes 6-digit PINs", () => {
    for (let i = 0; i < 20; i++) expect(randomPin()).toMatch(/^\d{6}$/);
    expect(randomPin(() => 0.000001)).toMatch(/^\d{6}$/);
  });
});
