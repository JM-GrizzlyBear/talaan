import { describe, expect, it } from "vitest";
import {
  cantMoveInto,
  levelsInside,
  pathText,
  pathTo,
} from "../../src/domain/place/rules.js";

// Cabinet › Drawer › Folder, and a Box on its own
const places = [
  { id: "cabinet", name: "Cabinet", parentId: null },
  { id: "drawer", name: "Drawer", parentId: "cabinet" },
  { id: "folder", name: "Folder", parentId: "drawer" },
  { id: "box", name: "Box", parentId: null },
];

describe("places inside places", () => {
  it("names the way in, outermost first", () => {
    expect(pathText(pathTo(places, "folder"))).toBe("Cabinet › Drawer");
    expect(pathTo(places, "cabinet")).toEqual([]);
  });

  it("counts the levels below a place", () => {
    expect(levelsInside(places, "cabinet")).toBe(3);
    expect(levelsInside(places, "box")).toBe(1);
  });

  it("allows up to 3 levels", () => {
    expect(cantMoveInto(places, null, "drawer")).toBeNull();
    expect(cantMoveInto(places, null, "folder")).toMatch(/at most 3 levels/);
    expect(cantMoveInto(places, "box", "drawer")).toBeNull();
    expect(cantMoveInto(places, "drawer", "box")).toBeNull();
    expect(cantMoveInto(places, "cabinet", "box")).toMatch(/at most 3 levels/);
  });

  it("never puts a place inside itself or inside what's in it", () => {
    expect(cantMoveInto(places, "cabinet", "cabinet")).toMatch(/inside itself/);
    expect(cantMoveInto(places, "cabinet", "folder")).toMatch(/inside itself/);
  });

  it("doesn't loop on bad data", () => {
    const loop = [
      { id: "a", name: "A", parentId: "b" },
      { id: "b", name: "B", parentId: "a" },
    ];
    expect(pathTo(loop, "a").length).toBeLessThanOrEqual(2);
  });
});
