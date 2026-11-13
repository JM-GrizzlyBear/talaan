import {
  formFromReminder,
  useRecordAccounts,
  useReminder,
} from "@talaan/client";
import { Stack, useLocalSearchParams } from "expo-router";
import { ReminderForm } from "../../../src/reminders/ReminderForm";
import { ErrorNotice, Loading, Notice, Screen } from "../../../src/ui/kit";

export default function EditReminder() {
  const { id = "" } = useLocalSearchParams<{ id: string }>();
  const accounts = useRecordAccounts();
  const reminder = useReminder(id);
  const title = <Stack.Screen options={{ title: "Edit reminder" }} />;
  if (accounts.isPending || reminder.isPending)
    return (
      <>
        {title}
        <Loading />
      </>
    );
  if (accounts.isError || reminder.isError)
    return (
      <Screen>
        {title}
        <ErrorNotice error={accounts.error ?? reminder.error} />
      </Screen>
    );
  const account = accounts.data.find(
    (a) => a.ownerId === reminder.data.ownerId,
  );
  if (!account || reminder.data.role === "view")
    return (
      <Screen>
        {title}
        <Notice tone="error">
          You can view these reminders, but not change them. Ask the owner for
          “Can manage”.
        </Notice>
      </Screen>
    );
  return (
    <>
      {title}
      <ReminderForm
        account={account}
        reminder={reminder.data}
        initial={formFromReminder(reminder.data)}
        recordTitle={reminder.data.recordTitle}
      />
    </>
  );
}
