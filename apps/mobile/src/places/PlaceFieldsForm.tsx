import { insideOptions, type PlaceFormValues } from "@talaan/client";
import {
  PLACE_LIMITS,
  type PlaceFieldsInput,
  type PlaceSummary,
} from "@talaan/shared";
import { Image } from "expo-image";
import { Camera, ImagePlus, X } from "lucide-react-native";
import { type ReactNode, useState } from "react";
import { View } from "react-native";
import { fieldError, messageOf } from "../api/ApiError";
import { choosePhotos, type PickedFile, takePhoto } from "../files/phoneFiles";
import { Field, Select } from "../ui/form";
import { Button, Buttons, ErrorNotice, Notice, Txt } from "../ui/kit";
import { KindPicker } from "./PlaceParts";

// Adding, editing, or naming a blank label: kind, name, inside what, note,
// and for a new place an optional photo
export function PlaceFieldsForm({
  initial,
  places,
  movingId,
  withPhoto,
  submitLabel,
  pending,
  error,
  onSubmit,
  extraButtons,
}: {
  initial: PlaceFormValues;
  places: PlaceSummary[];
  movingId: string | null;
  withPhoto: boolean;
  submitLabel: string;
  pending: boolean;
  error: unknown;
  onSubmit: (fields: PlaceFieldsInput, photo: PickedFile | null) => void;
  extraButtons?: ReactNode;
}) {
  const [form, setForm] = useState(initial);
  const [photo, setPhoto] = useState<PickedFile | null>(null);
  const [kindMissing, setKindMissing] = useState(false);
  const [pickError, setPickError] = useState<unknown>(null);
  const set = <K extends keyof PlaceFormValues>(
    key: K,
    value: PlaceFormValues[K],
  ) => setForm((f) => ({ ...f, [key]: value }));
  const options = insideOptions(places, movingId);
  const current = places.find((p) => p.id === form.parentId);
  if (current && !options.some((o) => o.value === current.id))
    options.unshift({ value: current.id, label: current.name });
  const hasFieldErrors = ["kind", "name", "note", "parentId"].some((key) =>
    fieldError(error, key),
  );

  const submit = () => {
    if (!form.kind) {
      setKindMissing(true);
      return;
    }
    onSubmit(
      {
        kind: form.kind,
        name: form.name,
        note: form.note,
        parentId: form.parentId || null,
      },
      photo,
    );
  };

  const pick = async (
    from: () => Promise<PickedFile | PickedFile[] | null>,
  ) => {
    setPickError(null);
    try {
      const got = await from();
      const one = Array.isArray(got) ? got[0] : got;
      if (one) setPhoto(one);
    } catch (e) {
      setPickError(e);
    }
  };

  return (
    <View style={{ gap: 16 }}>
      {error ? (
        <Notice tone="error">
          {hasFieldErrors
            ? "Please check the boxes marked in red."
            : messageOf(error)}
        </Notice>
      ) : null}
      <KindPicker
        value={form.kind}
        onChange={(kind) => {
          set("kind", kind);
          setKindMissing(false);
        }}
        error={
          kindMissing
            ? "Choose what kind of place it is"
            : fieldError(error, "kind")
        }
      />
      <Field
        label="Name"
        value={form.name}
        onChangeText={(v) => set("name", v)}
        placeholder="Blue box, Lola's X-rays, Bedroom drawer…"
        maxLength={PLACE_LIMITS.name}
        error={fieldError(error, "name")}
      />
      <Select
        label="Inside"
        value={form.parentId}
        onChange={(v) => set("parentId", v)}
        options={[{ value: "", label: "Not inside another place" }, ...options]}
        error={fieldError(error, "parentId")}
      />
      <Field
        label="Note (optional)"
        value={form.note}
        onChangeText={(v) => set("note", v)}
        multiline
        placeholder="Top shelf of the aparador, behind the albums"
        maxLength={PLACE_LIMITS.note}
        error={fieldError(error, "note")}
      />
      {withPhoto ? (
        <View style={{ gap: 8 }}>
          <Txt tone="label">Photo of where it is (optional)</Txt>
          <Txt tone="small" muted>
            A picture of the box, drawer or shelf makes it easy to find later.
          </Txt>
          <ErrorNotice error={pickError} />
          {photo ? (
            <View
              style={{ flexDirection: "row", gap: 10, alignItems: "center" }}
            >
              <Image
                source={{ uri: photo.uri }}
                style={{ width: 96, height: 96, borderRadius: 10 }}
                accessibilityLabel="The chosen photo"
              />
              <Button kind="link" small icon={X} onPress={() => setPhoto(null)}>
                Don't add it
              </Button>
            </View>
          ) : (
            <Buttons>
              <Button
                kind="secondary"
                small
                icon={Camera}
                onPress={() => void pick(takePhoto)}
              >
                Take a photo
              </Button>
              <Button
                kind="secondary"
                small
                icon={ImagePlus}
                onPress={() => void pick(choosePhotos)}
              >
                Choose a photo
              </Button>
            </Buttons>
          )}
        </View>
      ) : null}
      {kindMissing || hasFieldErrors ? (
        <Notice tone="error">
          {kindMissing
            ? "Choose what kind of place it is, at the top."
            : "Please check the boxes marked in red above."}
        </Notice>
      ) : null}
      <Buttons>
        <Button busy={pending} onPress={submit}>
          {pending ? "Saving…" : submitLabel}
        </Button>
        {extraButtons}
      </Buttons>
    </View>
  );
}
