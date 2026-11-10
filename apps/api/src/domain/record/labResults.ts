import type { LabRecordResults } from "@talaan/shared";
import type { HealthRecord } from "./HealthRecord.js";

// Lab records → their results, oldest first, for comparing
export function toLabResults(records: HealthRecord[]): LabRecordResults[] {
  return records
    .map((record) => ({
      recordId: record.id,
      title: record.title,
      date: record.recordDate,
      facility: record.facility,
      results:
        record.type === "lab" && "results" in record.details
          ? record.details.results
          : [],
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
