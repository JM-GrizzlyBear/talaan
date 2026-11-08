import type { PlaceSummary } from "@talaan/shared";
import { linkButton } from "../../ui/styles";
import { placeTree } from "../placeTree";

// Ticking which places get a label
export function ChoosePlaces({
  places,
  chosen,
  onChange,
}: {
  places: PlaceSummary[];
  chosen: Set<string>;
  onChange: (chosen: Set<string>) => void;
}) {
  const toggle = (id: string, on: boolean) => {
    const next = new Set(chosen);
    if (on) next.add(id);
    else next.delete(id);
    onChange(next);
  };
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-semibold">
        Labels for these places
      </legend>
      <div className="flex gap-4">
        <button
          type="button"
          className={linkButton}
          onClick={() => onChange(new Set(places.map((p) => p.id)))}
        >
          All
        </button>
        <button
          type="button"
          className={linkButton}
          onClick={() => onChange(new Set())}
        >
          None
        </button>
      </div>
      <ul className="flex max-h-72 flex-col gap-1 overflow-auto rounded-lg border border-edge bg-white p-2">
        {placeTree(places).map(({ place, depth }) => (
          <li key={place.id} style={{ paddingLeft: `${depth * 1.25}rem` }}>
            <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-1.5 hover:bg-gray-50">
              <input
                type="checkbox"
                checked={chosen.has(place.id)}
                onChange={(e) => toggle(place.id, e.target.checked)}
                className="size-4 cursor-pointer accent-brand"
              />
              <span className="break-words">{place.name}</span>
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
