import type { FileFormat, PlaceFields } from "@talaan/shared";

// A photo of where a place is (only photos, not PDFs)
export interface PlacePhoto {
  key: string;
  format: Exclude<FileFormat, "pdf">;
  width: number | null;
  height: number | null;
}

// Where paper records are kept: a folder, a box, a drawer…
export type Place = PlaceFields & {
  id: string;
  // The account it belongs to
  ownerId: string;
  // Its QR label
  code: string;
  photo: PlacePhoto | null;
  recordCount: number;
  placeCount: number;
  createdByName: string | null;
  updatedByName: string | null;
  updatedAt: Date;
};

export interface Label {
  code: string;
  ownerId: string;
  // null: blank, not named yet
  placeId: string | null;
  createdAt: Date;
}
