import { RECORD_TYPE_LABELS, TRASH_DAYS } from "@talaan/shared";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import {
  useDeleteForever,
  useEmptyTrash,
  useRestoreRecord,
  useTrash,
} from "../../application/records/useRecords";
import { RecordTypeIcon } from "../components/records/RecordTypeIcon";
import { ErrorAlert } from "../components/ui/ErrorAlert";
import { Notice } from "../components/ui/Notice";
import { buttonDanger, buttonSecondary } from "../components/ui/styles";
import { shortDate, shortDateTime } from "../format/dates";
import { errorMessage } from "../format/errorMessage";

const linkButton =
  "cursor-pointer text-sm font-semibold text-brand underline disabled:opacity-60";

export function TrashPage() {
  const trash = useTrash();
  const restore = useRestoreRecord();
  const remove = useDeleteForever();
  const empty = useEmptyTrash();
  // Which record is waiting for "Yes, delete for good" (or "all")
  const [confirming, setConfirming] = useState<string | null>(null);
  const [restored, setRestored] = useState<string | null>(null);
  const error = trash.error ?? restore.error ?? remove.error ?? empty.error;
  const records = trash.data ?? [];

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
      <Link
        to="/records"
        className="flex items-center gap-1 text-sm font-semibold text-brand"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to records
      </Link>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Trash</h1>
        <p className="text-muted">
          Records stay here for {TRASH_DAYS} days, then they're deleted for
          good. Only you can restore them or delete them sooner. The history
          keeps who moved each one here.
        </p>
      </div>
      {error && <ErrorAlert message={errorMessage(error)} />}
      {restored && <Notice>“{restored}” is back in your records.</Notice>}
      {trash.isPending && (
        <p role="status" className="text-muted">
          Loading…
        </p>
      )}
      {trash.isSuccess && records.length === 0 && (
        <p className="rounded-xl border border-dashed border-edge bg-white p-6 text-muted">
          The Trash is empty.
        </p>
      )}
      {records.length > 0 && (
        <ul className="flex flex-col divide-y divide-edge rounded-xl border border-edge bg-white">
          {records.map((record) => (
            <li key={record.id} className="flex flex-col gap-2 px-4 py-3">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-page text-muted">
                  <RecordTypeIcon type={record.type} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <strong className="break-words">{record.title}</strong>
                  <span className="text-sm text-muted">
                    {RECORD_TYPE_LABELS[record.type]} · {record.personName} ·{" "}
                    {shortDate(record.recordDate)}
                  </span>
                  <span className="text-sm">
                    Moved here by {record.deletedByName ?? "someone"} on{" "}
                    {shortDateTime(record.deletedAt)}
                  </span>
                  <span className="text-sm text-muted">
                    Deleted for good on {shortDate(record.purgeAt)}
                  </span>
                </span>
              </div>
              {confirming === record.id ? (
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span>
                    Delete “{record.title}” for good? This can't be undone.
                  </span>
                  <button
                    type="button"
                    onClick={() => remove.mutate(record.id)}
                    disabled={remove.isPending}
                    className="cursor-pointer font-semibold text-danger underline"
                  >
                    Yes, delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming(null)}
                    className={linkButton}
                  >
                    Keep
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-4">
                  <button
                    type="button"
                    onClick={() =>
                      restore.mutate(record.id, {
                        onSuccess: () => setRestored(record.title),
                      })
                    }
                    disabled={restore.isPending}
                    aria-label={`Restore ${record.title}`}
                    className={`${linkButton} inline-flex items-center gap-1`}
                  >
                    <RotateCcw aria-hidden="true" className="size-4" />
                    Restore
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming(record.id)}
                    aria-label={`Delete ${record.title} for good`}
                    className={linkButton}
                  >
                    Delete for good
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {records.length > 1 &&
        (confirming === "all" ? (
          <div className="flex flex-col gap-3 rounded-xl border border-danger/30 bg-danger-soft p-4">
            <p className="font-medium">
              Delete all {records.length} records in the Trash for good? This
              can't be undone.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  empty.mutate(undefined, {
                    onSuccess: () => setConfirming(null),
                  })
                }
                disabled={empty.isPending}
                className={buttonDanger}
              >
                {empty.isPending ? "Deleting…" : "Empty the Trash"}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(null)}
                className={buttonSecondary}
              >
                Keep them
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming("all")}
            className={`${buttonSecondary} self-start`}
          >
            Empty the Trash
          </button>
        ))}
    </main>
  );
}
