import type { PlaceInfo, RecordAccountInfo } from "@talaan/shared";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import {
  useCreatePlace,
  usePlace,
  usePlaces,
  useUpdatePlace,
} from "../../../application/places/usePlaces";
import { useSavePlace } from "../../../application/places/useSavePlace";
import { useRecordAccounts } from "../../../application/records/useRecords";
import { PlaceFieldsForm } from "../../components/places/PlaceFieldsForm";
import { emptyPlace } from "../../components/places/placeFormValues";
import { BackLink } from "../../components/ui/BackLink";
import { ErrorAlert } from "../../components/ui/ErrorAlert";
import { Loading } from "../../components/ui/Loading";
import { buttonSecondary } from "../../components/ui/styles";
import { errorMessage } from "../../format/errorMessage";

const VIEW_ONLY =
  "You can view these places, but not change them. Ask the owner for “Can manage”.";

function Problem({ message }: { message: string }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <ErrorAlert message={message} />
    </main>
  );
}

// /places/new?owner=…&parent=… and /places/:id/edit
export function PlaceFormPage() {
  const { id } = useParams();
  const accounts = useRecordAccounts();
  if (accounts.isPending)
    return <Loading className="p-8 text-center text-muted" />;
  if (accounts.isError)
    return <Problem message={errorMessage(accounts.error)} />;
  return id ? <EditPlace id={id} /> : <NewPlace accounts={accounts.data} />;
}

function NewPlace({ accounts }: { accounts: RecordAccountInfo[] }) {
  const [params] = useSearchParams();
  const account =
    accounts.find((a) => a.ownerId === params.get("owner")) ?? accounts[0];
  const places = usePlaces(account.ownerId);
  const create = useCreatePlace();
  const save = useSavePlace((fields) =>
    create.mutateAsync({ ownerId: account.ownerId, fields }),
  );
  const navigate = useNavigate();
  if (account.role === "view") return <Problem message={VIEW_ONLY} />;
  if (places.isPending)
    return <Loading className="p-8 text-center text-muted" />;

  const back = params.get("parent")
    ? `/places/${params.get("parent")}`
    : `/places?owner=${account.ownerId}`;
  return (
    <FormLayout title="Add a place" back={back} forWhom={account}>
      <PlaceFieldsForm
        initial={emptyPlace(params.get("parent") ?? "")}
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
              state: { photoFailed: saved.photoFailed },
            });
          }
        }}
        extraButtons={
          <Link to={back} className={buttonSecondary}>
            Cancel
          </Link>
        }
      />
      {save.progress !== null && (
        <p role="status" className="text-sm text-muted">
          Uploading the photo… {Math.round(save.progress * 100)}%
        </p>
      )}
    </FormLayout>
  );
}

function EditPlace({ id }: { id: string }) {
  const place = usePlace(id);
  if (place.isPending)
    return <Loading className="p-8 text-center text-muted" />;
  if (place.isError) return <Problem message={errorMessage(place.error)} />;
  if (place.data.role === "view") return <Problem message={VIEW_ONLY} />;
  return <EditForm place={place.data} />;
}

function EditForm({ place }: { place: PlaceInfo }) {
  const places = usePlaces(place.ownerId);
  const update = useUpdatePlace();
  const navigate = useNavigate();
  if (places.isPending)
    return <Loading className="p-8 text-center text-muted" />;
  const back = `/places/${place.id}`;
  return (
    <FormLayout title="Edit place" back={back}>
      <p className="-mt-2 text-sm text-muted">
        Change the photo on the place's page.
      </p>
      <PlaceFieldsForm
        initial={{
          kind: place.kind,
          name: place.name,
          note: place.note,
          parentId: place.parentId ?? "",
        }}
        places={places.data?.places ?? []}
        movingId={place.id}
        withPhoto={false}
        submitLabel="Save changes"
        pending={update.isPending}
        error={update.error}
        onSubmit={(fields) =>
          update.mutate(
            { id: place.id, fields },
            { onSuccess: () => void navigate(back, { replace: true }) },
          )
        }
        extraButtons={
          <Link to={back} className={buttonSecondary}>
            Cancel
          </Link>
        }
      />
    </FormLayout>
  );
}

function FormLayout({
  title,
  back,
  forWhom,
  children,
}: {
  title: string;
  back: string;
  forWhom?: RecordAccountInfo;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
      <BackLink to={back}>Back</BackLink>
      <h1 className="text-3xl font-bold">
        {title}
        {forWhom && forWhom.role !== "owner" && (
          <span className="text-lg font-normal text-muted">
            {" "}
            · {forWhom.ownerName}'s places
          </span>
        )}
      </h1>
      {children}
    </main>
  );
}
