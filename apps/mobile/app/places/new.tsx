import {
  emptyPlace,
  useCreatePlace,
  usePlaces,
  useRecordAccounts,
  useSavePlace,
} from "@talaan/client";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { PlaceFieldsForm } from "../../src/places/PlaceFieldsForm";
import {
  Button,
  ErrorNotice,
  Loading,
  Notice,
  Screen,
  Txt,
} from "../../src/ui/kit";

// /places/new?owner=…&parent=…
export default function NewPlace() {
  const router = useRouter();
  const params = useLocalSearchParams<{ owner?: string; parent?: string }>();
  const accounts = useRecordAccounts();
  const account =
    accounts.data?.find((a) => a.ownerId === params.owner) ??
    accounts.data?.[0];
  const places = usePlaces(account?.ownerId);
  const create = useCreatePlace();
  const save = useSavePlace((fields) =>
    create.mutateAsync({ ownerId: account!.ownerId, fields }),
  );
  return (
    <Screen>
      <Stack.Screen options={{ title: "Add a place" }} />
      {accounts.isPending || places.isPending ? <Loading /> : null}
      <ErrorNotice error={accounts.error} />
      {account && account.role === "view" ? (
        <Notice tone="error">
          You can view these places, but not change them. Ask the owner for “Can
          manage”.
        </Notice>
      ) : null}
      {account && account.role !== "owner" && account.role !== "view" ? (
        <Txt muted>{account.ownerName}'s places</Txt>
      ) : null}
      {account && account.role !== "view" && places.data ? (
        <PlaceFieldsForm
          initial={emptyPlace(params.parent ?? "")}
          places={places.data.places}
          movingId={null}
          withPhoto
          submitLabel="Save place"
          pending={save.pending}
          error={save.error}
          onSubmit={async (fields, photo) => {
            const saved = await save.run(fields, photo);
            if (saved)
              router.replace({
                pathname: "/places/[id]",
                params: {
                  id: saved.place.id,
                  ...(saved.photoFailed ? { photoFailed: "1" } : {}),
                },
              });
          }}
          extraButtons={
            <Button kind="secondary" onPress={() => router.back()}>
              Cancel
            </Button>
          }
        />
      ) : null}
      {save.progress !== null ? (
        <Txt
          tone="small"
          muted
        >{`Uploading the photo… ${Math.round(save.progress * 100)}%`}</Txt>
      ) : null}
    </Screen>
  );
}
