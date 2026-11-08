import {
  ACCESS_LABELS,
  PLACE_KIND_LABELS,
  type PlaceInfo,
} from "@talaan/shared";
import { FilePlus, Pencil, Plus, Printer } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import {
  usePlace,
  useRemovePlace,
} from "../../../application/places/usePlaces";
import { useRecordList } from "../../../application/records/useRecords";
import { LabelPreview } from "../../components/places/LabelPreview";
import { PlaceKindIcon } from "../../components/places/PlaceKindIcon";
import { PlaceList } from "../../components/places/PlaceList";
import { PlacePath } from "../../components/places/PlacePath";
import { PlacePhotoSection } from "../../components/places/PlacePhotoSection";
import { RecordList } from "../../components/records/RecordList";
import { BackLink } from "../../components/ui/BackLink";
import { ErrorAlert } from "../../components/ui/ErrorAlert";
import { InlineConfirm } from "../../components/ui/InlineConfirm";
import { Loading } from "../../components/ui/Loading";
import { Notice } from "../../components/ui/Notice";
import { buttonSecondary, dangerLinkButton } from "../../components/ui/styles";
import { shortDateTime } from "../../format/dates";
import { errorMessage } from "../../format/errorMessage";

export function PlacePage() {
  const { id = "" } = useParams();
  const place = usePlace(id);
  if (place.isPending)
    return <Loading className="p-8 text-center text-muted" />;
  if (place.isError) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-10">
        <ErrorAlert message={errorMessage(place.error)} />
        <Link to="/places" className="font-semibold text-brand underline">
          Back to places
        </Link>
      </main>
    );
  }
  return <PlaceView place={place.data} />;
}

function PlaceView({ place }: { place: PlaceInfo }) {
  const canChange = place.role === "owner" || place.role === "manage";
  const records = useRecordList({ ownerId: place.ownerId, placeId: place.id });
  const remove = useRemovePlace();
  const [confirming, setConfirming] = useState(false);
  const navigate = useNavigate();
  const owner = `owner=${place.ownerId}`;
  const fitsInside = place.path.length < 2;
  // Saved, but the photo upload failed (from the add form)
  const photoFailed = Boolean(
    (useLocation().state as { photoFailed?: boolean } | null)?.photoFailed,
  );

  function removePlace() {
    remove.mutate(place.id, {
      onSuccess: () =>
        void navigate(
          place.parentId ? `/places/${place.parentId}` : `/places?${owner}`,
          { replace: true },
        ),
    });
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
      <BackLink to={`/places?${owner}`}>Back to places</BackLink>

      <header className="flex flex-col gap-2">
        <span className="flex items-center gap-2 text-sm font-semibold text-brand">
          <PlaceKindIcon kind={place.kind} className="size-4" />
          {PLACE_KIND_LABELS[place.kind]}
        </span>
        <h1 className="text-3xl font-bold break-words">{place.name}</h1>
        {place.path.length > 0 && (
          <p className="text-muted">
            Inside <PlacePath path={place.path} />
          </p>
        )}
        {place.role !== "owner" && (
          <p className="text-sm text-muted">
            {place.ownerName}'s place · You{" "}
            {ACCESS_LABELS[place.role].name.toLowerCase()}
          </p>
        )}
      </header>

      {photoFailed && !place.hasPhoto && (
        <Notice>
          The place was saved, but the photo couldn't be uploaded. Try adding it
          again under Photo.
        </Notice>
      )}

      {canChange && (
        <div className="flex flex-wrap gap-2">
          <Link to={`/places/${place.id}/edit`} className={buttonSecondary}>
            <Pencil aria-hidden="true" className="size-4" />
            Edit
          </Link>
          <Link
            to={`/records/new?${owner}&place=${place.id}`}
            className={buttonSecondary}
          >
            <FilePlus aria-hidden="true" className="size-4" />
            Add a record here
          </Link>
          {fitsInside && (
            <Link
              to={`/places/new?${owner}&parent=${place.id}`}
              className={buttonSecondary}
            >
              <Plus aria-hidden="true" className="size-4" />
              Add a place inside
            </Link>
          )}
          <Link
            to={`/places/print?${owner}&ids=${place.id}`}
            className={buttonSecondary}
          >
            <Printer aria-hidden="true" className="size-4" />
            Print label
          </Link>
        </div>
      )}

      {place.note && (
        <p className="rounded-xl border border-edge bg-white p-4 whitespace-pre-wrap">
          {place.note}
        </p>
      )}

      <PlacePhotoSection place={place} canChange={canChange} />

      <LabelPreview place={place} />

      {place.children.length > 0 && (
        <section
          aria-labelledby="inside-heading"
          className="flex flex-col gap-2"
        >
          <h2 id="inside-heading" className="text-lg font-bold">
            Places inside
          </h2>
          <PlaceList places={place.children} flat />
        </section>
      )}

      <section
        aria-labelledby="records-heading"
        className="flex flex-col gap-2"
      >
        <h2 id="records-heading" className="text-lg font-bold">
          Records kept here
        </h2>
        {records.isPending && <Loading />}
        {records.isError && (
          <ErrorAlert message={errorMessage(records.error)} />
        )}
        {records.data && records.data.records.length === 0 && (
          <p className="text-sm text-muted">
            None yet. When you add or edit a record, choose this place under
            “Where it's kept”.
          </p>
        )}
        {records.data && records.data.records.length > 0 && (
          <RecordList records={records.data.records} />
        )}
      </section>

      <p className="text-sm text-muted">
        {place.createdByName ? `Added by ${place.createdByName}. ` : ""}
        Last changed
        {place.updatedByName ? ` by ${place.updatedByName}` : ""} on{" "}
        {shortDateTime(place.updatedAt)}.
      </p>

      {place.role === "owner" && (
        <div className="flex flex-col gap-2 border-t border-edge pt-4">
          {remove.isError && (
            <ErrorAlert message={errorMessage(remove.error)} />
          )}
          {confirming ? (
            <InlineConfirm
              question={
                place.recordCount + place.placeCount > 0
                  ? `Remove “${place.name}”? What's inside moves to ${place.path.at(-1)?.name ?? "no place"}.`
                  : `Remove “${place.name}”?`
              }
              confirmLabel="Remove"
              pending={remove.isPending}
              onConfirm={removePlace}
              onCancel={() => setConfirming(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className={`${dangerLinkButton} self-start`}
            >
              Remove this place
            </button>
          )}
          <p className="text-sm text-muted">
            Its label becomes blank: scan it later to name it again.
          </p>
        </div>
      )}
    </main>
  );
}
