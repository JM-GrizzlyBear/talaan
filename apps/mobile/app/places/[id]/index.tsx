import {
  placePhotoUrl,
  shortDateTime,
  usePlace,
  useRecordList,
  useRemovePlace,
  useRemovePlacePhoto,
  useUploadPlacePhoto,
} from "@talaan/client";
import {
  ACCESS_LABELS,
  PLACE_KIND_LABELS,
  type PlaceInfo,
} from "@talaan/shared";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  Camera,
  FilePlus,
  ImagePlus,
  Pencil,
  Plus,
  Printer,
} from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";
import {
  choosePhotos,
  type PickedFile,
  takePhoto,
} from "../../../src/files/phoneFiles";
import { downloadAndOpen } from "../../../src/files/openFile";
import { PlacePath } from "../../../src/places/PlacePath";
import {
  LabelPreview,
  PLACE_ICONS,
  PlaceList,
  placePhoto,
} from "../../../src/places/PlaceParts";
import { RECORD_ICONS } from "../../../src/records/RecordTypeIcon";
import { useTheme } from "../../../src/theme/ThemeProvider";
import { ConfirmBox } from "../../../src/ui/form";
import {
  Button,
  Buttons,
  Card,
  ErrorNotice,
  List,
  Loading,
  Notice,
  Row,
  Screen,
  Section,
  Txt,
} from "../../../src/ui/kit";
import { shortDate } from "@talaan/client";
import { RECORD_TYPE_LABELS } from "@talaan/shared";

export default function PlaceScreen() {
  const { id = "" } = useLocalSearchParams<{ id: string }>();
  const place = usePlace(id);
  if (place.isPending) return <Loading />;
  if (place.isError)
    return (
      <Screen>
        <ErrorNotice error={place.error} />
      </Screen>
    );
  return (
    <PlaceView
      place={place.data}
      onRefresh={() => void place.refetch()}
      refreshing={place.isRefetching}
    />
  );
}

