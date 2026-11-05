import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";
import { useActivity } from "../../application/records/useRecords";
import { HistoryList } from "../components/records/HistoryList";
import { ErrorAlert } from "../components/ui/ErrorAlert";
import { buttonSecondary } from "../components/ui/styles";
import { errorMessage } from "../format/errorMessage";

// Everything that happened in your account: records added, edited, moved to
// the Trash or deleted, and who you shared with. Only ever added to.
export function ActivityPage() {
  const activity = useActivity();
  const entries = activity.data?.pages.flatMap((page) => page.entries) ?? [];

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
        <h1 className="text-3xl font-bold">Activity</h1>
        <p className="text-muted">
          Who added, changed or deleted what in your records, and who you shared
          them with. Nobody can change or delete this list, not even you.
        </p>
      </div>
      {activity.isError && (
        <ErrorAlert message={errorMessage(activity.error)} />
      )}
      {activity.isPending && (
        <p role="status" className="text-muted">
          Loading…
        </p>
      )}
      {activity.isSuccess && entries.length === 0 && (
        <p className="rounded-xl border border-dashed border-edge bg-white p-6 text-muted">
          Nothing yet. Adding a record or inviting family shows up here.
        </p>
      )}
      {entries.length > 0 && <HistoryList entries={entries} linkRecords />}
      {activity.hasNextPage && (
        <button
          type="button"
          onClick={() => activity.fetchNextPage()}
          disabled={activity.isFetchingNextPage}
          className={`${buttonSecondary} self-start`}
        >
          {activity.isFetchingNextPage ? "Loading…" : "Show older"}
        </button>
      )}
    </main>
  );
}
