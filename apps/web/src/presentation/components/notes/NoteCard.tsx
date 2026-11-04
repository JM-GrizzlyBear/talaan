import type { Note } from "@pern/shared";
import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  useDeleteNote,
  useUpdateNote,
} from "../../../application/notes/useNotes";
import { shortDateTime, wasEdited } from "../../format/dates";
import { errorMessage } from "../../format/errorMessage";
import { ErrorAlert } from "../ui/ErrorAlert";
import { buttonDanger, buttonSecondary } from "../ui/styles";
import { NoteForm } from "./NoteForm";

export function NoteCard({ note }: { note: Note }) {
  const [mode, setMode] = useState<"view" | "edit" | "confirmDelete">("view");
  const update = useUpdateNote();
  const remove = useDeleteNote();

  if (mode === "edit") {
    return (
      <li className="rounded-xl border border-edge bg-white p-5">
        <NoteForm
          initial={note}
          submitLabel="Save"
          pending={update.isPending}
          error={update.error}
          onSubmit={async (input) => {
            await update.mutateAsync({ id: note.id, input });
            setMode("view");
          }}
          onCancel={() => {
            update.reset();
            setMode("view");
          }}
        />
      </li>
    );
  }

  return (
    <li className="rounded-xl border border-edge bg-white p-5">
      <h3 className="text-lg font-semibold break-words">{note.title}</h3>
      {note.body && (
        <p className="mt-2 break-words whitespace-pre-line text-gray-800">
          {note.body}
        </p>
      )}
      <p className="mt-3 text-sm text-muted">
        {shortDateTime(note.updatedAt)}
        {wasEdited(note) && " · edited"}
      </p>

      {remove.isError && (
        <div className="mt-3">
          <ErrorAlert message={errorMessage(remove.error)} />
        </div>
      )}

      {mode === "confirmDelete" ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="font-medium">Delete this note?</span>
          <button
            type="button"
            disabled={remove.isPending}
            onClick={() => remove.mutate(note.id)}
            className={buttonDanger}
          >
            {remove.isPending ? "Deleting…" : "Yes, delete"}
          </button>
          <button
            type="button"
            onClick={() => setMode("view")}
            className={buttonSecondary}
          >
            Keep it
          </button>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMode("edit")}
            className={buttonSecondary}
          >
            <Pencil aria-hidden="true" className="size-4" />
            Edit
          </button>
          <button
            type="button"
            onClick={() => setMode("confirmDelete")}
            className={buttonSecondary}
          >
            <Trash2 aria-hidden="true" className="size-4" />
            Delete
          </button>
        </div>
      )}
    </li>
  );
}
