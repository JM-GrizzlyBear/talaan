import {
  ACCESS_LABELS,
  RECORD_TYPE_LABELS,
  type RecordInfo,
} from "@talaan/shared";
import { Link, useParams } from "react-router";
import {
  useRecord,
  useRecordHistory,
} from "../../../application/records/useRecords";
import { HistoryList } from "../../components/records/HistoryList";
import { RecordFilesSection } from "../../components/records/files/RecordFilesSection";
import { RecordTypeIcon } from "../../components/records/RecordTypeIcon";
import { LabTable } from "../../components/records/view/LabTable";
import { MedicinesList } from "../../components/records/view/MedicinesList";
import { RecordActions } from "../../components/records/view/RecordActions";
import { RecordFacts } from "../../components/records/view/RecordFacts";
import { TextSection } from "../../components/records/view/TextSection";
import { BackLink } from "../../components/ui/BackLink";
import { ErrorAlert } from "../../components/ui/ErrorAlert";
import { Loading } from "../../components/ui/Loading";
import { shortDate, shortDateTime } from "../../format/dates";
import { errorMessage } from "../../format/errorMessage";

export function RecordPage() {
  const { id = "" } = useParams();
  const record = useRecord(id);

  if (record.isPending) {
    return <Loading className="p-8 text-center text-muted" />;
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

function RecordView({ record }: { record: RecordInfo }) {
  const canManage = record.role === "owner" || record.role === "manage";
  const history = useRecordHistory(record.id);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
      <BackLink to={`/records?owner=${record.ownerId}`}>
        Back to records
      </BackLink>

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

      <RecordActions record={record} />

      <RecordFacts record={record} />

      {record.type === "lab" && record.details.results.length > 0 && (
        <LabTable record={record} />
      )}
      {record.type === "prescription" &&
        record.details.medicines.length > 0 && (
          <MedicinesList medicines={record.details.medicines} />
        )}
      {record.type === "imaging" && record.details.reading && (
        <TextSection
          id="reading-heading"
          title="Reading"
          text={record.details.reading}
        />
      )}
      {record.notes && (
        <TextSection id="notes-heading" title="Notes" text={record.notes} />
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
