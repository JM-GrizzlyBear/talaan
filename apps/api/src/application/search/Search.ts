import {
  excerpt,
  normalizeLabelCode,
  parseSearch,
  scoreSearch,
  SEARCH_LIMITS,
  type SearchResult,
} from "@talaan/shared";
import type { FamilyAccessRepository } from "../../domain/family/FamilyAccessRepository.js";
import type { MedicalIdRepository } from "../../domain/medical/MedicalId.js";
import type { PlaceRepository } from "../../domain/place/PlaceRepository.js";
import type { RecordRepository } from "../../domain/record/RecordRepository.js";
import type { ReminderRepository } from "../../domain/reminder/ReminderRepository.js";
import type { RecordAccess } from "../record/RecordAccess.js";
import {
  medicalDocuments,
  personDocuments,
  placeDocuments,
  recordDocuments,
  reminderDocuments,
  type SearchDocument,
  testDocuments,
} from "./documents.js";

// One search across everything someone can see: their own account and every
// account shared with them. Records in the Trash aren't searched.
export class Search {
  constructor(
    private readonly access: RecordAccess,
    private readonly sharing: FamilyAccessRepository,
    private readonly records: RecordRepository,
    private readonly places: PlaceRepository,
    private readonly reminders: ReminderRepository,
    private readonly medicalIds: MedicalIdRepository,
  ) {}

  private async documents(ownerId: string): Promise<SearchDocument[]> {
    const [household, records, places, reminders, medicalIds] =
      await Promise.all([
        this.access.household(ownerId),
        this.records.listForOwner(ownerId, {}),
        this.places.listForOwner(ownerId),
        this.reminders.listForOwner(ownerId),
        this.medicalIds.listForOwner(ownerId),
      ]);
    return [
      ...personDocuments(household),
      ...recordDocuments(household, records, places),
      ...testDocuments(household, records),
      ...medicalDocuments(household, medicalIds),
      ...placeDocuments(household, places),
      ...reminderDocuments(household, reminders),
    ];
  }

  async find(viewerId: string, text: string) {
    const query = parseSearch(text);
    const code = normalizeLabelCode(text);
    if (query.length === 0) return { results: [], total: 0 };

    const owners = [
      viewerId,
      ...(await this.sharing.listOwners(viewerId)).map((o) => o.ownerId),
    ];
    const documents = (
      await Promise.all(owners.map((id) => this.documents(id)))
    ).flat();

    const found: SearchResult[] = [];
    for (const doc of documents) {
      const { score, field } = scoreSearch(query, doc.fields);
      // A QR code typed or scanned finds its place first
      const exactCode =
        code !== null &&
        doc.kind === "place" &&
        doc.fields[2]?.text.endsWith(code);
      if (score === 0 && !exactCode) continue;
      const matched = doc.fields[field];
      found.push({
        kind: doc.kind,
        id: doc.id,
        title: doc.title,
        subtitle: doc.subtitle,
        match:
          field > 0 && matched?.label
            ? { label: matched.label, text: excerpt(matched.text, query) }
            : null,
        path: doc.path,
        ownerId: doc.ownerId,
        profileId: doc.profileId,
        personName: doc.personName,
        date: doc.date,
        score: exactCode ? 1000 : Math.round(score * 100) / 100,
      });
    }
    found.sort(
      (a, b) =>
        b.score - a.score ||
        (b.date ?? "").localeCompare(a.date ?? "") ||
        a.title.localeCompare(b.title),
    );
    return {
      results: found.slice(0, SEARCH_LIMITS.results),
      total: found.length,
    };
  }
}
