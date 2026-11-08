import { PLACE_LIMITS, type PlaceFields } from "@talaan/shared";
import { ForbiddenError, NotFoundError } from "../../domain/errors.js";
import type { Place } from "../../domain/place/Place.js";
import type {
  LabelRepository,
  PlaceRepository,
} from "../../domain/place/PlaceRepository.js";
import { diffPlaces } from "../../domain/place/diff.js";
import { cantMoveInto, pathTo, pathText } from "../../domain/place/rules.js";
import type { AuditTrail } from "../audit/AuditTrail.js";
import type { Clock } from "../ports/Clock.js";
import type { FileStorage } from "../ports/FileStorage.js";
import type { RecordAccess } from "../record/RecordAccess.js";
import type { MakeLabelCode } from "./labelCodes.js";

export const PLACE_NOT_FOUND =
  "That place isn't there anymore, or it isn't shared with you.";

// Places where paper records are kept, each with a QR label. Who may do what
// is the same as for the account's records: owners and "Can manage" family
// add and change places; only the owner removes one; "Can view" family look.
export class Places {
  constructor(
    private readonly places: PlaceRepository,
    private readonly labels: LabelRepository,
    private readonly access: RecordAccess,
    private readonly audit: AuditTrail,
    private readonly clock: Clock,
    private readonly makeCode: MakeLabelCode,
    private readonly storage: FileStorage | null,
  ) {}

  async list(viewerId: string, ownerId: string) {
    const role = await this.access.roleFor(viewerId, ownerId);
    return { role, places: await this.places.listForOwner(ownerId) };
  }

  // A place the viewer can see, or "not found" (so they don't learn it exists)
  private async visible(viewerId: string, id: string) {
    const place = await this.places.findById(id);
    if (!place) throw new NotFoundError(PLACE_NOT_FOUND);
    try {
      const role = await this.access.roleFor(viewerId, place.ownerId);
      return { place, role };
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw new NotFoundError(PLACE_NOT_FOUND);
      }
      throw error;
    }
  }

  async get(viewerId: string, id: string) {
    const { place, role } = await this.visible(viewerId, id);
    const all = await this.places.listForOwner(place.ownerId);
    const household = await this.access.household(place.ownerId);
    return {
      place,
      role,
      ownerName: household.ownerName,
      path: pathTo(all, id),
      children: all.filter((p) => p.parentId === id),
    };
  }

  // The parent must be in the same account, and the levels must fit
  private checkParent(
    id: string | null,
    parentId: string | null,
    all: Place[],
  ) {
    if (parentId === null) return;
    if (!all.some((p) => p.id === parentId)) {
      throw new NotFoundError("The place it goes inside isn't there anymore.");
    }
    const problem = cantMoveInto(all, id, parentId);
    if (problem) throw new ForbiddenError(problem);
  }

  private async newCode() {
    for (let tries = 0; tries < 10; tries++) {
      const code = this.makeCode();
      if (await this.labels.isFree(code)) return code;
    }
    throw new Error("Couldn't find a free label code");
  }

  // `code`: a blank label being named; otherwise a new label
  async create(
    actorId: string,
    ownerId: string,
    fields: PlaceFields,
    code?: string,
  ) {
    await this.access.requireManage(actorId, ownerId);
    if ((await this.places.countForOwner(ownerId)) >= PLACE_LIMITS.places) {
      throw new ForbiddenError(
        `An account can have up to ${PLACE_LIMITS.places} places.`,
      );
    }
    const all = await this.places.listForOwner(ownerId);
    this.checkParent(null, fields.parentId, all);
    const place = await this.places.create(
      ownerId,
      fields,
      code ?? (await this.newCode()),
      actorId,
      this.clock.now(),
    );
    await this.audit.log({
      ownerId,
      action: "place.created",
      actorId,
      subject: place.name,
    });
    return place;
  }

  async update(actorId: string, id: string, fields: PlaceFields) {
    const { place } = await this.visible(actorId, id);
    await this.access.requireManage(actorId, place.ownerId);
    const all = await this.places.listForOwner(place.ownerId);
    this.checkParent(id, fields.parentId, all);

    const nameOf = (placeId: string | null) => {
      if (!placeId) return null;
      const target = all.find((p) => p.id === placeId);
      return target
        ? pathText([...pathTo(all, placeId), target])
        : "A removed place";
    };
    const changes = diffPlaces(place, fields, nameOf);
    if (changes.length === 0) return place;
    const updated = await this.places.update(
      id,
      fields,
      actorId,
      this.clock.now(),
    );
    await this.audit.log({
      ownerId: place.ownerId,
      action: "place.edited",
      actorId,
      subject: updated.name,
      changes,
    });
    return updated;
  }

  // Only the owner. Nothing inside is lost: it moves up to the place this one
  // was in, and the label becomes blank, ready to be named again.
  async remove(actorId: string, id: string) {
    const { place } = await this.visible(actorId, id);
    await this.access.requireOwner(actorId, place.ownerId);
    await this.places.remove(id);
    if (place.photo) await this.storage?.remove(place.photo.key);
    await this.audit.log({
      ownerId: place.ownerId,
      action: "place.removed",
      actorId,
      subject: place.name,
    });
  }
}
