// Where paper records are kept at home: a folder in a box in a drawer
export const PLACE_KINDS = [
  "folder",
  "envelope",
  "box",
  "drawer",
  "cabinet",
  "bag",
  "other",
] as const;
export type PlaceKind = (typeof PLACE_KINDS)[number];

export const PLACE_KIND_LABELS: Record<PlaceKind, string> = {
  folder: "Folder",
  envelope: "Envelope",
  box: "Box",
  drawer: "Drawer",
  cabinet: "Cabinet or shelf",
  bag: "Bag",
  other: "Other",
};

export const PLACE_LIMITS = {
  name: 80,
  note: 500,
  // A folder in a box in a drawer: 3 levels
  depth: 3,
  // Per account
  places: 500,
  // Blank labels made at once, and kept unused per account
  blankAtOnce: 120,
  blankUnused: 500,
};
