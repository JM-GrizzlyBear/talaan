import { useCreateNote, useNotes } from "../../application/notes/useNotes";
import { NoteCard } from "../components/notes/NoteCard";
import { NoteForm } from "../components/notes/NoteForm";
import { ErrorAlert } from "../components/ui/ErrorAlert";
import { buttonSecondary } from "../components/ui/styles";
import { errorMessage } from "../format/errorMessage";

// The example CRUD page: create, list, edit and delete your own notes
export function NotesPage() {
  const notes = useNotes();
  const create = useCreateNote();

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-bold">Notes</h1>

      <section
        aria-labelledby="new-note"
        className="mt-6 rounded-xl border border-edge bg-white p-5"
      >
        <h2 id="new-note" className="mb-4 text-lg font-semibold">
          New note
        </h2>
        <NoteForm
          submitLabel="Add note"
          pending={create.isPending}
          error={create.error}
          onSubmit={async (input) => {
            await create.mutateAsync(input);
          }}
        />
      </section>

      <section aria-labelledby="your-notes" className="mt-8">
        <h2 id="your-notes" className="text-lg font-semibold">
          Your notes{" "}
          {notes.data && (
            <span className="text-muted">({notes.data.length})</span>
          )}
        </h2>

        {notes.isPending && (
          <p role="status" className="mt-4 text-muted">
            Loading…
          </p>
        )}
        {notes.isError && (
          <div className="mt-4 flex flex-col items-start gap-3">
            <ErrorAlert message={errorMessage(notes.error)} />
            <button
              type="button"
              onClick={() => notes.refetch()}
              className={buttonSecondary}
            >
              Try again
            </button>
          </div>
        )}
        {notes.data?.length === 0 && (
          <p className="mt-4 rounded-xl border border-dashed border-edge p-8 text-center text-muted">
            No notes yet. Write your first one above.
          </p>
        )}
        {notes.data && notes.data.length > 0 && (
          <ul className="mt-4 flex flex-col gap-3">
            {notes.data.map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
