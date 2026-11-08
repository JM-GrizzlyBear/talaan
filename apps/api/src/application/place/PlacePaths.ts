import { NotFoundError } from "../../domain/errors.js";
import type { PlaceRepository } from "../../domain/place/PlaceRepository.js";
import { pathText, pathTo } from "../../domain/place/rules.js";

// Where a record is kept: checking the place, and naming it for the record
export class PlacePaths {
  constructor(private readonly places: PlaceRepository) {}

  // A record can only be kept in a place of its own account
  async requireInAccount(ownerId: string, placeId: string | null) {
    if (placeId === null) return;
    const place = await this.places.findById(placeId);
    if (!place || place.ownerId !== ownerId) {
      throw new NotFoundError(
        "That place isn't there anymore. Choose another one.",
      );
    }
  }

  // The place and the places it's inside, outermost first, ending with it
  async pathFor(ownerId: string, placeId: string | null) {
    if (!placeId) return null;
    const all = await this.places.listForOwner(ownerId);
    const place = all.find((p) => p.id === placeId);
    if (!place) return null;
    return {
      id: place.id,
      path: [...pathTo(all, placeId), { id: place.id, name: place.name }],
    };
  }

  // "Drawer › Blue box" for the history; null: not in a place
  async nameFor(ownerId: string, placeId: string | null) {
    const found = await this.pathFor(ownerId, placeId);
    if (!found) return placeId ? "A removed place" : null;
    return pathText(found.path);
  }
}
