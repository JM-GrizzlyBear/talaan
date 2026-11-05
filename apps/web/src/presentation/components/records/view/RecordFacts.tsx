import { formatPesos, type RecordInfo } from "@talaan/shared";
import { shortDate } from "../../../format/dates";

// Amounts like ₱45,210.50, or a dash when there's none
const peso = (value: number | null) => formatPesos(value) ?? "—";

function Fact({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex flex-col">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="font-medium break-words">{value}</dd>
    </div>
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

// The box of facts at the top of a record
export function RecordFacts({ record }: { record: RecordInfo }) {
  return (
    <dl className="grid gap-4 rounded-xl border border-edge bg-white p-4 sm:grid-cols-2">
      <Fact label="For" value={record.personName} />
      <Fact label="Date" value={shortDate(record.recordDate)} />
      <Fact label="Doctor" value={record.doctor} />
      <Fact label="Clinic or hospital" value={record.facility} />
      <Details record={record} />
    </dl>
  );
}
