import { PLACE_LIMITS, type PlaceSummary } from "@talaan/shared";

export interface TreeRow {
  place: PlaceSummary;
  // 0: not inside another place
  depth: number;
}

// Places in reading order: each place, then what's inside it (by name)
export function placeTree(places: PlaceSummary[]): TreeRow[] {
  const byParent = new Map<string | null, PlaceSummary[]>();
  const ids = new Set(places.map((p) => p.id));
  for (const place of places) {
    // A parent that isn't in the list: shown at the top instead of lost
    const parent =
      place.parentId && ids.has(place.parentId) ? place.parentId : null;
    byParent.set(parent, [...(byParent.get(parent) ?? []), place]);
  }
  const rows: TreeRow[] = [];
  const seen = new Set<string>();
  const walk = (parentId: string | null, depth: number) => {
    const children = [...(byParent.get(parentId) ?? [])].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    for (const place of children) {
      if (seen.has(place.id)) continue;
      seen.add(place.id);
      rows.push({ place, depth });
      walk(place.id, depth + 1);
    }
  };
  walk(null, 0);
  return rows;
}

// How many levels a place and everything inside it take (1: nothing inside)
function levels(places: PlaceSummary[], id: string): number {
  const children = places.filter((p) => p.parentId === id);
  return 1 + Math.max(0, ...children.map((c) => levels(places, c.id)));
}

// Where a place can go: not inside itself or what's in it, and at most
// 3 levels deep with everything it holds. movingId null: a new place.
export function insideOptions(places: PlaceSummary[], movingId: string | null) {
  const tree = placeTree(places);
  const height = movingId ? levels(places, movingId) : 1;
  const blocked = new Set<string>();
  if (movingId) {
    blocked.add(movingId);
    let grew = true;
    while (grew) {
      grew = false;
      for (const p of places) {
        if (p.parentId && blocked.has(p.parentId) && !blocked.has(p.id)) {
          blocked.add(p.id);
          grew = true;
        }
      }
    }
  }
  return tree
    .filter(
      (row) =>
        !blocked.has(row.place.id) &&
        row.depth + 1 + height <= PLACE_LIMITS.depth,
    )
    .map((row) => ({
      value: row.place.id,
      label: `${"— ".repeat(row.depth)}${row.place.name}`,
    }));
}

// Every place as a choice for a record, indented to show what's inside what
export function placeOptions(places: PlaceSummary[]) {
  return placeTree(places).map((row) => ({
    value: row.place.id,
    label: `${"— ".repeat(row.depth)}${row.place.name}`,
  }));
}
