import type { AuditChange, MedicalIdFields } from "@talaan/shared";

const MAX = 200;
const short = (text: string) =>
  text.length > MAX ? `${text.slice(0, MAX - 1)}…` : text;
const shown = (text: string) => (text ? short(text) : null);
const names = (items: { name: string }[]) =>
  shown(items.map((i) => i.name).join(", "));

// What changed on a Medical ID, for the audit trail ("Allergies: Penicillin →
// Penicillin, Shrimp"). Lists show their names; contacts, the doctor and the
// PhilHealth ID only say they changed (not the numbers).
export function diffMedicalId(
  before: MedicalIdFields,
  after: MedicalIdFields,
): AuditChange[] {
  const changes: AuditChange[] = [];
  const compare = (field: string, a: string | null, b: string | null) => {
    if (a !== b) changes.push({ field, from: a, to: b });
  };
  const same = (a: unknown, b: unknown) =>
    JSON.stringify(a) === JSON.stringify(b);

  compare("Birth date", shown(before.birthDate), shown(after.birthDate));
  compare("Sex", shown(before.sex), shown(after.sex));
  compare("Blood type", shown(before.bloodType), shown(after.bloodType));
  compare(
    "Height",
    before.heightCm === null ? null : `${before.heightCm} cm`,
    after.heightCm === null ? null : `${after.heightCm} cm`,
  );
  compare(
    "Weight",
    before.weightKg === null ? null : `${before.weightKg} kg`,
    after.weightKg === null ? null : `${after.weightKg} kg`,
  );
  if (before.noKnownAllergies !== after.noKnownAllergies) {
    compare(
      "No known allergies",
      before.noKnownAllergies ? "Yes" : null,
      after.noKnownAllergies ? "Yes" : null,
    );
  }
  for (const [field, key] of [
    ["Allergies", "allergies"],
    ["Conditions", "conditions"],
    ["Medicines", "medicines"],
    ["Implants and devices", "devices"],
  ] as const) {
    if (!same(before[key], after[key])) {
      const a = names(before[key]);
      const b = names(after[key]);
      // The same names, other details (a dose, a reaction)
      changes.push({
        field,
        from: a,
        to: a === b ? `${b ?? ""} (details)` : b,
      });
    }
  }
  if (!same(before.contacts, after.contacts)) {
    changes.push({
      field: "Emergency contacts",
      from: names(before.contacts),
      to: names(after.contacts),
    });
  }
  if (!same(before.doctor, after.doctor)) {
    changes.push({
      field: "Doctor",
      from: shown(before.doctor.name),
      to: shown(after.doctor.name) || "Changed",
    });
  }
  if (before.philhealth !== after.philhealth) {
    changes.push({
      field: "PhilHealth ID",
      from: before.philhealth ? "Set" : null,
      to: after.philhealth ? (before.philhealth ? "Changed" : "Set") : null,
    });
  }
  compare("Address", shown(before.address), shown(after.address));
  compare("Organ donor", shown(before.organDonor), shown(after.organDonor));
  compare("Notes", shown(before.notes), shown(after.notes));
  return changes;
}
