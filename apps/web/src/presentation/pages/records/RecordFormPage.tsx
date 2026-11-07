import type { RecordAccountInfo } from "@talaan/shared";
import { useLocation, useParams, useSearchParams } from "react-router";
import {
  useRecord,
  useRecordAccounts,
} from "../../../application/records/useRecords";
import { RecordForm } from "../../components/records/form/RecordForm";
import {
  emptyForm,
  formFromRecord,
} from "../../components/records/form/recordFormState";
import { ErrorAlert } from "../../components/ui/ErrorAlert";
import { Loading } from "../../components/ui/Loading";
import { errorMessage } from "../../format/errorMessage";

// /records/new?owner=…&person=… and /records/:id/edit
export function RecordFormPage() {
  const { id } = useParams();
  const accounts = useRecordAccounts();
  if (accounts.isPending)
    return <Loading className="p-8 text-center text-muted" />;
  if (accounts.isError)
    return <Problem message={errorMessage(accounts.error)} />;
  return id ? (
    <EditRecord id={id} accounts={accounts.data} />
  ) : (
    <NewRecord accounts={accounts.data} />
  );
}

function Problem({ message }: { message: string }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <ErrorAlert message={message} />
    </main>
  );
}

function NewRecord({ accounts }: { accounts: RecordAccountInfo[] }) {
  const [params] = useSearchParams();
  const account =
    accounts.find((a) => a.ownerId === params.get("owner")) ?? accounts[0];
  const person = params.get("person");
  if (account.role === "view") {
    return (
      <Problem message="You can view these records, but not add to them. Ask the owner for “Can manage”." />
    );
  }
  return (
    <RecordForm
      account={account}
      initial={emptyForm(person && person !== "self" ? person : "")}
    />
  );
}

function EditRecord({
  id,
  accounts,
}: {
  id: string;
  accounts: RecordAccountInfo[];
}) {
  const record = useRecord(id);
  // The record page's "Read lab values from this" sends the file along
  const readFileId = (useLocation().state as { readFile?: string } | null)
    ?.readFile;
  if (record.isPending)
    return <Loading className="p-8 text-center text-muted" />;
  if (record.isError) return <Problem message={errorMessage(record.error)} />;
  const account = accounts.find((a) => a.ownerId === record.data.ownerId);
  if (!account || record.data.role === "view") {
    return (
      <Problem message="You can view this record, but not change it. Ask the owner for “Can manage”." />
    );
  }
  return (
    <RecordForm
      account={account}
      record={record.data}
      initial={formFromRecord(record.data)}
      readFileId={readFileId}
    />
  );
}
