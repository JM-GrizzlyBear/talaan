import { PLACE_LIMITS, type PlaceFields } from "@talaan/shared";
import { ForbiddenError, NotFoundError } from "../../domain/errors.js";
import type { LabelRepository } from "../../domain/place/PlaceRepository.js";
import type { AuditTrail } from "../audit/AuditTrail.js";
import type { Clock } from "../ports/Clock.js";
import type { RecordAccess } from "../record/RecordAccess.js";
import type { MakeLabelCode } from "./labelCodes.js";
import type { Places } from "./Places.js";

export const LABEL_NOT_FOUND =
  "This label isn't one of yours, or it isn't shared with you.";

// QR labels: scanning one, printing blank ones ahead, and naming a blank one
export class Labels {
  constructor(
    private readonly labels: LabelRepository,
    private readonly places: Places,
    private readonly access: RecordAccess,
    private readonly audit: AuditTrail,
    private readonly clock: Clock,
    private readonly makeCode: MakeLabelCode,
  ) {}

  // What a scanned label leads to. Anyone without access gets "not found".
  async lookup(viewerId: string, code: string) {
    const label = await this.labels.findByCode(code);
    if (!label) throw new NotFoundError(LABEL_NOT_FOUND);
    let role;
    try {
      role = await this.access.roleFor(viewerId, label.ownerId);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw new NotFoundError(LABEL_NOT_FOUND);
      }
      throw error;
    }
    const household = await this.access.household(label.ownerId);
    return { label, role, ownerName: household.ownerName };
  }

  async listBlank(viewerId: string, ownerId: string) {
    await this.access.requireManage(viewerId, ownerId);
    return await this.labels.listBlank(ownerId);
  }

  // Blank labels to print now and name later, when each is first scanned
  async createBlank(actorId: string, ownerId: string, count: number) {
    await this.access.requireManage(actorId, ownerId);
    const unused = await this.labels.countBlank(ownerId);
    if (unused + count > PLACE_LIMITS.blankUnused) {
      throw new ForbiddenError(
        `You already have ${unused} blank labels not named yet. Name or print those first (up to ${PLACE_LIMITS.blankUnused}).`,
      );
    }
    let added = false;
    let codes: string[] = [];
    for (let tries = 0; tries < 5 && !added; tries++) {
      codes = Array.from({ length: count }, () => this.makeCode());
      added =
        new Set(codes).size === count &&
        (await this.labels.addBlank(ownerId, codes, actorId, this.clock.now()));
    }
    if (!added) throw new Error("Couldn't find free label codes");
    await this.audit.log({
      ownerId,
      action: "labels.created",
      actorId,
      subject: `${count} blank ${count === 1 ? "label" : "labels"}`,
    });
    return codes;
  }

  // The first scan of a blank label: what is it stuck on?
  async name(actorId: string, code: string, fields: PlaceFields) {
    const { label } = await this.lookup(actorId, code);
    if (label.placeId) {
      throw new ForbiddenError("This label already has a name.");
    }
    return await this.places.create(actorId, label.ownerId, fields, code);
  }
}
