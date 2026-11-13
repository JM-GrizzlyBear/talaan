import {
  emptyPlace,
  shownCode,
  useLabel,
  useNameLabel,
  usePlaces,
  useSavePlace,
} from "@talaan/client";
import { Redirect, Stack, useLocalSearchParams, useRouter } from "expo-router";
import { PlaceFieldsForm } from "../../src/places/PlaceFieldsForm";
import { ErrorNotice, Loading, Screen, Txt } from "../../src/ui/kit";

// What a QR label opens: a named label goes to its place; a blank one asks
// what it's stuck on
export default function Label() {
  const { code = "" } = useLocalSearchParams<{ code: string }>();
  const label = useLabel(code);
  if (label.isPending) return <Loading />;
  if (label.isError)
    return (
      <Screen>
        <Stack.Screen options={{ title: `Label ${code.toUpperCase()}` }} />
        <ErrorNotice error={label.error} />
        <Txt muted>
          A label opens only for the account it belongs to and the family it's
          shared with. Check that you're signed in to the right account.
        </Txt>
      </Screen>
    );
  if (label.data.placeId)
    return <Redirect href={`/places/${label.data.placeId}`} />;
  return <NameBlank label={label.data} />;
}

function NameBlank({
  label,
}: {
  label: NonNullable<ReturnType<typeof useLabel>["data"]>;
}) {
  const router = useRouter();
  const places = usePlaces(label.ownerId);
  const name = useNameLabel();
  const save = useSavePlace((fields) =>
    name.mutateAsync({ code: label.code, fields }),
  );
  const canChange = label.role === "owner" || label.role === "manage";
  return (
    <Screen>
      <Stack.Screen options={{ title: "Name this label" }} />
      <Txt tone="small" muted>
        Label {shownCode(label.code)}
      </Txt>
      <Txt>
        {canChange
          ? "This label is blank. Say what it's stuck on, and scanning it will open that place from now on."
          : `This label is blank. ${label.ownerName} or family who can manage the records can name it.`}
      </Txt>
      {canChange ? (
        places.isPending ? (
          <Loading />
        ) : (
          <PlaceFieldsForm
            initial={emptyPlace()}
            places={places.data?.places ?? []}
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
          />
        )
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
