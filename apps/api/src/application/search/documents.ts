import {
  buildLabSeries,
  formatLabelCode,
  fullName,
  labTestAliases,
  PLACE_KIND_LABELS,
  RECORD_TYPE_LABELS,
  REMINDER_KIND_LABELS,
  type SearchKind,
} from "@talaan/shared";
import type { MedicalId } from "../../domain/medical/MedicalId.js";
import type { Place } from "../../domain/place/Place.js";
import { pathText, pathTo } from "../../domain/place/rules.js";
import type { HealthRecord } from "../../domain/record/HealthRecord.js";
import { toLabResults } from "../../domain/record/labResults.js";
import type { Reminder } from "../../domain/reminder/Reminder.js";
import { personName, type Household } from "../record/RecordAccess.js";

// Something that can be found, with the texts it's found by
export interface SearchDocument {
  kind: SearchKind;
  id: string;
  title: string;
  subtitle: string;
  path: string;
  ownerId: string;
  profileId: string | null;
  personName: string;
  date: string | null;
  // The first is the title. A label shows what matched under the result.
  fields: { text: string; weight: number; label?: string }[];
}

// "2026-10-05" → "Oct 5, 2026"
const dateText = (date: string) =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));

// Found by "2026", "oct", "october 2026" and "2026-10-05"
const dateWords = (date: string) =>
  `${date} ${dateText(date)} ${new Intl.DateTimeFormat("en-US", {
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`))}`;

const personQuery = (ownerId: string, profileId: string | null) =>
  new URLSearchParams({ owner: ownerId, person: profileId ?? "self" });

const joinParts = (...parts: (string | null | undefined | false)[]) =>
  parts.filter(Boolean).join(" · ");

const field = (text: string, weight: number, label?: string) => ({
  text,
  weight,
  label,
});

function recordDetails(record: HealthRecord) {
  const d = record.details as Record<string, unknown>;
  switch (record.type) {
    case "lab":
      return (
        (d.results as { name: string; value: string; unit: string }[]) ?? []
      ).map((r) => field(`${r.name} ${r.value} ${r.unit}`.trim(), 2, "Result"));
    case "prescription":
      return (
        (d.medicines as { name: string; dose: string; frequency: string }[]) ??
        []
      ).map((m) =>
        field(
          [m.name, m.dose, m.frequency].filter(Boolean).join(", "),
          2,
          "Medicine",
        ),
      );
    case "imaging":
      return [
        field(String(d.bodyPart ?? ""), 1.5, "Body part"),
        field(String(d.reading ?? ""), 1, "Reading"),
      ];
    case "vaccination":
      return [field(String(d.vaccine ?? ""), 2, "Vaccine")];
    case "billing":
      return [
        field(String(d.hmo ?? ""), 1.5, "HMO"),
        field(String(d.loaNumber ?? ""), 1.5, "LOA number"),
      ];
    default:
      return [];
  }
}

export function recordDocuments(
  household: Household,
  records: HealthRecord[],
  places: Place[],
): SearchDocument[] {
  const placeName = new Map(places.map((p) => [p.id, p.name]));
  return records.map((record) => {
    const name = personName(household, record.profileId);
    const kept = record.placeId ? placeName.get(record.placeId) : undefined;
    return {
      kind: "record",
      id: record.id,
      title: record.title,
      subtitle: joinParts(
        RECORD_TYPE_LABELS[record.type],
        dateText(record.recordDate),
        record.facility,
      ),
      path: `/records/${record.id}`,
      ownerId: household.ownerId,
      profileId: record.profileId,
      personName: name,
      date: record.recordDate,
      fields: [
        field(record.title, 3),
        field(RECORD_TYPE_LABELS[record.type], 2),
        field(name, 1.5),
        field(record.facility, 1.5, "Clinic or hospital"),
        field(record.doctor, 1.5, "Doctor"),
        field(dateWords(record.recordDate), 1),
        ...recordDetails(record),
        field(record.notes, 1, "Notes"),
        field(kept ?? "", 1, "Kept in"),
      ],
    };
  });
}

// Each test across one person's lab records ("Hemoglobin": every result)
export function testDocuments(
  household: Household,
  records: HealthRecord[],
): SearchDocument[] {
  const people = [null, ...household.profiles.map((p) => p.id)];
  return people.flatMap((profileId) => {
    const labs = records.filter(
      (r) => r.type === "lab" && r.profileId === profileId,
    );
    if (labs.length === 0) return [];
    const name = personName(household, profileId);
    return buildLabSeries(toLabResults(labs)).map((series) => {
      const latest = series.points.at(-1);
      const n = series.points.length;
      const query = personQuery(household.ownerId, profileId);
      query.set("view", "test");
      query.set("test", series.key);
      return {
        kind: "test" as const,
        id: `${household.ownerId}:${profileId ?? "self"}:${series.key}`,
        title: series.name,
        subtitle: joinParts(
          latest &&
            `Latest ${latest.shown}${series.unit ? ` ${series.unit}` : ""}`,
          latest && dateText(latest.date),
          `${n} ${n === 1 ? "result" : "results"}`,
        ),
        path: `/labs?${query}`,
        ownerId: household.ownerId,
        profileId,
        personName: name,
        date: latest?.date ?? null,
        fields: [
          field(series.name, 3),
          field(labTestAliases(series.name).join(" "), 2.5, "Also called"),
          field(`${series.group} lab test`, 1),
          field(name, 1.5),
        ],
      };
    });
  });
}

export function medicalDocuments(
  household: Household,
  medicalIds: MedicalId[],
): SearchDocument[] {
  return medicalIds.flatMap((m) => {
    const f = m.fields;
    const name = personName(household, m.profileId);
    const items = [
      ...f.allergies.map((a) =>
        field([a.name, a.reaction].filter(Boolean).join(", "), 2, "Allergy"),
      ),
      ...f.conditions.map((c) => field(c.name, 2, "Condition")),
      ...f.medicines.map((x) =>
        field([x.name, x.dose].filter(Boolean).join(", "), 2, "Medicine"),
      ),
      ...f.devices.map((d) => field(d.name, 1.5, "Implant or device")),
      ...(f.bloodType && f.bloodType !== "unknown"
        ? [field(`Blood type ${f.bloodType}`, 1.5, "Blood type")]
        : []),
      ...f.contacts.map((c) =>
        field(
          [c.name, c.relationship].filter(Boolean).join(", "),
          1,
          "Emergency contact",
        ),
      ),
      field(f.notes, 1, "Notes for doctors"),
    ].filter((x) => x.text.trim());
    if (items.length === 0) return [];
    return [
      {
        kind: "medical" as const,
        id: `${m.ownerId}:${m.profileId ?? "self"}`,
        title: `${name}'s Medical ID`,
        subtitle: joinParts(
          f.bloodType &&
            f.bloodType !== "unknown" &&
            `Blood type ${f.bloodType}`,
          f.allergies.length > 0 &&
            `${f.allergies.length} ${f.allergies.length === 1 ? "allergy" : "allergies"}`,
        ),
        path: `/medical-id?${personQuery(m.ownerId, m.profileId)}`,
        ownerId: m.ownerId,
        profileId: m.profileId,
        personName: name,
        date: null,
        fields: [
          field(`${name}'s Medical ID`, 2),
          field("Medical ID allergies conditions medicines", 1),
          ...items,
        ],
      },
    ];
  });
}

