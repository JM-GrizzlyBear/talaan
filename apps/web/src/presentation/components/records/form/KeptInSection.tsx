import type { RecordAccountInfo } from "@talaan/shared";
import { Link } from "react-router";
import { usePlaces, placeOptions } from "@talaan/client";
import { SelectField } from "../../ui/SelectField";
import type { FormPartProps } from "./formParts";

// Where the paper or film is kept at home (one of the account's places)
export function KeptInSection({
  form,
  set,
  error,
  account,
}: FormPartProps & { account: RecordAccountInfo }) {
  const places = usePlaces(account.ownerId);
  const options = placeOptions(places.data?.places ?? []);
  // A place removed meanwhile: shown until a new one is chosen
  if (
    form.placeId &&
    places.data &&
    !options.some((o) => o.value === form.placeId)
  ) {
    options.unshift({ value: form.placeId, label: "A removed place" });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <SelectField
        label="Where it's kept (optional)"
        value={form.placeId}
        onChange={(value) => set("placeId", value)}
        disabled={places.isPending}
        options={[{ value: "", label: "Not in a place" }, ...options]}
        error={error("placeId")}
      />
      <p className="text-sm text-muted">
        The folder, box or drawer the paper or film is in.{" "}
        <Link
          to={`/places/new?owner=${account.ownerId}`}
          className="font-semibold text-brand underline"
        >
          Add a place
        </Link>
      </p>
    </div>
  );
}
