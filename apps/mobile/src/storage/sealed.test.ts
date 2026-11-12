import { describe, expect, it } from "vitest";
import { seal, unseal } from "./sealed";

const random = (n: number) => crypto.getRandomValues(new Uint8Array(n));

describe("records kept on the phone", () => {
  it("are encrypted, and open only with the same key", () => {
    const key = random(32);
    const record = { title: "CBC", notes: "Hemoglobin 11.2, ñ é" };
    const text = seal(record, key, random);
    expect(text).not.toContain("CBC");
    expect(unseal(text, key)).toEqual(record);
    expect(unseal(text, random(32))).toBeNull();
    expect(unseal(`${text}x`, key)).toBeNull();
  });

  it("are different every time, even for the same record", () => {
    const key = random(32);
    expect(seal({ a: 1 }, key, random)).not.toBe(seal({ a: 1 }, key, random));
  });
});
