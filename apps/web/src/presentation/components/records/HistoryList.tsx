import type { AuditEntryInfo } from "@talaan/shared";
import { Link } from "react-router";
import { auditSentence, changeText, shortDateTime } from "@talaan/client";
import { listCard } from "../ui/styles";

// A list of history entries: who did what, when, and exactly what changed
export function HistoryList({
  entries,
  linkRecords = false,
}: {
  entries: AuditEntryInfo[];
  // On the Activity page, entries link to their record
  linkRecords?: boolean;
}) {
  return (
    <ol className={listCard}>
      {entries.map((entry) => (
        <li key={entry.id} className="flex flex-col gap-1 px-4 py-3">
          <span className="text-sm text-muted">{shortDateTime(entry.at)}</span>
          <span className="font-medium">
            {linkRecords &&
            entry.recordId &&
            ["record.created", "record.edited", "record.restored"].includes(
              entry.action,
            ) ? (
              <Link
                to={`/records/${entry.recordId}`}
                className="underline decoration-edge underline-offset-2 hover:decoration-brand"
              >
                {auditSentence(entry)}
              </Link>
            ) : (
              auditSentence(entry)
            )}
          </span>
          {entry.changes.length > 0 && (
            <ul className="mt-1 flex flex-col gap-0.5 border-l-2 border-brand-soft pl-3 text-sm">
              {entry.changes.map((change, index) => (
                <li key={index} className="break-words">
                  {changeText(change, entry.action)}
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ol>
  );
}
