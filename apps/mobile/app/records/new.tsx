import { emptyForm, useRecordAccounts } from "@talaan/client";
import { Stack, useLocalSearchParams } from "expo-router";
import { RecordForm } from "../../src/records/RecordForm";
import { ErrorNotice, Loading, Notice, Screen } from "../../src/ui/kit";

// /records/new?owner=…&person=…&place=…
export default function NewRecord() {
  const params = useLocalSearchParams<{
    owner?: string;
    person?: string;
    place?: string;
  }>();
  const accounts = useRecordAccounts();
  const title = <Stack.Screen options={{ title: "Add a record" }} />;
  if (accounts.isPending)
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
  if (!account || account.role === "view") {
    return (
      <Screen>
        {title}
        <Notice tone="error">
          You can view these records, but not add to them. Ask the owner for
          “Can manage”.
        </Notice>
      </Screen>
    );
  }
  const person = params.person && params.person !== "self" ? params.person : "";
  return (
    <>
      {title}
      <RecordForm
        account={account}
        initial={emptyForm(person, params.place ?? "")}
      />
    </>
  );
}
