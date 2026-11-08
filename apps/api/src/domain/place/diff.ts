import {
  PLACE_KIND_LABELS,
  type AuditChange,
  type PlaceFields,
} from "@talaan/shared";

// What an edit to a place changed, for the history
export function diffPlaces(
  before: PlaceFields,
  after: PlaceFields,
  placeName: (id: string | null) => string | null,
): AuditChange[] {
  const changes: AuditChange[] = [];
  const compare = (field: string, from: string | null, to: string | null) => {
    if ((from || null) !== (to || null)) {
      changes.push({ field, from: from || null, to: to || null });
    }
  };
  compare(
    "Kind",
    PLACE_KIND_LABELS[before.kind],
    PLACE_KIND_LABELS[after.kind],
  );
  compare("Name", before.name, after.name);
  compare("Note", before.note, after.note);
  compare("Inside", placeName(before.parentId), placeName(after.parentId));
  return changes;
}
