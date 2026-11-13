import { describe, expect, it } from "vitest";
import { tokenFromLink } from "./inviteLink";

const token = "abcDEF123_-abcDEF123_-xyz";

describe("tokenFromLink", () => {
  it("finds the token in the emailed link", () => {
    expect(
      tokenFromLink(`https://talaan-family.netlify.app/invite/${token}`),
    ).toBe(token);
    expect(tokenFromLink(`  https://x.app/invite/${token}?utm=1 `)).toBe(token);
  });
  it("takes the token alone", () => {
    expect(tokenFromLink(token)).toBe(token);
  });
  it("refuses other text", () => {
    expect(tokenFromLink("https://x.app/records/123")).toBeNull();
    expect(tokenFromLink("hello")).toBeNull();
    expect(tokenFromLink(`https://x.app/invite/short`)).toBeNull();
  });
});
