import type { FileVariant } from "@talaan/shared";
import { NotFoundError } from "../../domain/errors.js";
import { FileError, FilesNotSetUpError } from "../../domain/file/errors.js";
import type { PlaceRepository } from "../../domain/place/PlaceRepository.js";
import type { AuditTrail } from "../audit/AuditTrail.js";
import type { Clock } from "../ports/Clock.js";
import type { FileStorage } from "../ports/FileStorage.js";
import type { RecordAccess } from "../record/RecordAccess.js";
import type { Places } from "./Places.js";

const NO_PHOTO = "This place has no photo.";

// A photo of where a place is, so it's easy to find: one per place. Uploaded
// like record files (straight to storage, then checked), and only ever shown
// through the API to people the account is shared with.
export class PlacePhotos {
  constructor(
    private readonly places: Places,
    private readonly placeRepo: PlaceRepository,
    private readonly access: RecordAccess,
    private readonly storage: FileStorage | null,
    private readonly audit: AuditTrail,
    private readonly clock: Clock,
  ) {}

  private requireStorage() {
    if (!this.storage) throw new FilesNotSetUpError();
    return this.storage;
  }

  // Kept apart from record files: account/places/place
  private prefix(place: { ownerId: string; id: string }) {
    return `${place.ownerId}/places/${place.id}`;
  }

  private async forChange(actorId: string, placeId: string) {
    const { place } = await this.places.get(actorId, placeId);
    await this.access.requireManage(actorId, place.ownerId);
    return place;
  }

  // Step 1: where the browser sends the photo
  async uploadTarget(actorId: string, placeId: string) {
    const storage = this.requireStorage();
    const place = await this.forChange(actorId, placeId);
    return await storage.uploadTarget(this.prefix(place));
  }

  // Step 2: the upload is checked, then it replaces the old photo
  async attach(actorId: string, placeId: string, upload: unknown) {
    const storage = this.requireStorage();
    const place = await this.forChange(actorId, placeId);
    const stored = await storage.confirmUpload(upload, this.prefix(place));
    if (stored.format === "pdf") {
      await storage.remove(stored.key);
      throw new FileError(
        "A place's picture has to be a photo (JPG, PNG, WEBP or HEIC), not a PDF.",
      );
    }
    await this.placeRepo.setPhoto(
      placeId,
      {
        key: stored.key,
        format: stored.format,
        width: stored.width,
        height: stored.height,
      },
      actorId,
      this.clock.now(),
    );
    if (place.photo) await storage.remove(place.photo.key);
    await this.audit.log({
      ownerId: place.ownerId,
      action: "place.edited",
      actorId,
      subject: place.name,
      changes: [
        {
          field: "Photo",
          from: place.photo ? "A photo" : null,
          to: place.photo ? "A new photo" : "A photo",
        },
      ],
    });
  }

  async open(viewerId: string, placeId: string, variant: FileVariant) {
    const storage = this.requireStorage();
    const { place } = await this.places.get(viewerId, placeId);
    if (!place.photo) throw new NotFoundError(NO_PHOTO);
    return await storage.open(
      { key: place.photo.key, format: place.photo.format },
      variant,
    );
  }

  async remove(actorId: string, placeId: string) {
    const storage = this.requireStorage();
    const place = await this.forChange(actorId, placeId);
    if (!place.photo) throw new NotFoundError(NO_PHOTO);
    await this.placeRepo.setPhoto(placeId, null, actorId, this.clock.now());
    await storage.remove(place.photo.key);
    await this.audit.log({
      ownerId: place.ownerId,
      action: "place.edited",
      actorId,
      subject: place.name,
      changes: [{ field: "Photo", from: "A photo", to: null }],
    });
  }
}
