import { PLACE_LIMITS, type PlaceStep } from "@talaan/shared";

// Rules about places inside places, worked out from one account's places
interface Node {
  id: string;
  name: string;
  parentId: string | null;
}

// The places it's inside, outermost first (not including itself)
export function pathTo(places: Node[], id: string): PlaceStep[] {
  const byId = new Map(places.map((p) => [p.id, p]));
  const path: PlaceStep[] = [];
  const seen = new Set<string>();
  let parentId = byId.get(id)?.parentId ?? null;
  while (parentId && !seen.has(parentId)) {
    seen.add(parentId);
    const parent = byId.get(parentId);
    if (!parent) break;
    path.unshift({ id: parent.id, name: parent.name });
    parentId = parent.parentId;
  }
  return path;
}

// 1 for a place that's not inside another one
export function depthOf(places: Node[], id: string) {
  return pathTo(places, id).length + 1;
}

// Levels from this place down to the deepest place inside it (1: nothing inside)
export function levelsInside(places: Node[], id: string): number {
  const children = places.filter((p) => p.parentId === id);
  return 1 + Math.max(0, ...children.map((c) => levelsInside(places, c.id)));
}

// Whether `id` is `ancestorId` or somewhere inside it
export function isWithin(places: Node[], id: string, ancestorId: string) {
  return (
    id === ancestorId || pathTo(places, id).some((p) => p.id === ancestorId)
  );
}

// Why `id` can't go inside `parentId`, or null when it can.
// id is null for a new place.
export function cantMoveInto(
  places: Node[],
  id: string | null,
  parentId: string,
): string | null {
  if (id && isWithin(places, parentId, id)) {
    return "A place can't go inside itself or a place inside it.";
  }
  const levels = id ? levelsInside(places, id) : 1;
  if (depthOf(places, parentId) + levels > PLACE_LIMITS.depth) {
    return `Places go at most ${PLACE_LIMITS.depth} levels deep, like a folder in a box in a drawer.`;
  }
  return null;
}

// "Drawer › Blue box › Lola's folder"
export const pathText = (steps: PlaceStep[]) =>
  steps.map((s) => s.name).join(" › ");
