import type { RecordType } from "@talaan/shared";
import { ClipboardList, Plus, Trash } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import {
  useRecordAccounts,
  useRecordList,
} from "../../../application/records/useRecords";
import { RecordFilters } from "../../components/records/RecordFilters";
import { RecordList } from "../../components/records/RecordList";
import { ErrorAlert } from "../../components/ui/ErrorAlert";
import { Loading } from "../../components/ui/Loading";
import { Notice } from "../../components/ui/Notice";
import { buttonPrimary, buttonSecondary } from "../../components/ui/styles";
import { errorMessage } from "../../format/errorMessage";

// The filters live in the address (?owner=…&person=…&type=…), so Back and links keep them
export function RecordsPage() {
  const [params, setParams] = useSearchParams();
  const accounts = useRecordAccounts();
  const list = accounts.data ?? [];
  const account =
    list.find((a) => a.ownerId === params.get("owner")) ?? list[0] ?? null;
  const person = params.get("person") ?? "";
  const type = (params.get("type") ?? "") as RecordType | "";
  const trashed = params.get("trashed");

  const records = useRecordList({
    ownerId: account?.ownerId,
    profileId: person || undefined,
    type: type || undefined,
  });

  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("trashed");
    if (key === "owner") next.delete("person");
    setParams(next, { replace: true });
  }

  const canAdd = account?.role === "owner" || account?.role === "manage";
  const newLink = account
    ? `/records/new?owner=${account.ownerId}${person ? `&person=${person}` : ""}`
    : "/records/new";

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-bold">Records</h1>
        <div className="flex flex-wrap gap-2">
          {account?.role === "owner" && (
            <>
              <Link to="/activity" className={buttonSecondary}>
                <ClipboardList aria-hidden="true" className="size-4" />
                Activity
              </Link>
              <Link to="/records/trash" className={buttonSecondary}>
                <Trash aria-hidden="true" className="size-4" />
                Trash
              </Link>
            </>
          )}
          {canAdd && (
            <Link to={newLink} className={buttonPrimary}>
              <Plus aria-hidden="true" className="size-4" />
              Add record
            </Link>
          )}
        </div>
      </div>

      {trashed && (
        <Notice>
          “{trashed}” was moved to the Trash.{" "}
          {account?.role === "owner"
            ? "You can restore it there for 30 days."
            : "The owner can restore it for 30 days."}
        </Notice>
      )}
      {accounts.isError && (
        <ErrorAlert message={errorMessage(accounts.error)} />
      )}

      {account && (
        <RecordFilters
          accounts={list}
          account={account}
          person={person}
          type={type}
          onChange={setFilter}
        />
      )}

      {account?.role === "view" && (
        <p className="text-sm text-muted">
          {account.ownerName} shared these records with you to view.
        </p>
      )}

      {records.isPending && <Loading />}
      {records.isError && <ErrorAlert message={errorMessage(records.error)} />}
      {records.data && records.data.records.length === 0 && (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-edge bg-white p-6">
          <p className="font-semibold">No records here yet.</p>
          <p className="text-sm text-muted">
            {person || type
              ? "Try another person or type."
              : "Start with the last X-ray, lab result or prescription you have on hand."}
          </p>
          {canAdd && !person && !type && (
            <Link to={newLink} className={buttonPrimary}>
              Add the first record
            </Link>
          )}
        </div>
      )}
      {records.data && records.data.records.length > 0 && (
        <RecordList records={records.data.records} />
      )}
    </main>
  );
}
