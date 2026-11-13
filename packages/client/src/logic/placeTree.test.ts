import type { PlaceSummary } from "@talaan/shared";
import { describe, expect, it } from "vitest";
import { insideOptions, placeTree } from "./placeTree";

const place = (id: string, name: string, parentId: string | null = null) =>
  ({ id, name, parentId }) as PlaceSummary;

// Cabinet › Drawer › Folder, and a Box on its own
const places = [
  place("folder", "Folder", "drawer"),
  place("box", "Box"),
  place("cabinet", "Cabinet"),
  place("drawer", "Drawer", "cabinet"),
];

describe("the places tree", () => {
  it("lists each place before what's inside it", () => {
    expect(placeTree(places).map((r) => `${r.depth}:${r.place.name}`)).toEqual([
      "0:Box",
      "0:Cabinet",
      "1:Drawer",
      "2:Folder",
    ]);
  });

  it("offers only places a new one can go inside (3 levels)", () => {
    expect(insideOptions(places, null).map((o) => o.value)).toEqual([
      "box",
      "cabinet",
      "drawer",
    ]);
  });

  it("never offers the place itself, what's inside it, or too deep", () => {
    // The drawer holds a folder (2 levels), so only top places fit
    expect(insideOptions(places, "drawer").map((o) => o.value)).toEqual([
      "box",
      "cabinet",
    ]);
    expect(insideOptions(places, "cabinet")).toEqual([]);
  });

  it("shows a place whose parent is missing at the top", () => {
    expect(placeTree([place("a", "Lost", "gone")])[0].depth).toBe(0);
  });
});
