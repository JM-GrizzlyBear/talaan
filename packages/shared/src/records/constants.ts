export const RECORD_TYPES = [
  "imaging",
  "lab",
  "prescription",
  "consultation",
  "certificate",
  "vaccination",
  "billing",
  "other",
] as const;
export type RecordType = (typeof RECORD_TYPES)[number];

export const RECORD_TYPE_LABELS: Record<RecordType, string> = {
  imaging: "X-ray / imaging",
  lab: "Lab result",
  prescription: "Prescription",
  consultation: "Consultation",
  certificate: "Medical certificate",
  vaccination: "Vaccination",
  billing: "HMO / Billing",
  other: "Other",
};

export const TRASH_DAYS = 30;

export const RECORD_LIMITS = {
  title: 120,
  person: 120,
  notes: 5000,
  reading: 5000,
  labRows: 100,
  medicines: 50,
} as const;
