import { describe, expect, it } from "vitest";
import { suggestedPasskeyName } from "./deviceName";

describe("suggested passkey names", () => {
  it("names the device", () => {
    expect(
      suggestedPasskeyName(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15",
      ),
    ).toBe("iPhone");
    expect(
      suggestedPasskeyName(
        "Mozilla/5.0 (Linux; Android 15; Pixel 9) Chrome/141",
      ),
    ).toBe("Android phone");
    expect(
      suggestedPasskeyName(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/141",
      ),
    ).toBe("Windows computer");
    expect(suggestedPasskeyName("")).toBe("My device");
  });
});
