import {
  emptyReminder,
  newReminderToday,
  useRecord,
  useRecordAccounts,
} from "@talaan/client";
import { Stack, useLocalSearchParams } from "expo-router";
import { ReminderForm } from "../../src/reminders/ReminderForm";
import { ErrorNotice, Loading, Notice, Screen } from "../../src/ui/kit";

// /reminders/new?owner=…&person=…&record=…
export default function NewReminder() {
  const params = useLocalSearchParams<{
    owner?: string;
    person?: string;
    record?: string;
  }>();
  const accounts = useRecordAccounts();
  const record = useRecord(params.record ?? "");
  const title = <Stack.Screen options={{ title: "Add a reminder" }} />;
  if (accounts.isPending || (params.record && record.isPending))
    return (
      <>
        {title}
        <Loading />
      </>
    );
  if (accounts.isError)
    return (
      <Screen>
        {title}
        <ErrorNotice error={accounts.error} />
      </Screen>
    );
  const account =
    accounts.data.find((a) => a.ownerId === params.owner) ?? accounts.data[0];
  if (!account || account.role === "view")
    return (
      <Screen>
        {title}
        <Notice tone="error">
          You can view these reminders, but not change them. Ask the owner for
          “Can manage”.
        </Notice>
      </Screen>
    );
  const person = params.person ?? record.data?.profileId ?? "";
  return (
    <>
      {title}
      <ReminderForm
        account={account}
        initial={emptyReminder(
          newReminderToday(),
          person === "self" ? "" : person,
          params.record ?? "",
        )}
        recordTitle={record.data?.title ?? null}
      />
    </>
  );
}
