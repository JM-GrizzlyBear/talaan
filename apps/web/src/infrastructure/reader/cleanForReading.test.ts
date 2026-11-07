import { describe, expect, it } from "vitest";
import { eraseTableLines } from "./cleanForReading";

// A small white picture: 200 × 100
const W = 200;
const H = 100;
const blank = () => new Uint8ClampedArray(W * H).fill(255);
const at = (x: number, y: number) => y * W + x;

describe("eraseTableLines", () => {
  it("paints long table lines white", () => {
    const grey = blank();
    for (let x = 0; x < W; x++) grey[at(x, 50)] = 0; // a border across
    for (let y = 0; y < H; y++) grey[at(120, y)] = 0; // a border down
    const out = eraseTableLines(grey, W, H);
    expect(out[at(10, 50)]).toBe(255);
    expect(out[at(120, 10)]).toBe(255);
  });

  it("keeps letters, which are short", () => {
    const grey = blank();
    for (let y = 20; y < 35; y++) grey[at(30, y)] = 0; // an "l"
    for (let x = 40; x < 55; x++) grey[at(x, 30)] = 0; // a "-"
    const out = eraseTableLines(grey, W, H);
    expect(out[at(30, 25)]).toBe(0);
    expect(out[at(45, 30)]).toBe(0);
  });

  it("clears a line's soft grey edge, but not ink beside it", () => {
    const grey = blank();
    for (let x = 0; x < W; x++) {
      grey[at(x, 60)] = 0;
      grey[at(x, 61)] = 180; // anti-aliased edge
    }
    const out = eraseTableLines(grey, W, H);
    expect(out[at(5, 61)]).toBe(255);
  });
});
