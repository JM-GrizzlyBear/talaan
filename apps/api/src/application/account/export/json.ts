import { fullName } from "@talaan/shared";
import type { ExportData } from "./ExportData.js";
import type { ExportPaths } from "./paths.js";

const iso = (d: Date | null) => (d ? d.toISOString() : null);

// The whole account as data, for moving to another app. No passwords, PIN
// hashes or link codes.
export function exportJson(data: ExportData, paths: ExportPaths) {
  const { user, household } = data;
  const json = {
    format: "talaan-export",
    version: 1,
    madeAt: iso(data.madeAt),
    account: {
      firstName: user.firstName,
      middleName: user.middleName,
      lastName: user.lastName,
      email: user.email,
      createdAt: iso(user.createdAt),
      privacyConsentAt: iso(user.privacyConsentAt),
    },
    familyProfiles: household.profiles.map((p) => ({
      id: p.id,
      name: fullName(p),
      firstName: p.firstName,
      middleName: p.middleName,
      lastName: p.lastName,
      relationship: p.relationship,
      birthDate: p.birthDate,
    })),
    records: data.records.map(
      ({ record: r, person, place, files, inTrash }) => ({
        id: r.id,
        person,
        profileId: r.profileId,
        type: r.type,
        title: r.title,
        recordDate: r.recordDate,
        doctor: r.doctor,
        facility: r.facility,
        notes: r.notes,
        details: r.details,
        keptIn: place || null,
        inTrash,
        createdAt: iso(r.createdAt),
        createdBy: r.createdByName,
        updatedAt: iso(r.updatedAt),
        updatedBy: r.updatedByName,
        files: files.map((f) => ({
          name: f.originalName,
          format: f.format,
          bytes: f.bytes,
          pages: f.pages,
          addedAt: iso(f.createdAt),
          addedBy: f.uploadedByName,
          pathInThisZip: paths.forFile.get(f.id) ?? null,
        })),
      }),
    ),
    medicalIds: data.medicalIds.map(({ medicalId: m, person }) => ({
      person,
      profileId: m.profileId,
      fields: m.fields,
      checkedAt: iso(m.checkedAt),
      emergencyQrOn: m.emergencyOn,
      emergencyQrShows: m.emergencyExtras,
    })),
    places: data.places.map(({ place: p, inside }) => ({
      id: p.id,
      name: p.name,
      kind: p.kind,
      note: p.note,
      inside: inside || null,
      parentId: p.parentId,
      qrCode: p.code,
      photo: paths.forPlace.get(p.id) ?? null,
    })),
    reminders: data.reminders.map(({ reminder: r, person }) => ({
      person,
      kind: r.kind,
      title: r.title,
      dose: r.dose,
      note: r.note,
      schedule: r.schedule,
      alertsMinutesBefore: r.alerts,
      paused: r.paused,
      recordId: r.recordId,
    })),
    doctorLinks: data.shares.map(({ link: s, person }) => ({
      person,
      for: s.recipient,
      note: s.note,
      medicalId: s.medicalId,
      labResults: s.labs,
      recordIds: s.recordIds,
      expiresAt: iso(s.expiresAt),
      stoppedAt: iso(s.stoppedAt),
      hadPin: s.pinHash !== null,
      openedOn: s.views.map((v) => ({ at: iso(v.openedAt), device: v.device })),
    })),
    familySharing: {
      youShareWith: data.members.map((m) => ({
        name: fullName(m.person),
        email: m.person.email,
        relationship: m.relationship,
        access: m.access,
        since: iso(m.createdAt),
      })),
      sharedWithYou: data.sharedWithYou.map((m) => ({
        name: fullName(m.person),
        relationship: m.relationship,
        access: m.access,
        since: iso(m.createdAt),
      })),
    },
    history: data.history.map((e) => ({
      at: iso(e.createdAt),
      action: e.action,
      by: e.actorName,
      subject: e.subject,
      changes: e.changes,
    })),
  };
  return JSON.stringify(json, null, 2);
}
