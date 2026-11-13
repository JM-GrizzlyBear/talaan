import type { MedicalIdFields, MedicalIdInput } from "@talaan/shared";

// The form keeps height and weight as typed text
export type MedicalForm = Omit<MedicalIdFields, "heightCm" | "weightKg"> & {
  heightCm: string;
  weightKg: string;
};

export function formFromFields(fields: MedicalIdFields): MedicalForm {
  return {
    ...fields,
    heightCm: fields.heightCm === null ? "" : String(fields.heightCm),
    weightKg: fields.weightKg === null ? "" : String(fields.weightKg),
  };
}

const number = (text: string) => {
  const trimmed = text.trim().replace(",", ".");
  if (!trimmed) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : NaN;
};

// The form → what the API takes; height and weight that aren't numbers are
// marked here
export function medicalFieldsFromForm(form: MedicalForm): {
  fields: MedicalIdInput | null;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  const height = number(form.heightCm);
  const weight = number(form.weightKg);
  if (Number.isNaN(height)) errors.heightCm = "Enter a number, like 158";
  if (Number.isNaN(weight)) errors.weightKg = "Enter a number, like 62.5";
  if (Object.keys(errors).length) return { fields: null, errors };
  return {
    fields: {
      ...form,
      heightCm: height,
      weightKg: weight,
      // Leftover blank rows are dropped
      allergies: form.allergies.filter(
        (a) => a.name.trim() || a.reaction.trim(),
      ),
      conditions: form.conditions.filter(
        (c) => c.name.trim() || c.since.trim(),
      ),
      medicines: form.medicines.filter((m) => m.name.trim() || m.dose.trim()),
      devices: form.devices.filter((d) => d.name.trim() || d.note.trim()),
      contacts: form.contacts.filter(
        (c) => c.name.trim() || c.phone.trim() || c.relationship.trim(),
      ),
      noKnownAllergies: form.allergies.length ? false : form.noKnownAllergies,
    },
    errors,
  };
}

// Moves item `from` up or down by one
export function moveItem<T>(list: T[], from: number, by: -1 | 1) {
  const to = from + by;
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}