export function placeDocuments(
  household: Household,
  places: Place[],
): SearchDocument[] {
  return places.map((place) => {
    const inside = pathText(pathTo(places, place.id));
    const code = formatLabelCode(place.code);
    return {
      kind: "place",
      id: place.id,
      title: place.name,
      subtitle: joinParts(
        PLACE_KIND_LABELS[place.kind],
        inside && `in ${inside}`,
        code,
        `${place.recordCount} ${place.recordCount === 1 ? "record" : "records"}`,
      ),
      path: `/places/${place.id}`,
      ownerId: household.ownerId,
      profileId: null,
      personName: household.ownerName,
      date: null,
      fields: [
        field(place.name, 3),
        field(PLACE_KIND_LABELS[place.kind], 2),
        // Already shown under the name, so no "matched" line for it
        field(`${code} ${place.code}`, 3),
        field(place.note, 1, "Note"),
        field(inside, 1, "Inside"),
      ],
    };
  });
}

export function reminderDocuments(
  household: Household,
  reminders: Reminder[],
): SearchDocument[] {
  return reminders.map((reminder) => {
    const name = personName(household, reminder.profileId);
    return {
      kind: "reminder",
      id: reminder.id,
      title: reminder.title,
      subtitle: joinParts(
        REMINDER_KIND_LABELS[reminder.kind],
        reminder.dose,
        reminder.paused && "Paused",
      ),
      path: `/reminders/${reminder.id}`,
      ownerId: household.ownerId,
      profileId: reminder.profileId,
      personName: name,
      date: null,
      fields: [
        field(reminder.title, 3),
        field(`${REMINDER_KIND_LABELS[reminder.kind]} reminder`, 2),
        field(reminder.dose, 1.5, "Dose"),
        field(name, 1.5),
        field(reminder.note, 1, "Note"),
      ],
    };
  });
}

// The owner and each family profile (opens their records)
export function personDocuments(household: Household): SearchDocument[] {
  const people = [
    {
      profileId: null,
      name: household.ownerName,
      relationship: "Account owner",
    },
    ...household.profiles.map((p) => ({
      profileId: p.id,
      name: fullName(p),
      relationship: p.relationship as string,
    })),
  ];
  return people.map((p) => ({
    kind: "person",
    id: `${household.ownerId}:${p.profileId ?? "self"}`,
    title: p.name,
    subtitle:
      p.profileId === null
        ? "Account owner"
        : `${p.relationship} of ${household.ownerName}`,
    path: `/records?${personQuery(household.ownerId, p.profileId)}`,
    ownerId: household.ownerId,
    profileId: p.profileId,
    personName: p.name,
    date: null,
    fields: [field(p.name, 3), field(p.relationship, 2, "Relationship")],
  }));
}
