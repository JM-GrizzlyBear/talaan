import type { RecordAccountInfo, ReminderInfo } from "@talaan/shared";
import { useParams, useSearchParams } from "react-router";
import {
  useRecord,
  useRecordAccounts,
} from "../../../application/records/useRecords";
import { useReminder } from "../../../application/reminders/useReminders";
import { ReminderForm } from "../../components/reminders/form/ReminderForm";
import {
  emptyReminder,
  formFromReminder,
  newReminderToday,
} from "../../components/reminders/form/reminderFormState";
import { BackLink } from "../../components/ui/BackLink";
import { ErrorAlert } from "../../components/ui/ErrorAlert";
import { Loading } from "../../components/ui/Loading";
import { errorMessage } from "../../format/errorMessage";

const VIEW_ONLY =
  "You can view these reminders, but not change them. Ask the owner for “Can manage”.";

function Problem({ message }: { message: string }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <ErrorAlert message={message} />
    </main>
  );
}

// /reminders/new?owner=…&person=…&record=… and /reminders/:id/edit
export function ReminderFormPage() {
  const { id } = useParams();
  const accounts = useRecordAccounts();
  if (accounts.isPending)
    return <Loading className="p-8 text-center text-muted" />;
  if (accounts.isError)
    return <Problem message={errorMessage(accounts.error)} />;
  return id ? (
    <EditReminder id={id} accounts={accounts.data} />
  ) : (
    <NewReminder accounts={accounts.data} />
  );
}

function NewReminder({ accounts }: { accounts: RecordAccountInfo[] }) {
  const [params] = useSearchParams();
  const account =
    accounts.find((a) => a.ownerId === params.get("owner")) ?? accounts[0];
  const recordId = params.get("record") ?? "";
  const record = useRecord(recordId);
  const person = params.get("person") ?? record.data?.profileId ?? "";
  if (account.role === "view") return <Problem message={VIEW_ONLY} />;
  if (recordId && record.isPending) {
    return <Loading className="p-8 text-center text-muted" />;
  }
  const back = recordId
    ? `/records/${recordId}`
    : `/reminders?owner=${account.ownerId}`;
  return (
    <Layout title="Add a reminder" back={back} account={account}>
      <ReminderForm
        account={account}
        initial={emptyReminder(newReminderToday(), person, recordId)}
        recordTitle={record.data?.title ?? null}
        backTo={back}
      />
    </Layout>
  );
}

function EditReminder({
  id,
  accounts,
}: {
  id: string;
  accounts: RecordAccountInfo[];
}) {
  const reminder = useReminder(id);
  if (reminder.isPending)
    return <Loading className="p-8 text-center text-muted" />;
  if (reminder.isError)
    return <Problem message={errorMessage(reminder.error)} />;
  const account = accounts.find((a) => a.ownerId === reminder.data.ownerId);
  if (!account || reminder.data.role === "view") {
    return <Problem message={VIEW_ONLY} />;
  }
  return <EditForm reminder={reminder.data} account={account} />;
}

function EditForm({
  reminder,
  account,
}: {
  reminder: ReminderInfo;
  account: RecordAccountInfo;
}) {
  const back = `/reminders/${reminder.id}`;
  return (
    <Layout title="Edit reminder" back={back} account={account}>
      <ReminderForm
        account={account}
        reminder={reminder}
        initial={formFromReminder(reminder)}
        recordTitle={reminder.recordTitle}
        backTo={back}
      />
    </Layout>
  );
}

function Layout({
  title,
  back,
  account,
  children,
}: {
  title: string;
  back: string;
  account: RecordAccountInfo;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
      <BackLink to={back}>Back</BackLink>
      <h1 className="text-3xl font-bold">
        {title}
        {account.role !== "owner" && (
          <span className="text-lg font-normal text-muted">
            {" "}
            · {account.ownerName}'s reminders
          </span>
        )}
      </h1>
      {children}
    </main>
  );
}
