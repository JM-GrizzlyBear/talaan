import {
  PLACE_LIMITS,
  type PlaceFieldsInput,
  type PlaceSummary,
} from "@talaan/shared";
import { type FormEvent, type ReactNode, useState } from "react";
import { errorMessage, fieldError } from "../../format/errorMessage";
import { ErrorAlert } from "../ui/ErrorAlert";
import { SelectField } from "../ui/SelectField";
import { TextAreaField } from "../ui/TextAreaField";
import { TextField } from "../ui/TextField";
import { buttonPrimary } from "../ui/styles";
import { KindPicker } from "./KindPicker";
import { PhotoPicker } from "./PhotoPicker";
import { type PlaceFormValues, insideOptions } from "@talaan/client";

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
  // The account's places, for "Inside"
  places: PlaceSummary[];
  // Editing: this place (it can't go inside itself)
  movingId: string | null;
  withPhoto: boolean;
  submitLabel: string;
  pending: boolean;
  error: unknown;
  onSubmit: (fields: PlaceFieldsInput, photo: File | null) => void;
  extraButtons?: ReactNode;
}) {
  const [form, setForm] = useState(initial);
  const [photo, setPhoto] = useState<File | null>(null);
  const [kindMissing, setKindMissing] = useState(false);
  const set = <K extends keyof PlaceFormValues>(
    key: K,
    value: PlaceFormValues[K],
  ) => setForm((f) => ({ ...f, [key]: value }));

  const options = insideOptions(places, movingId);
  // Keep the current parent listed even if it no longer fits (it's saved as is)
  const current = places.find((p) => p.id === form.parentId);
  if (current && !options.some((o) => o.value === current.id)) {
    options.unshift({ value: current.id, label: current.name });
  }

  function submit(event: FormEvent) {
    event.preventDefault();
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
  }

  const hasFieldErrors = ["kind", "name", "note", "parentId"].some((key) =>
    fieldError(error, key),
  );

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      {Boolean(error) && (
        <ErrorAlert
          message={
            hasFieldErrors
              ? "Please check the boxes marked in red."
              : errorMessage(error)
          }
        />
      )}
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
      <TextField
        label="Name"
        value={form.name}
        onChange={(v) => set("name", v)}
        placeholder="Blue box, Lola's X-rays, Bedroom drawer…"
        maxLength={PLACE_LIMITS.name}
        error={fieldError(error, "name")}
      />
      <SelectField
        label="Inside"
        value={form.parentId}
        onChange={(v) => set("parentId", v)}
        options={[{ value: "", label: "Not inside another place" }, ...options]}
        error={fieldError(error, "parentId")}
      />
      <TextAreaField
        label="Note (optional)"
        value={form.note}
        onChange={(v) => set("note", v)}
        placeholder="Top shelf of the aparador, behind the albums"
        maxLength={PLACE_LIMITS.note}
        error={fieldError(error, "note")}
      />
      {withPhoto && <PhotoPicker file={photo} onChange={setPhoto} />}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending} className={buttonPrimary}>
          {pending ? "Saving…" : submitLabel}
        </button>
        {extraButtons}
      </div>
    </form>
  );
}
