import type {
  BlankLabelInfo,
  LabelInfo,
  PlaceInfo,
  PlaceListInfo,
  PlaceStep,
  PlaceSummary,
  RecordRole,
} from "@talaan/shared";
import type { Label, Place } from "../../../domain/place/Place.js";

// Domain objects → what the browser receives (no storage keys)

export function placeSummaryJson(place: Place): PlaceSummary {
  return {
    id: place.id,
    ownerId: place.ownerId,
    kind: place.kind,
    name: place.name,
    note: place.note,
    parentId: place.parentId,
    code: place.code,
    hasPhoto: place.photo !== null,
    recordCount: place.recordCount,
    placeCount: place.placeCount,
    updatedAt: place.updatedAt.toISOString(),
  };
}

export function placeListJson(
  role: RecordRole,
  places: Place[],
): PlaceListInfo {
  return { role, places: places.map(placeSummaryJson) };
}

export function placeJson(shown: {
  place: Place;
  role: RecordRole;
  ownerName: string;
  path: PlaceStep[];
  children: Place[];
}): PlaceInfo {
  return {
    ...placeSummaryJson(shown.place),
    path: shown.path,
    children: shown.children.map(placeSummaryJson),
    role: shown.role,
    ownerName: shown.ownerName,
    createdByName: shown.place.createdByName,
    updatedByName: shown.place.updatedByName,
  };
}

export function labelJson(found: {
  label: Label;
  role: RecordRole;
  ownerName: string;
}): LabelInfo {
  return {
    code: found.label.code,
    ownerId: found.label.ownerId,
    ownerName: found.ownerName,
    role: found.role,
    placeId: found.label.placeId,
  };
}

export const blankLabelJson = (label: Label): BlankLabelInfo => ({
  code: label.code,
  createdAt: label.createdAt.toISOString(),
});
