import type { PlaceFields } from "@talaan/shared";
import type { Label, Place, PlacePhoto } from "./Place.js";

export interface PlaceRepository {
  listForOwner(ownerId: string): Promise<Place[]>;
  findById(id: string): Promise<Place | null>;
  countForOwner(ownerId: string): Promise<number>;
  // With its label: a new code, or a blank label being named
  create(
    ownerId: string,
    fields: PlaceFields,
    code: string,
    actorId: string,
    at: Date,
  ): Promise<Place>;
  update(
    id: string,
    fields: PlaceFields,
    actorId: string,
    at: Date,
  ): Promise<Place>;
  // null: no photo
  setPhoto(
    id: string,
    photo: PlacePhoto | null,
    actorId: string,
    at: Date,
  ): Promise<void>;
  // What was inside moves up to its parent; its label becomes blank
  remove(id: string): Promise<void>;
}

export interface LabelRepository {
  findByCode(code: string): Promise<Label | null>;
  // Adds these blank labels; false when a code was already taken
  addBlank(
    ownerId: string,
    codes: string[],
    actorId: string,
    at: Date,
  ): Promise<boolean>;
  listBlank(ownerId: string): Promise<Label[]>;
  countBlank(ownerId: string): Promise<number>;
  // A code no label has yet (for a new place)
  isFree(code: string): Promise<boolean>;
}
