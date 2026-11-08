import type { RecordRole } from "../records/index.js";
import type { PlaceKind } from "./constants.js";

export interface PlaceSummary {
  id: string;
  ownerId: string;
  kind: PlaceKind;
  name: string;
  note: string;
  parentId: string | null;
  // Its QR label
  code: string;
  // A photo of where it is (shown through /api/places/:id/photo)
  hasPhoto: boolean;
  // Directly inside it (not counting what's inside the places inside it)
  recordCount: number;
  placeCount: number;
  // Also tells the browser when the photo changed
  updatedAt: string;
}

// The places it's inside, outermost first: Drawer › Blue box
export interface PlaceStep {
  id: string;
  name: string;
}

export interface PlaceInfo extends PlaceSummary {
  path: PlaceStep[];
  children: PlaceSummary[];
  role: RecordRole;
  ownerName: string;
  createdByName: string | null;
  updatedByName: string | null;
}

export interface PlaceListInfo {
  role: RecordRole;
  places: PlaceSummary[];
}

// What a scanned label leads to
export interface LabelInfo {
  code: string;
  ownerId: string;
  ownerName: string;
  role: RecordRole;
  // null: a blank label, not named yet
  placeId: string | null;
}

export interface BlankLabelInfo {
  code: string;
  createdAt: string;
}

// Where a record is kept, for showing on the record
export interface RecordPlaceInfo {
  id: string;
  // Outermost first, ending with the place itself
  path: PlaceStep[];
}
