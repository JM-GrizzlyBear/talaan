import { RECORD_TYPE_LABELS, type RecordSummary } from "@talaan/shared";
import { ChartLine, HeartPulse, Search } from "lucide-react";
import { useState } from "react";
import { shortDate } from "../../../format/dates";
import { RecordTypeIcon } from "../../records/RecordTypeIcon";
import { CheckboxField } from "../../ui/CheckboxField";
import { inputBase, linkButton } from "../../ui/styles";

export interface ShareChoice {
  medicalId: boolean;
  labs: boolean;
  recordIds: string[];
}

// The Medical ID, the lab results (lined up to compare), and any records
export function WhatToShare({
  value,
  onChange,
  records,
  error,
}: {
  value: ShareChoice;
  onChange: (value: ShareChoice) => void;
  // This person's records
  records: RecordSummary[];
  error?: string;
}) {
  const [search, setSearch] = useState("");
  const chosen = new Set(value.recordIds);
  const labCount = records.filter((r) => r.type === "lab").length;
  const words = search.trim().toLowerCase();
  const shown = words
    ? records.filter((r) =>
        [
          r.title,
          r.facility,
          r.doctor,
          RECORD_TYPE_LABELS[r.type],
          r.recordDate,
        ]
          .join(" ")
          .toLowerCase()
          .includes(words),
      )
    : records;

  const setRecords = (ids: Iterable<string>) =>
    onChange({ ...value, recordIds: [...new Set(ids)] });
  const toggle = (id: string, on: boolean) =>
    setRecords(
      on ? [...value.recordIds, id] : value.recordIds.filter((r) => r !== id),
    );

  return (
    <div className="flex flex-col gap-4">
      <CheckboxField
        checked={value.medicalId}
        onChange={(medicalId) => onChange({ ...value, medicalId })}
      >
        <span className="flex items-center gap-1.5 font-semibold">
          <HeartPulse aria-hidden="true" className="size-4 text-brand" />
          Medical ID
        </span>
        <span className="block text-muted">
          Allergies, blood type, conditions, medicines, contacts
        </span>
      </CheckboxField>
      <CheckboxField
        checked={value.labs}
        onChange={(labs) => onChange({ ...value, labs })}
      >
        <span className="flex items-center gap-1.5 font-semibold">
          <ChartLine aria-hidden="true" className="size-4 text-brand" />
          Lab results to compare
        </span>
        <span className="block text-muted">
          Every test over time ({labCount}{" "}
          {labCount === 1 ? "lab record" : "lab records"}): the table, charts
          and what needs attention. New lab results show too while the link
          works.
        </span>
      </CheckboxField>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="font-semibold">
            Records ({value.recordIds.length} of {records.length} chosen)
          </span>
          {records.length > 0 && (
            <span className="flex gap-3">
              <button
                type="button"
                onClick={() =>
                  setRecords([...value.recordIds, ...shown.map((r) => r.id)])
                }
                className={linkButton}
              >
                {words ? "Choose these" : "Choose all"}
              </button>
              <button
                type="button"
                onClick={() =>
                  setRecords(
                    words
                      ? value.recordIds.filter(
                          (id) => !shown.some((r) => r.id === id),
                        )
                      : [],
                  )
                }
                className={linkButton}
              >
                {words ? "Leave these out" : "Choose none"}
              </button>
            </span>
          )}
        </div>
        {records.length === 0 ? (
          <p className="text-sm text-muted">No records for this person yet.</p>
        ) : (
          <>
            {records.length > 6 && (
              <label className="relative">
                <span className="sr-only">Find records</span>
                <Search
                  aria-hidden="true"
                  className="absolute top-3 left-3 size-5 text-muted"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Find: CBC, X-ray, St. Luke's, 2025…"
                  className={`${inputBase} h-11 border-edge pl-10`}
                />
              </label>
            )}
            <ul className="flex max-h-96 flex-col divide-y divide-edge overflow-y-auto rounded-xl border border-edge">
              {shown.map((r) => (
                <li key={r.id}>
                  <label className="flex cursor-pointer items-start gap-3 px-3 py-2.5 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={chosen.has(r.id)}
                      onChange={(e) => toggle(r.id, e.target.checked)}
                      className="mt-0.5 size-5 shrink-0 cursor-pointer accent-brand"
                    />
                    <RecordTypeIcon
                      type={r.type}
                      className="mt-0.5 size-5 shrink-0 text-brand"
                    />
                    <span className="flex min-w-0 flex-col">
                      <span className="font-medium break-words">{r.title}</span>
                      <span className="text-xs text-muted">
                        {RECORD_TYPE_LABELS[r.type]} · {shortDate(r.recordDate)}
                        {r.facility && ` · ${r.facility}`}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
              {shown.length === 0 && (
                <li className="px-3 py-2.5 text-sm text-muted">
                  No records match.
                </li>
              )}
            </ul>
          </>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
