import { RECORD_TYPE_LABELS, REMINDER_KIND_LABELS } from "@talaan/shared";
import { labFlag } from "@talaan/shared";
import type { ExportData } from "./ExportData.js";

// One cell: quoted when needed; a leading = + - @ is made plain text, so a
// spreadsheet never runs it as a formula
function cell(value: unknown) {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// With a BOM so Excel reads ñ and other letters right
export function toCsv(rows: unknown[][]) {
  return `﻿${rows.map((r) => r.map(cell).join(",")).join("\r\n")}\r\n`;
}

function detailText(details: Record<string, unknown>) {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(details)) {
    if (key === "results" || value === null || value === "") continue;
    if (key === "medicines" && Array.isArray(value)) {
      parts.push(
        value
          .map((m: { name: string; dose: string; frequency: string }) =>
            [m.name, m.dose, m.frequency].filter(Boolean).join(" "),
          )
          .join("; "),
      );
    } else if (typeof value !== "object") {
      parts.push(`${key}: ${value}`);
    }
  }
  return parts.join(" | ");
}

export function recordsCsv(data: ExportData) {
  return toCsv([
    [
      "Person",
      "Type",
      "Title",
      "Date",
      "Doctor",
      "Clinic or hospital",
      "Notes",
      "Details",
      "Kept in",
      "Photos and PDFs",
      "In the Trash",
    ],
    ...data.records.map((r) => [
      r.person,
      RECORD_TYPE_LABELS[r.record.type],
      r.record.title,
      r.record.recordDate,
      r.record.doctor,
      r.record.facility,
      r.record.notes,
      detailText(r.record.details as Record<string, unknown>),
      r.place,
      r.files.length,
      r.inTrash ? "Yes" : "",
    ]),
  ]);
}

export function labResultsCsv(data: ExportData) {
  const rows: unknown[][] = [
    [
      "Person",
      "Date",
      "Record",
      "Clinic or hospital",
      "Test",
      "Result",
      "Unit",
      "Normal low",
      "Normal high",
      "Flag",
    ],
  ];
  for (const r of data.records) {
    if (r.record.type !== "lab" || r.inTrash) continue;
    for (const result of r.record.details.results) {
      const flag = labFlag(result);
      rows.push([
        r.person,
        r.record.recordDate,
        r.record.title,
        r.record.facility,
        result.name,
        result.value,
        result.unit,
        result.rangeLow,
        result.rangeHigh,
        flag === "low" ? "Low" : flag === "high" ? "High" : "",
      ]);
    }
  }
  return toCsv(rows);
}

export function remindersCsv(data: ExportData) {
  return toCsv([
    ["Person", "Kind", "Title", "Dose", "Note", "Times", "Starts", "Paused"],
    ...data.reminders.map(({ reminder: r, person }) => [
      person,
      REMINDER_KIND_LABELS[r.kind],
      r.title,
      r.dose,
      r.note,
      r.schedule.times.join(" "),
      r.schedule.start,
      r.paused ? "Yes" : "",
    ]),
  ]);
}
