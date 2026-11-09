import type { RecordInfo } from "@talaan/shared";
import { BellPlus, Pencil, Trash } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useMoveToTrash } from "../../../../application/records/useRecords";
import { errorMessage } from "../../../format/errorMessage";
import { ErrorAlert } from "../../ui/ErrorAlert";
import { buttonDanger, buttonSecondary } from "../../ui/styles";

// Edit and "Move to Trash" (with a second click to be sure), for the owner
// and "Can manage" family
export function RecordActions({ record }: { record: RecordInfo }) {
  const canManage = record.role === "owner" || record.role === "manage";
  const trash = useMoveToTrash();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);

  async function moveToTrash() {
    try {
      await trash.mutateAsync(record.id);
      navigate(
        `/records?owner=${record.ownerId}&trashed=${encodeURIComponent(record.title)}`,
        { replace: true },
      );
    } catch {
      // Shown below
    }
  }

  return (
    <>
      {canManage && (
        <div className="flex flex-wrap gap-2">
          <Link to={`/records/${record.id}/edit`} className={buttonSecondary}>
            <Pencil aria-hidden="true" className="size-4" />
            Edit
          </Link>
          <Link
            to={`/reminders/new?owner=${record.ownerId}&record=${record.id}`}
            className={buttonSecondary}
          >
            <BellPlus aria-hidden="true" className="size-4" />
            Add a reminder
          </Link>
          {!confirming && (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className={buttonSecondary}
            >
              <Trash aria-hidden="true" className="size-4" />
              Move to Trash
            </button>
          )}
        </div>
      )}
      {confirming && (
        <div className="flex flex-col gap-3 rounded-xl border border-danger/30 bg-danger-soft p-4">
          <p className="font-medium">
            Move “{record.title}” to the Trash?{" "}
            {record.role === "owner"
              ? "You can restore it for 30 days."
              : "The owner can restore it for 30 days."}{" "}
            Your name is saved in the history.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={moveToTrash}
              disabled={trash.isPending}
              className={buttonDanger}
            >
              {trash.isPending ? "Moving…" : "Move to Trash"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className={buttonSecondary}
            >
              Keep it
            </button>
          </div>
        </div>
      )}
      {trash.isError && <ErrorAlert message={errorMessage(trash.error)} />}
    </>
  );
}
