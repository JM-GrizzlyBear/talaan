import type { LabelInfo } from "@talaan/shared";
import { Navigate, useNavigate, useParams } from "react-router";
import {
  useLabel,
  useNameLabel,
  usePlaces,
  useSavePlace,
  emptyPlace,
  shownCode,
} from "@talaan/client";
import { PlaceFieldsForm } from "../../components/places/PlaceFieldsForm";
import { ErrorAlert } from "../../components/ui/ErrorAlert";
import { Loading } from "../../components/ui/Loading";
import { errorMessage } from "../../format/errorMessage";

// What a QR label's code opens: /l/7K4QM2XD. A named label goes straight to
// its place; a blank one asks what it's stuck on.
export function LabelPage() {
  const { code = "" } = useParams();
  const label = useLabel(code);
  if (label.isPending)
    return <Loading className="p-8 text-center text-muted" />;
  if (label.isError) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-10">
        <h1 className="text-2xl font-bold">Label {code.toUpperCase()}</h1>
        <ErrorAlert message={errorMessage(label.error)} />
        <p className="text-sm text-muted">
          A label opens only for the account it belongs to and the family it's
          shared with. Check that you're signed in to the right account.
        </p>
      </main>
    );
  }
  if (label.data.placeId) {
    return <Navigate to={`/places/${label.data.placeId}`} replace />;
  }
  return <NameBlankLabel label={label.data} />;
}

function NameBlankLabel({ label }: { label: LabelInfo }) {
  const places = usePlaces(label.ownerId);
  const name = useNameLabel();
  const save = useSavePlace((fields) =>
    name.mutateAsync({ code: label.code, fields }),
  );
  const navigate = useNavigate();
  const canChange = label.role === "owner" || label.role === "manage";

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-1">
        <p className="font-mono text-sm font-semibold text-brand">
          Label {shownCode(label.code)}
        </p>
        <h1 className="text-3xl font-bold">Name this label</h1>
        <p className="text-muted">
          {canChange
            ? "This label is blank. Say what it's stuck on, and scanning it will open that place from now on."
            : `This label is blank. ${label.ownerName} or family who can manage the records can name it.`}
        </p>
      </header>
      {canChange &&
        (places.isPending ? (
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
              if (saved) {
                void navigate(`/places/${saved.place.id}`, {
                  replace: true,
                  state: { photoFailed: saved.photoFailed },
                });
              }
            }}
          />
        ))}
      {save.progress !== null && (
        <p role="status" className="text-sm text-muted">
          Uploading the photo… {Math.round(save.progress * 100)}%
        </p>
      )}
    </main>
  );
}
