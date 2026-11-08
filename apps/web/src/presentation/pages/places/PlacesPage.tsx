import { ACCESS_LABELS, type RecordAccountInfo } from "@talaan/shared";
import { Plus, Printer } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import {
  useBlankLabels,
  usePlaces,
} from "../../../application/places/usePlaces";
import { useRecordAccounts } from "../../../application/records/useRecords";
import { PlaceList } from "../../components/places/PlaceList";
import { ErrorAlert } from "../../components/ui/ErrorAlert";
import { Loading } from "../../components/ui/Loading";
import { SelectField } from "../../components/ui/SelectField";
import { buttonPrimary, buttonSecondary } from "../../components/ui/styles";
import { errorMessage } from "../../format/errorMessage";
import { FindLabel } from "../../components/places/FindLabel";

const accountLabel = (account: RecordAccountInfo) =>
  account.role === "owner"
    ? "My places"
    : `${account.ownerName}'s places (${ACCESS_LABELS[account.role].name})`;

// Where the papers and films are kept at home: /places?owner=…
export function PlacesPage() {
  const [params, setParams] = useSearchParams();
  const accounts = useRecordAccounts();
  const list = accounts.data ?? [];
  const account =
    list.find((a) => a.ownerId === params.get("owner")) ?? list[0] ?? null;
  const places = usePlaces(account?.ownerId);
  const canChange = account?.role === "owner" || account?.role === "manage";
  const blank = useBlankLabels(canChange ? account?.ownerId : undefined);
  const owner = account ? `?owner=${account.ownerId}` : "";

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold">Places</h1>
          <p className="text-muted">
            Where the papers and films are kept. Each place has a QR label: scan
            it to see what should be inside.
          </p>
        </div>
        {canChange && (
          <div className="flex flex-wrap gap-2">
            <Link to={`/places/print${owner}`} className={buttonSecondary}>
              <Printer aria-hidden="true" className="size-4" />
              Print labels
            </Link>
            <Link to={`/places/new${owner}`} className={buttonPrimary}>
              <Plus aria-hidden="true" className="size-4" />
              Add place
            </Link>
          </div>
        )}
      </div>

      {accounts.isError && (
        <ErrorAlert message={errorMessage(accounts.error)} />
      )}
      {list.length > 1 && account && (
        <div className="sm:max-w-xs">
          <SelectField
            label="Whose places"
            value={account.ownerId}
            onChange={(value) => setParams({ owner: value }, { replace: true })}
            options={list.map((a) => ({
              value: a.ownerId,
              label: accountLabel(a),
            }))}
          />
        </div>
      )}

      {(accounts.isPending || places.isPending) && <Loading />}
      {places.isError && <ErrorAlert message={errorMessage(places.error)} />}
      {places.data && places.data.places.length === 0 && (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-edge bg-white p-6">
          <p className="font-semibold">No places yet.</p>
          <p className="text-sm text-muted">
            Start with where most of the papers are: a folder, a box, a drawer.
            You can put places inside places, like a folder in a box.
          </p>
          {canChange && (
            <Link to={`/places/new${owner}`} className={buttonPrimary}>
              Add the first place
            </Link>
          )}
        </div>
      )}
      {places.data && places.data.places.length > 0 && (
        <PlaceList places={places.data.places} />
      )}

      <FindLabel />

      {canChange && blank.data && blank.data.length > 0 && (
        <p className="text-sm text-muted">
          {blank.data.length} blank{" "}
          {blank.data.length === 1 ? "label is" : "labels are"} printed but not
          named yet. Scan one with your phone to name it.{" "}
          <Link
            to={`/places/print${owner}${owner ? "&" : "?"}blank=unused`}
            className="font-semibold text-brand underline"
          >
            Print them again
          </Link>
        </p>
      )}
    </main>
  );
}
