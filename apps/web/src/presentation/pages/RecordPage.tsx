import {
  ACCESS_LABELS,
  RECORD_TYPE_LABELS,
  formatRange,
  labFlag,
  type RecordInfo,
} from "@talaan/shared";
import { ArrowLeft, Pencil, Trash } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  useMoveToTrash,
  useRecord,
  useRecordHistory,
} from "../../application/records/useRecords";
import { HistoryList } from "../components/records/HistoryList";
import { RecordFilesSection } from "../components/records/RecordFilesSection";
import { RecordTypeIcon } from "../components/records/RecordTypeIcon";
import { ErrorAlert } from "../components/ui/ErrorAlert";
import { buttonDanger, buttonSecondary } from "../components/ui/styles";
import { shortDate, shortDateTime } from "../format/dates";
import { errorMessage } from "../format/errorMessage";

const peso = (value: number | null) =>
  value === null
    ? "—"
    : `₱${value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function RecordPage() {
  const { id = "" } = useParams();
  const record = useRecord(id);

  if (record.isPending) {
    return (
      <p role="status" className="p-8 text-center text-muted">
        Loading…
      </p>
    );
  }
  if (record.isError) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-10">
        <ErrorAlert message={errorMessage(record.error)} />
        <Link to="/records" className="font-semibold text-brand underline">
          Back to records
        </Link>
      </main>
    );
  }
  return <RecordView record={record.data} />;
}

function Fact({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex flex-col">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="font-medium break-words">{value}</dd>
    </div>
  );
}

function RecordView({ record }: { record: RecordInfo }) {
  const canManage = record.role === "owner" || record.role === "manage";
  const trash = useMoveToTrash();
  const history = useRecordHistory(record.id);
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
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
      <Link
        to={`/records?owner=${record.ownerId}`}
        className="flex items-center gap-1 text-sm font-semibold text-brand"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to records
      </Link>

      <header className="flex flex-col gap-2">
        <span className="flex items-center gap-2 text-sm font-semibold text-brand">
          <RecordTypeIcon type={record.type} className="size-4" />
          {RECORD_TYPE_LABELS[record.type]}
        </span>
        <h1 className="text-3xl font-bold break-words">{record.title}</h1>
        <p className="text-muted">
          {record.personName} · {shortDate(record.recordDate)}
          {record.role !== "owner" &&
            ` · You ${ACCESS_LABELS[record.role].name.toLowerCase()}`}
        </p>
      </header>

      {canManage && (
        <div className="flex flex-wrap gap-2">
          <Link to={`/records/${record.id}/edit`} className={buttonSecondary}>
            <Pencil aria-hidden="true" className="size-4" />
            Edit
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

      <dl className="grid gap-4 rounded-xl border border-edge bg-white p-4 sm:grid-cols-2">
        <Fact label="For" value={record.personName} />
        <Fact label="Date" value={shortDate(record.recordDate)} />
        <Fact label="Doctor" value={record.doctor} />
        <Fact label="Clinic or hospital" value={record.facility} />
        <Details record={record} />
      </dl>

      {record.type === "lab" && record.details.results.length > 0 && (
        <LabTable record={record} />
      )}
      {record.type === "prescription" &&
        record.details.medicines.length > 0 && (
          <section
            aria-labelledby="medicines-heading"
            className="flex flex-col gap-2"
          >
            <h2 id="medicines-heading" className="text-lg font-bold">
              Medicines
            </h2>
            <ul className="flex flex-col divide-y divide-edge rounded-xl border border-edge bg-white">
              {record.details.medicines.map((m, index) => (
                <li key={index} className="flex flex-col px-4 py-3">
                  <strong>{m.name}</strong>
                  <span className="text-sm text-muted">
                    {[m.dose, m.frequency].filter(Boolean).join(" · ") ||
                      "No dose written"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      {record.type === "imaging" && record.details.reading && (
        <section
          aria-labelledby="reading-heading"
          className="flex flex-col gap-2"
        >
          <h2 id="reading-heading" className="text-lg font-bold">
            Reading
          </h2>
          <p className="rounded-xl border border-edge bg-white p-4 whitespace-pre-wrap">
            {record.details.reading}
          </p>
        </section>
      )}
      {record.notes && (
        <section
          aria-labelledby="notes-heading"
          className="flex flex-col gap-2"
        >
          <h2 id="notes-heading" className="text-lg font-bold">
            Notes
          </h2>
          <p className="rounded-xl border border-edge bg-white p-4 whitespace-pre-wrap">
            {record.notes}
          </p>
        </section>
      )}

      <RecordFilesSection recordId={record.id} canChange={canManage} />

      <p className="text-sm text-muted">
        Added{record.createdByName ? ` by ${record.createdByName}` : ""} on{" "}
        {shortDateTime(record.createdAt)}
        {record.updatedAt !== record.createdAt &&
          `. Last changed${record.updatedByName ? ` by ${record.updatedByName}` : ""} on ${shortDateTime(record.updatedAt)}`}
        .
      </p>

      <section
        aria-labelledby="history-heading"
        className="flex flex-col gap-2"
      >
        <h2 id="history-heading" className="text-lg font-bold">
          History
        </h2>
        {history.isError && (
          <ErrorAlert message={errorMessage(history.error)} />
        )}
        {history.data && <HistoryList entries={history.data} />}
      </section>
    </main>
  );
}

function Details({ record }: { record: RecordInfo }) {
  switch (record.type) {
    case "imaging":
      return <Fact label="What was imaged" value={record.details.bodyPart} />;
    case "vaccination":
      return (
        <>
          <Fact label="Vaccine" value={record.details.vaccine} />
          <Fact label="Dose" value={record.details.dose} />
        </>
      );
    case "billing":
      return (
        <>
          <Fact label="HMO" value={record.details.hmo} />
          <Fact
            label="LOA / approval number"
            value={record.details.loaNumber}
          />
          <Fact label="Total bill" value={peso(record.details.totalAmount)} />
          <Fact label="HMO covered" value={peso(record.details.hmoCovered)} />
          <Fact label="You paid" value={peso(record.details.youPaid)} />
        </>
      );
    default:
      return null;
  }
}

function LabTable({ record }: { record: RecordInfo & { type: "lab" } }) {
  return (
    <section aria-labelledby="results-heading" className="flex flex-col gap-2">
      <h2 id="results-heading" className="text-lg font-bold">
        Results
      </h2>
      <div className="overflow-x-auto rounded-xl border border-edge bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-edge bg-page text-muted">
            <tr>
              <th scope="col" className="px-4 py-2 font-semibold">
                Test
              </th>
              <th scope="col" className="px-4 py-2 font-semibold">
                Result
              </th>
              <th scope="col" className="px-4 py-2 font-semibold">
                Normal
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-edge">
            {record.details.results.map((row, index) => {
              const flag = labFlag(row);
              return (
                <tr key={index} className={flag ? "bg-danger-soft/60" : ""}>
                  <th scope="row" className="px-4 py-2.5 font-medium">
                    {row.name}
                  </th>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <span className={flag ? "font-bold text-danger" : ""}>
                      {row.value}
                    </span>{" "}
                    <span className="text-muted">{row.unit}</span>
                    {flag && (
                      <span className="ml-2 rounded-full bg-danger-soft px-2 py-0.5 text-xs font-bold text-danger">
                        {flag === "low" ? "Low" : "High"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-muted">
                    {formatRange(row) || "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
