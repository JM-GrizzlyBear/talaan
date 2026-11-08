import { PLACE_KIND_LABELS, PLACE_KINDS, type PlaceKind } from "@talaan/shared";
import { PlaceKindIcon } from "./PlaceKindIcon";

// Folder, envelope, box… as big buttons
export function KindPicker({
  value,
  onChange,
  error,
}: {
  value: PlaceKind | "";
  onChange: (kind: PlaceKind) => void;
  error?: string;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-semibold">What is it?</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {PLACE_KINDS.map((kind) => (
          <label
            key={kind}
            className={`flex min-h-14 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${
              value === kind
                ? "border-brand bg-brand-soft text-deep"
                : "border-edge bg-white hover:bg-gray-50"
            }`}
          >
            <input
              type="radio"
              name="kind"
              value={kind}
              checked={value === kind}
              onChange={() => onChange(kind)}
              className="sr-only"
            />
            <PlaceKindIcon kind={kind} className="size-5 shrink-0 text-brand" />
            {PLACE_KIND_LABELS[kind]}
          </label>
        ))}
      </div>
      {error && <p className="text-sm font-medium text-danger">{error}</p>}
    </fieldset>
  );
}
