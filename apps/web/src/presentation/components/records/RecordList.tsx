import { RECORD_TYPE_LABELS, type RecordSummary } from "@talaan/shared";
import { Paperclip } from "lucide-react";
import { Link } from "react-router";
import { shortDate } from "../../format/dates";
import { listCard } from "../ui/styles";
import { RecordTypeIcon } from "./RecordTypeIcon";

// Records, newest first: type, title, who, where, and lab results out of range
export function RecordList({ records }: { records: RecordSummary[] }) {
  return (
    <ul className={listCard}>
      {records.map((record) => (
        <li key={record.id}>
          <Link
            to={`/records/${record.id}`}
            className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50"
          >
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-deep">
              <RecordTypeIcon type={record.type} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="flex flex-wrap items-center gap-2">
                <strong className="truncate">{record.title}</strong>
                {record.outOfRange > 0 && (
                  <span className="rounded-full bg-danger-soft px-2 py-0.5 text-xs font-semibold text-danger">
                    {record.outOfRange} out of range
                  </span>
                )}
              </span>
              <span className="text-sm text-muted">
                {record.fileCount > 0 && (
                  <span
                    className="mr-1.5 inline-flex items-center gap-0.5 align-middle"
                    title={`${record.fileCount} ${record.fileCount === 1 ? "file" : "files"}`}
                  >
                    <Paperclip aria-hidden="true" className="size-3.5" />
                    {record.fileCount}
                    <span className="sr-only">
                      {record.fileCount === 1 ? " file" : " files"}
                    </span>
                  </span>
                )}
                {RECORD_TYPE_LABELS[record.type]} · {record.personName}
                {record.facility && ` · ${record.facility}`}
              </span>
            </span>
            <span className="shrink-0 text-sm text-muted">
              {shortDate(record.recordDate)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
