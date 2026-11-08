import { ScanText } from "lucide-react";
import { useState } from "react";
import { useRecordFiles } from "../../../../application/records/useRecordFiles";
import { Notice } from "../../ui/Notice";
import { buttonSecondary } from "../../ui/styles";
import { ReadLabDialog } from "../reader/ReadLabDialog";
import type { LabRow } from "./recordFormState";

// "Read from a photo or PDF": fills lab rows from the printout, read on this device
export function ReadFromPrintout({
  recordId,
  readFileId,
  onAdd,
}: {
  // Editing: the record's attached files can be read too
  recordId?: string;
  // Open straight away on this attached file (from the record page)
  readFileId?: string;
  onAdd: (rows: LabRow[]) => void;
}) {
  const files = useRecordFiles(recordId);
  const [reading, setReading] = useState(Boolean(readFileId));
  const [added, setAdded] = useState<number | null>(null);
  // Wait for the file list before opening on a chosen file
  const ready = !readFileId || files.isSuccess;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setAdded(null);
          setReading(true);
        }}
        className={`${buttonSecondary} self-start`}
      >
        <ScanText aria-hidden="true" className="size-4" />
        Read from a photo or PDF
      </button>
      {added !== null && (
        <Notice>
          Added {added} {added === 1 ? "result" : "results"} from the printout.
          Check them below, then save.
        </Notice>
      )}
      {reading && ready && (
        <ReadLabDialog
          attached={files.data ?? []}
          startWith={files.data?.find((f) => f.id === readFileId)}
          onClose={() => setReading(false)}
          onAdd={(rows) => {
            onAdd(rows);
            setAdded(rows.length);
            setReading(false);
          }}
        />
      )}
    </>
  );
}
