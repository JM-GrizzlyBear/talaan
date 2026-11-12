import type { AuditEntry } from "../../../domain/audit/AuditEntry.js";
import type { FamilyAccessWithPerson } from "../../../domain/family/FamilyAccess.js";
import type { RecordFile } from "../../../domain/file/RecordFile.js";
import type { MedicalId } from "../../../domain/medical/MedicalId.js";
import type { Place } from "../../../domain/place/Place.js";
import type { HealthRecord } from "../../../domain/record/HealthRecord.js";
import type { Reminder } from "../../../domain/reminder/Reminder.js";
import type { ShareLink } from "../../../domain/share/ShareLink.js";
import type { User } from "../../../domain/user/User.js";
import type { Household } from "../../record/RecordAccess.js";

// Everything in one account, gathered once for every part of the download
export interface ExportData {
  user: User;
  household: Household;
  madeAt: Date;
  records: {
    record: HealthRecord;
    person: string;
    // "Cabinet › Blue box", or "" when not kept anywhere
    place: string;
    files: RecordFile[];
    inTrash: boolean;
  }[];
  medicalIds: { medicalId: MedicalId; person: string }[];
  places: { place: Place; inside: string }[];
  reminders: { reminder: Reminder; person: string }[];
  shares: { link: ShareLink; person: string }[];
  // Who you share with, and who shares with you
  members: FamilyAccessWithPerson[];
  sharedWithYou: FamilyAccessWithPerson[];
  history: AuditEntry[];
}
