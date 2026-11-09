import { ALLERGY_SEVERITIES, type MedicalIdFields } from "./schema.js";

// Life-threatening allergies first
export const allergiesBySeverity = (allergies: MedicalIdFields["allergies"]) =>
  [...allergies].sort(
    (a, b) =>
      ALLERGY_SEVERITIES.indexOf(a.severity) -
      ALLERGY_SEVERITIES.indexOf(b.severity),
  );

// Whole years old on a day ("YYYY-MM-DD" both); null without a birth date
export function ageOn(birthDate: string, today: string) {
  if (!birthDate) return null;
  const [by, bm, bd] = birthDate.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
}

// "Maria Lopez Santos" → "Maria S." for the emergency page
export function emergencyName(firstName: string, lastName: string) {
  const initial = lastName.trim().charAt(0);
  return initial
    ? `${firstName.trim()} ${initial.toUpperCase()}.`
    : firstName.trim();
}

// "tel:" link: digits and a leading +
export const telLink = (phone: string) =>
  `tel:${phone.trim().startsWith("+") ? "+" : ""}${phone.replace(/\D/g, "")}`;

// Months since a date, to ask whether it's still right
export function monthsSince(iso: string, now: Date) {
  const then = new Date(iso);
  return (
    (now.getFullYear() - then.getFullYear()) * 12 +
    (now.getMonth() - then.getMonth())
  );
}

// Is anything filled in?
export function isEmptyMedicalId(f: MedicalIdFields) {
  return (
    !f.birthDate &&
    !f.sex &&
    !f.bloodType &&
    f.heightCm === null &&
    f.weightKg === null &&
    !f.noKnownAllergies &&
    f.allergies.length === 0 &&
    f.conditions.length === 0 &&
    f.medicines.length === 0 &&
    f.devices.length === 0 &&
    f.contacts.length === 0 &&
    !f.doctor.name &&
    !f.doctor.phone &&
    !f.philhealth &&
    !f.organDonor &&
    !f.notes
  );
}
