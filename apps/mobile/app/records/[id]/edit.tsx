import { formFromRecord, useRecord, useRecordAccounts } from "@talaan/client";
import { Stack, useLocalSearchParams } from "expo-router";
import { RecordForm } from "../../../src/records/RecordForm";
import { ErrorNotice, Loading, Notice, Screen } from "../../../src/ui/kit";

// Editing a record (the owner and "Can manage" family)
export default function EditRecord() {
  const { id = "", readFile } = useLocalSearchParams<{
    id: string;
    readFile?: string;
  }>();
  const accounts = useRecordAccounts();
  const record = useRecord(id);
  const title = <Stack.Screen options={{ title: "Edit record" }} />;
  if (accounts.isPending || record.isPending)
    return (
      <>
        {title}
        <Loading />
      </>
    );
  if (accounts.isError || record.isError)
    return (
      <Screen>
        {title}
        <ErrorNotice error={accounts.error ?? record.error} />
      </Screen>
    );
  const account = accounts.data.find((a) => a.ownerId === record.data.ownerId);
  if (!account || record.data.role === "view") {
    return (
      <Screen>
        {title}
        <Notice tone="error">
          You can view this record, but not change it. Ask the owner for “Can
          manage”.
        </Notice>
      </Screen>
    );
  }
  return (
    <>
      {title}
      <RecordForm
        account={account}
        record={record.data}
        initial={formFromRecord(record.data)}
        readFileId={readFile}
      />
    </>
  );
}
