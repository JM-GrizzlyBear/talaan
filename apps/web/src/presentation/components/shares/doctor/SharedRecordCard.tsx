import { RECORD_TYPE_LABELS, type SharedRecordInfo } from "@talaan/shared";
import { shortDate } from "../../../format/dates";
import { RecordTypeIcon } from "../../records/RecordTypeIcon";
import { LabTable } from "../../records/view/LabTable";
import { MedicinesList } from "../../records/view/MedicinesList";
import { RecordFacts } from "../../records/view/RecordFacts";
import { TextSection } from "../../records/view/TextSection";
import { SharedFiles } from "./SharedFiles";

// One record on the doctor's page, the way the family sees it
export function SharedRecordCard({
  token,
  record,
}: {
  token: string;
  record: SharedRecordInfo;
}) {
  return (
    <article
      id={`record-${record.id}`}
      aria-labelledby={`record-${record.id}-title`}
      className="flex scroll-mt-4 flex-col gap-4 rounded-2xl border border-edge bg-page p-4 break-inside-avoid-page"
    >
      <header className="flex flex-col gap-1">
        <span className="flex items-center gap-2 text-sm font-semibold text-brand">
          <RecordTypeIcon type={record.type} className="size-4" />
          {RECORD_TYPE_LABELS[record.type]}
        </span>
        <h3
          id={`record-${record.id}-title`}
          className="text-xl font-bold break-words"
        >
          {record.title}
        </h3>
        <p className="text-sm text-muted">{shortDate(record.recordDate)}</p>
      </header>
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
          id={`reading-${record.id}`}
          title="Reading"
          text={record.details.reading}
        />
      )}
      {record.notes && (
        <TextSection
          id={`notes-${record.id}`}
          title="Notes"
          text={record.notes}
        />
      )}
      {record.files.length > 0 && (
        <section className="flex flex-col gap-2">
          <h4 className="font-bold">Photos and PDFs ({record.files.length})</h4>
          <SharedFiles token={token} files={record.files} />
        </section>
      )}
    </article>
  );
}
