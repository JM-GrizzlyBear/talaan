import {
  allergiesBySeverity,
  EMERGENCY_EXTRA_LABELS,
  EMPTY_MEDICAL_ID,
  type EmergencyInfo,
  type EmergencySettings,
  emergencyName,
  type MedicalIdFields,
} from "@talaan/shared";
import { NotFoundError } from "../../domain/errors.js";
import { diffMedicalId } from "../../domain/medical/diff.js";
import type { MedicalIdRepository } from "../../domain/medical/MedicalId.js";
import type { AuditTrail } from "../audit/AuditTrail.js";
import type { Clock } from "../ports/Clock.js";
import { personName, type RecordAccess } from "../record/RecordAccess.js";

const NOT_ON = "This emergency code isn't on anymore.";

// Medical IDs follow the account's sharing: owners and "Can manage" family
// fill them in and set the emergency QR; "Can view" family read them. The
// emergency page is the only part anyone can open, with its code.
export class MedicalIds {
  constructor(
    private readonly ids: MedicalIdRepository,
    private readonly access: RecordAccess,
    private readonly audit: AuditTrail,
    private readonly clock: Clock,
    // A long random code for the emergency page
    private readonly makeToken: () => string,
  ) {}

  private async person(
    viewerId: string,
    ownerId: string,
    profileId: string | null,
  ) {
    const role = await this.access.roleFor(viewerId, ownerId);
    const household = await this.access.household(ownerId);
    this.access.requireOwnProfile(household, profileId);
    return { role, name: personName(household, profileId) };
  }

  async get(viewerId: string, ownerId: string, profileId: string | null) {
    const { role, name } = await this.person(viewerId, ownerId, profileId);
    const saved = await this.ids.find(ownerId, profileId);
    const canChange = role === "owner" || role === "manage";
    return {
      ownerId,
      profileId,
      personName: name,
      role,
      fields: saved?.fields ?? EMPTY_MEDICAL_ID,
      updatedAt: saved?.updatedAt ?? null,
      updatedByName: saved?.updatedByName ?? null,
      checkedAt: saved?.checkedAt ?? null,
      emergency: {
        on: saved?.emergencyOn ?? false,
        extras: saved?.emergencyExtras ?? [],
        // The code only for those who can change it
        token: canChange && saved?.emergencyOn ? saved.emergencyToken : null,
      },
    };
  }

  async save(
    actorId: string,
    ownerId: string,
    profileId: string | null,
    fields: MedicalIdFields,
  ) {
    const { name } = await this.person(actorId, ownerId, profileId);
    await this.access.requireManage(actorId, ownerId);
    const before =
      (await this.ids.find(ownerId, profileId))?.fields ?? EMPTY_MEDICAL_ID;
    await this.ids.save(ownerId, profileId, fields, actorId, this.clock.now());
    const changes = diffMedicalId(before, fields);
    if (changes.length > 0) {
      await this.audit.log({
        ownerId,
        action: "medicalid.edited",
        actorId,
        subject: name,
        changes,
      });
    }
  }

  // "Still right": the reminder to check it starts over
  async markChecked(
    actorId: string,
    ownerId: string,
    profileId: string | null,
  ) {
    await this.person(actorId, ownerId, profileId);
    await this.access.requireManage(actorId, ownerId);
    await this.ids.markChecked(ownerId, profileId, this.clock.now());
  }

  // On or off, and what it shows. newCode: printed cards stop working.
  async setEmergency(
    actorId: string,
    ownerId: string,
    profileId: string | null,
    settings: EmergencySettings,
    newCode = false,
  ) {
    const { name } = await this.person(actorId, ownerId, profileId);
    await this.access.requireManage(actorId, ownerId);
    const saved = await this.ids.find(ownerId, profileId);
    const token =
      settings.on && (newCode || !saved?.emergencyToken)
        ? this.makeToken()
        : (saved?.emergencyToken ?? null);
    await this.ids.setEmergency(
      ownerId,
      profileId,
      { on: settings.on, token, extras: settings.extras },
      actorId,
      this.clock.now(),
    );
    const was = saved?.emergencyOn ?? false;
    const what = settings.on
      ? newCode
        ? "New code (old cards stop working)"
        : `On: ${["contacts", ...settings.extras.map((e) => EMERGENCY_EXTRA_LABELS[e].toLowerCase())].join(", ")}`
      : "Off";
    await this.audit.log({
      ownerId,
      action: "medicalid.emergency",
      actorId,
      subject: name,
      changes: [{ field: "Emergency QR", from: was ? "On" : "Off", to: what }],
    });
  }

  // Anyone with the code, without signing in: the contacts, and only the
  // extras chosen
  async emergency(token: string): Promise<EmergencyInfo> {
    const found = await this.ids.findByEmergencyToken(token);
    if (!found) throw new NotFoundError(NOT_ON);
    const { fields } = found.medicalId;
    const extras = new Set(found.medicalId.emergencyExtras);
    return {
      name: emergencyName(found.firstName, found.lastName),
      contacts: fields.contacts,
      ...(extras.has("bloodType") && { bloodType: fields.bloodType }),
      ...(extras.has("allergies") && {
        allergies: allergiesBySeverity(fields.allergies),
        noKnownAllergies: fields.noKnownAllergies,
      }),
      ...(extras.has("conditions") && { conditions: fields.conditions }),
      ...(extras.has("medicines") && { medicines: fields.medicines }),
    };
  }
}
