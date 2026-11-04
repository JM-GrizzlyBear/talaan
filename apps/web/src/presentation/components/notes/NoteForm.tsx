import { NOTE_LIMITS, type NoteInput } from "@pern/shared";
import { useState, type FormEvent } from "react";
import { errorMessage, fieldError } from "../../format/errorMessage";
import { ErrorAlert } from "../ui/ErrorAlert";
import { TextAreaField } from "../ui/TextAreaField";
import { TextField } from "../ui/TextField";
import { buttonPrimary, buttonSecondary } from "../ui/styles";

// Used to create a note and to edit one
export function NoteForm({
  initial = { title: "", body: "" },
  submitLabel,
  pending,
  error,
  onSubmit,
  onCancel,
}: {
  initial?: { title: string; body: string };
  submitLabel: string;
  pending: boolean;
  error: unknown;
  // Resolves when saved; the form then clears itself (for a new note)
  onSubmit: (input: NoteInput) => Promise<void>;
  onCancel?: () => void;
}) {
  const [title, setTitle] = useState(initial.title);
  const [body, setBody] = useState(initial.body);
  const [missingTitle, setMissingTitle] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (title.trim() === "") {
      setMissingTitle(true);
      return;
    }
    setMissingTitle(false);
    try {
      await onSubmit({ title, body });
      if (!onCancel) {
        setTitle("");
        setBody("");
      }
    } catch {
      // Shown below from `error`
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {error !== null && error !== undefined && (
        <ErrorAlert message={errorMessage(error)} />
      )}
      <TextField
        label="Title"
        value={title}
        onChange={setTitle}
        maxLength={NOTE_LIMITS.titleMax}
        error={missingTitle ? "Required" : fieldError(error, "title")}
      />
      <TextAreaField
        label="Note"
        value={body}
        onChange={setBody}
        maxLength={NOTE_LIMITS.bodyMax}
        error={fieldError(error, "body")}
      />
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending} className={buttonPrimary}>
          {pending ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className={buttonSecondary}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