function PlaceView({
  place,
  onRefresh,
  refreshing,
}: {
  place: PlaceInfo;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const t = useTheme();
  const router = useRouter();
  const { photoFailed } = useLocalSearchParams<{ photoFailed?: string }>();
  const canChange = place.role === "owner" || place.role === "manage";
  const records = useRecordList({ ownerId: place.ownerId, placeId: place.id });
  const remove = useRemovePlace();
  const [confirming, setConfirming] = useState(false);
  const Icon = PLACE_ICONS[place.kind];
  const owner = { owner: place.ownerId };
  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing}>
      <Stack.Screen options={{ title: place.name }} />
      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Icon size={16} color={t.brand} />
          <Txt tone="small" color={t.brand} bold>
            {PLACE_KIND_LABELS[place.kind]}
          </Txt>
        </View>
        <Txt tone="title">{place.name}</Txt>
        {place.path.length > 0 ? (
          <View
            style={{
              flexDirection: "row",
              gap: 4,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <Txt muted>Inside</Txt>
            <PlacePath path={place.path} />
          </View>
        ) : null}
        {place.role !== "owner" ? (
          <Txt tone="small" muted>
            {place.ownerName}'s place · You{" "}
            {ACCESS_LABELS[place.role].name.toLowerCase()}
          </Txt>
        ) : null}
      </View>
      {photoFailed && !place.hasPhoto ? (
        <Notice>
          The place was saved, but the photo couldn't be uploaded. Try adding it
          again under Photo.
        </Notice>
      ) : null}
      {canChange ? (
        <Buttons>
          <Button
            kind="secondary"
            small
            icon={Pencil}
            onPress={() => router.push(`/places/${place.id}/edit`)}
          >
            Edit
          </Button>
          <Button
            kind="secondary"
            small
            icon={FilePlus}
            onPress={() =>
              router.push({
                pathname: "/records/new",
                params: { ...owner, place: place.id },
              })
            }
          >
            Add a record here
          </Button>
          {place.path.length < 2 ? (
            <Button
              kind="secondary"
              small
              icon={Plus}
              onPress={() =>
                router.push({
                  pathname: "/places/new",
                  params: { ...owner, parent: place.id },
                })
              }
            >
              Add a place inside
            </Button>
          ) : null}
          <Button
            kind="secondary"
            small
            icon={Printer}
            onPress={() =>
              router.push({
                pathname: "/places/print",
                params: { ...owner, ids: place.id },
              })
            }
          >
            Print label
          </Button>
        </Buttons>
      ) : null}
      {place.note ? (
        <Card>
          <Txt>{place.note}</Txt>
        </Card>
      ) : null}
      <PhotoSection place={place} canChange={canChange} />
      <LabelPreview place={place} />
      {place.children.length > 0 ? (
        <Section title="Places inside">
          <PlaceList places={place.children} flat />
        </Section>
      ) : null}
      <Section title="Records kept here">
        {records.isPending ? <Loading /> : null}
        <ErrorNotice error={records.error} />
        {records.data && records.data.records.length === 0 ? (
          <Txt muted>
            None yet. When you add or edit a record, choose this place under
            “Where it's kept”.
          </Txt>
        ) : null}
        {records.data && records.data.records.length > 0 ? (
          <List>
            {records.data.records.map((r, i) => (
              <Row
                key={r.id}
                first={i === 0}
                icon={RECORD_ICONS[r.type]}
                title={r.title}
                subtitle={`${RECORD_TYPE_LABELS[r.type]} · ${r.personName}`}
                right={shortDate(r.recordDate)}
                onPress={() => router.push(`/records/${r.id}`)}
              />
            ))}
          </List>
        ) : null}
      </Section>
      <Txt tone="small" muted>
        {place.createdByName ? `Added by ${place.createdByName}. ` : ""}Last
        changed
        {place.updatedByName ? ` by ${place.updatedByName}` : ""} on{" "}
        {shortDateTime(place.updatedAt)}.
      </Txt>
      {place.role === "owner" ? (
        <View style={{ gap: 6 }}>
          <ErrorNotice error={remove.error} />
          {confirming ? (
            <ConfirmBox
              message={
                place.recordCount + place.placeCount > 0
                  ? `Remove “${place.name}”? What's inside moves to ${place.path.at(-1)?.name ?? "no place"}.`
                  : `Remove “${place.name}”?`
              }
              confirmLabel="Remove"
              busy={remove.isPending}
              onConfirm={() => {
                const parentId = place.parentId;
                remove
                  .mutateAsync(place.id)
                  .then(() =>
                    parentId
                      ? router.replace(`/places/${parentId}`)
                      : router.replace({ pathname: "/places", params: owner }),
                  )
                  .catch(() => undefined);
              }}
              onCancel={() => setConfirming(false)}
            />
          ) : (
            <Button kind="secondary" onPress={() => setConfirming(true)}>
              Remove this place
            </Button>
          )}
          <Txt tone="tiny" muted>
            Its label becomes blank: scan it later to name it again.
          </Txt>
        </View>
      ) : null}
    </Screen>
  );
}

function PhotoSection({
  place,
  canChange,
}: {
  place: PlaceInfo;
  canChange: boolean;
}) {
  const upload = useUploadPlacePhoto();
  const remove = useRemovePlacePhoto();
  const [progress, setProgress] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pickError, setPickError] = useState<unknown>(null);
  if (!place.hasPhoto && !canChange) return null;
  const send = async (
    from: () => Promise<PickedFile | PickedFile[] | null>,
  ) => {
    setPickError(null);
    try {
      const got = await from();
      const file = Array.isArray(got) ? got[0] : got;
      if (!file) return;
      setProgress(0);
      await upload.mutateAsync({ id: place.id, file, onProgress: setProgress });
    } catch (e) {
      setPickError(e);
    } finally {
      setProgress(null);
    }
  };
  const busy = progress !== null || remove.isPending;
  return (
    <Card>
      <Txt tone="heading">Photo</Txt>
      <ErrorNotice error={pickError ?? upload.error ?? remove.error} />
      {place.hasPhoto ? (
        <Pressable
          onPress={() =>
            void downloadAndOpen(
              placePhotoUrl(place.id, "original", place.updatedAt),
              `${place.name}.jpg`,
            ).catch(setPickError)
          }
          accessibilityRole="imagebutton"
          accessibilityLabel={`Where ${place.name} is. Open full size`}
        >
          <Image
            source={placePhoto(place, "preview")}
            style={{ width: "100%", aspectRatio: 4 / 3, borderRadius: 10 }}
            contentFit="cover"
            cachePolicy="disk"
          />
        </Pressable>
      ) : (
        <Txt muted>A picture of where it is makes it easy to find later.</Txt>
      )}
      {progress !== null ? (
        <Txt
          tone="small"
          muted
        >{`Uploading… ${Math.round(progress * 100)}%`}</Txt>
      ) : null}
      {canChange ? (
        <Buttons>
          <Button
            kind="secondary"
            small
            icon={Camera}
            disabled={busy}
            onPress={() => void send(takePhoto)}
          >
            {place.hasPhoto ? "Take a new photo" : "Take a photo"}
          </Button>
          <Button
            kind="secondary"
            small
            icon={ImagePlus}
            disabled={busy}
            onPress={() => void send(choosePhotos)}
          >
            {place.hasPhoto ? "Choose another" : "Choose a photo"}
          </Button>
          {place.hasPhoto && !confirming ? (
            <Button kind="link" small onPress={() => setConfirming(true)}>
              Remove photo
            </Button>
          ) : null}
        </Buttons>
      ) : null}
      {confirming ? (
        <ConfirmBox
          message="Remove the photo?"
          confirmLabel="Remove"
          busy={remove.isPending}
          onConfirm={() =>
            remove.mutate(place.id, { onSettled: () => setConfirming(false) })
          }
          onCancel={() => setConfirming(false)}
        />
      ) : null}
    </Card>
  );
}
