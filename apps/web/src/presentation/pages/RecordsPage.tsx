import {
  ACCESS_LABELS,
  RECORD_TYPES,
  RECORD_TYPE_LABELS,
  type RecordAccountInfo,
  type RecordType,
} from "@talaan/shared";
import { ClipboardList, Paperclip, Plus, Trash } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import {
  useRecordAccounts,
  useRecordList,
} from "../../application/records/useRecords";
import { RecordTypeIcon } from "../components/records/RecordTypeIcon";
import { ErrorAlert } from "../components/ui/ErrorAlert";
import { Notice } from "../components/ui/Notice";
import { SelectField } from "../components/ui/SelectField";
import { buttonPrimary, buttonSecondary } from "../components/ui/styles";
import { shortDate } from "../format/dates";
import { errorMessage } from "../format/errorMessage";

function accountLabel(account: RecordAccountInfo) {
  return account.role === "owner"
    ? "My records"
    : `${account.ownerName}'s records (${ACCESS_LABELS[account.role].name})`;
}

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
        <div className="grid gap-4 sm:grid-cols-3">
          {list.length > 1 && (
            <SelectField
              label="Whose records"
              value={account.ownerId}
              onChange={(value) => setFilter("owner", value)}
              options={list.map((a) => ({
                value: a.ownerId,
                label: accountLabel(a),
              }))}
            />
          )}
          <SelectField
            label="Who"
            value={person}
            onChange={(value) => setFilter("person", value)}
            options={[
              { value: "", label: "Everyone" },
              ...account.people.map((p) => ({
                value: p.profileId ?? "self",
                label: p.name,
              })),
            ]}
          />
          <SelectField
            label="Type"
            value={type}
            onChange={(value) => setFilter("type", value)}
            options={[
              { value: "", label: "All types" },
              ...RECORD_TYPES.map((t) => ({
                value: t,
                label: RECORD_TYPE_LABELS[t],
              })),
            ]}
          />
        </div>
      )}

      {account?.role === "view" && (
        <p className="text-sm text-muted">
          {account.ownerName} shared these records with you to view.
        </p>
      )}

      {records.isPending && (
        <p role="status" className="text-muted">
          Loading…
        </p>
      )}
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
        <ul className="flex flex-col divide-y divide-edge rounded-xl border border-edge bg-white">
          {records.data.records.map((record) => (
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
      )}
    </main>
  );
}
