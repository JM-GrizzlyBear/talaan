import { usePlace, usePlaces, useUpdatePlace } from "@talaan/client";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { PlaceFieldsForm } from "../../../src/places/PlaceFieldsForm";
import {
  Button,
  ErrorNotice,
  Loading,
  Notice,
  Screen,
  Txt,
} from "../../../src/ui/kit";

export default function EditPlace() {
  const router = useRouter();
  const { id = "" } = useLocalSearchParams<{ id: string }>();
  const place = usePlace(id);
  const places = usePlaces(place.data?.ownerId);
  const update = useUpdatePlace();
  return (
    <Screen>
      <Stack.Screen options={{ title: "Edit place" }} />
      {place.isPending || places.isPending ? <Loading /> : null}
      <ErrorNotice error={place.error} />
      {place.data?.role === "view" ? (
        <Notice tone="error">
          You can view these places, but not change them. Ask the owner for “Can
          manage”.
        </Notice>
      ) : null}
      {place.data && place.data.role !== "view" && places.data ? (
        <>
          <Txt tone="small" muted>
            Change the photo on the place's page.
          </Txt>
          <PlaceFieldsForm
            initial={{
              kind: place.data.kind,
              name: place.data.name,
              note: place.data.note,
              parentId: place.data.parentId ?? "",
            }}
            places={places.data.places}
            movingId={place.data.id}
            withPhoto={false}
            submitLabel="Save changes"
            pending={update.isPending}
            error={update.error}
            onSubmit={(fields) =>
              update.mutate({ id, fields }, { onSuccess: () => router.back() })
            }
            extraButtons={
              <Button kind="secondary" onPress={() => router.back()}>
                Cancel
              </Button>
            }
          />
        </>
      ) : null}
    </Screen>
  );
}
