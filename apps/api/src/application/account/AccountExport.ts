import type { Readable } from "node:stream";
import type { AuditRepository } from "../../domain/audit/AuditRepository.js";
import type { FamilyAccessRepository } from "../../domain/family/FamilyAccessRepository.js";
import type { RecordFileRepository } from "../../domain/file/RecordFileRepository.js";
import type { MedicalIdRepository } from "../../domain/medical/MedicalId.js";
import type { PlaceRepository } from "../../domain/place/PlaceRepository.js";
import { pathText, pathTo } from "../../domain/place/rules.js";
import type { RecordRepository } from "../../domain/record/RecordRepository.js";
import type { ReminderRepository } from "../../domain/reminder/ReminderRepository.js";
import type { ShareLinkRepository } from "../../domain/share/ShareLink.js";
import { NotLoggedInError } from "../../domain/user/errors.js";
import type { UserRepository } from "../../domain/user/UserRepository.js";
import type { AuditTrail } from "../audit/AuditTrail.js";
import type { AccountEmails } from "../ports/AccountEmails.js";
import type { Clock } from "../ports/Clock.js";
import type { FileStorage } from "../ports/FileStorage.js";
import { personName, type RecordAccess } from "../record/RecordAccess.js";
import { labResultsCsv, recordsCsv, remindersCsv } from "./export/csv.js";
import type { ExportData } from "./export/ExportData.js";
import { exportHtml } from "./export/html.js";
import { exportJson } from "./export/json.js";
import { ExportPaths, safeName } from "./export/paths.js";

// One file in the download: text made here, or a photo or PDF from storage
export interface ExportEntry {
  path: string;
  text?: string;
  open?: () => Promise<Readable>;
}

const README = `Your Talaan records
===================

Open "Open me.html" in any browser to read everything, with links to the
photos and PDFs.

  Open me.html        Everything, easy to read and print
  records.csv         Every record (Excel or Google Sheets)
  lab-results.csv     Every lab result, one row each
  reminders.csv       Reminders
  talaan-data.json    Everything as data, for moving to another app
  Photos and PDFs/    Each person's files, by date and record

This has private health information. Keep it somewhere safe.
`;

// A copy of everything in your own account (not accounts shared with you)
export class AccountExport {
  constructor(
    private readonly users: UserRepository,
    private readonly access: RecordAccess,
    private readonly records: RecordRepository,
    private readonly files: RecordFileRepository,
    private readonly medicalIds: MedicalIdRepository,
    private readonly places: PlaceRepository,
    private readonly reminders: ReminderRepository,
    private readonly shares: ShareLinkRepository,
    private readonly family: FamilyAccessRepository,
    private readonly history: AuditRepository,
    private readonly storage: FileStorage | null,
    private readonly emails: AccountEmails | null,
    private readonly audit: AuditTrail,
    private readonly clock: Clock,
  ) {}

  private async gather(userId: string): Promise<ExportData> {
    const user = await this.users.findById(userId);
    if (!user) throw new NotLoggedInError();
    const household = await this.access.household(userId);
    const [
      active,
      trash,
      medicalIds,
      places,
      reminders,
      shares,
      members,
      owners,
      history,
    ] = await Promise.all([
      this.records.listForOwner(userId, {}),
      this.records.listTrash(userId),
      this.medicalIds.listForOwner(userId),
      this.places.listForOwner(userId),
      this.reminders.listForOwner(userId),
      this.shares.listForOwner(userId),
      this.family.listMembers(userId),
      this.family.listOwners(userId),
      this.history.listForOwner(userId, { limit: 100_000 }),
    ]);
    const placeText = (id: string | null) => {
      if (!id) return "";
      const place = places.find((p) => p.id === id);
      return place
        ? pathText([...pathTo(places, id), { id, name: place.name }])
        : "";
    };
    const name = (profileId: string | null) => personName(household, profileId);
    const records = [];
    for (const [list, inTrash] of [
      [active, false],
      [trash, true],
    ] as const) {
      for (const record of list) {
        records.push({
          record,
          person: name(record.profileId),
          place: placeText(record.placeId),
          files: await this.files.listForRecord(record.id),
          inTrash,
        });
      }
    }
    return {
      user,
      household,
      madeAt: this.clock.now(),
      records,
      medicalIds: medicalIds.map((m) => ({
        medicalId: m,
        person: name(m.profileId),
      })),
      places: places.map((p) => ({
        place: p,
        inside: pathText(pathTo(places, p.id)),
      })),
      reminders: reminders.map((r) => ({
        reminder: r,
        person: name(r.profileId),
      })),
      shares: shares.map((s) => ({ link: s, person: name(s.profileId) })),
      members,
      sharedWithYou: owners,
      history,
    };
  }

  async build(userId: string, device: string) {
    const data = await this.gather(userId);
    const paths = new ExportPaths();
    for (const r of data.records) {
      paths.addRecordFiles(r.record, r.person, r.files, r.inTrash);
    }
    for (const { place } of data.places) paths.addPlacePhoto(place);

    const day = data.madeAt.toISOString().slice(0, 10);
    const root = safeName(`Talaan ${data.household.ownerName} ${day}`);
    const entries: ExportEntry[] = [
      { path: "Read me.txt", text: README },
      { path: "Open me.html", text: exportHtml(data, paths) },
      { path: "records.csv", text: recordsCsv(data) },
      { path: "lab-results.csv", text: labResultsCsv(data) },
      { path: "reminders.csv", text: remindersCsv(data) },
      { path: "talaan-data.json", text: exportJson(data, paths) },
    ];
    const storage = this.storage;
    if (storage) {
      for (const r of data.records) {
        for (const file of r.files) {
          entries.push({
            path: paths.forFile.get(file.id)!,
            open: async () =>
              (
                await storage.open(
                  { key: file.storageKey, format: file.format },
                  "original",
                )
              ).body,
          });
        }
      }
      for (const { place } of data.places) {
        const path = paths.forPlace.get(place.id);
        if (!path || !place.photo) continue;
        const photo = place.photo;
        entries.push({
          path,
          open: async () =>
            (
              await storage.open(
                { key: photo.key, format: photo.format },
                "original",
              )
            ).body,
        });
      }
    }

    const at = this.clock.now();
    await this.audit.log({
      ownerId: userId,
      action: "account.exported",
      actorId: userId,
      subject: "Your account",
      changes: [{ field: "On", from: null, to: device }],
    });
    if (this.emails) {
      try {
        await this.emails.sendAccountNotice(data.user, {
          kind: "exported",
          at,
          device,
        });
      } catch (error) {
        console.error('Couldn\'t send the "exported" email:', error);
      }
    }
    return {
      fileName: `${root}.zip`,
      entries: entries.map((e) => ({ ...e, path: `${root}/${e.path}` })),
    };
  }
}
