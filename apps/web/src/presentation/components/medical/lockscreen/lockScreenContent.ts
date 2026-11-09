import {
  allergiesBySeverity,
  type MedicalIdFields,
  SEVERITY_LABELS,
} from "@talaan/shared";

export const PHONE_SIZES = {
  iphone: { name: "iPhone", width: 1179, height: 2556 },
  android: { name: "Android", width: 1080, height: 2400 },
  tall: { name: "Other phones (taller)", width: 1080, height: 2340 },
  short: { name: "Older phones (16:9)", width: 1080, height: 1920 },
} as const;
export type PhoneSize = keyof typeof PHONE_SIZES;

export interface LockScreenOptions {
  phone: PhoneSize;
  dark: boolean;
  fullName: boolean;
  bloodType: boolean;
  allergies: boolean;
  conditions: boolean;
  medicines: boolean;
  contacts: boolean;
  philhealth: boolean;
  // Only when the emergency QR is on
  qr: boolean;
}

export const DEFAULT_LOCK_SCREEN: LockScreenOptions = {
  phone: "iphone",
  dark: true,
  fullName: true,
  bloodType: true,
  allergies: true,
  conditions: true,
  medicines: false,
  contacts: true,
  philhealth: false,
  qr: true,
};

export interface LockScreenSection {
  title: string;
  lines: { text: string; strong?: boolean; alert?: boolean }[];
}

// What goes on the picture, in order; empty parts are left out
export function lockScreenSections(
  fields: MedicalIdFields,
  options: LockScreenOptions,
): LockScreenSection[] {
  const sections: LockScreenSection[] = [];
  if (options.allergies) {
    const allergies = allergiesBySeverity(fields.allergies);
    if (allergies.length) {
      sections.push({
        title: "Allergies",
        lines: allergies.map((a) => ({
          text: `${a.name} (${SEVERITY_LABELS[a.severity].toLowerCase()})`,
          strong: true,
          alert: a.severity === "life-threatening" || a.severity === "severe",
        })),
      });
    } else if (fields.noKnownAllergies) {
      sections.push({
        title: "Allergies",
        lines: [{ text: "No known allergies" }],
      });
    }
  }
  if (options.conditions && fields.conditions.length) {
    sections.push({
      title: "Conditions",
      lines: fields.conditions.map((c) => ({ text: c.name })),
    });
  }
  if (options.medicines && fields.medicines.length) {
    sections.push({
      title: "Medicines",
      lines: fields.medicines.map((m) => ({
        text: m.dose ? `${m.name}, ${m.dose}` : m.name,
      })),
    });
  }
  if (options.contacts && fields.contacts.length) {
    sections.push({
      title: "In an emergency, call",
      lines: fields.contacts.map((c) => ({
        text: `${c.name}${c.relationship ? ` (${c.relationship})` : ""}: ${c.phone}`,
        strong: true,
      })),
    });
  }
  if (options.philhealth && fields.philhealth) {
    sections.push({
      title: "PhilHealth ID",
      lines: [{ text: fields.philhealth }],
    });
  }
  return sections;
}
