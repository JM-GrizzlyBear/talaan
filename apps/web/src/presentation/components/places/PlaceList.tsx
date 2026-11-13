import { PLACE_KIND_LABELS, type PlaceSummary } from "@talaan/shared";
import { ChevronRight, FileText } from "lucide-react";
import { Link } from "react-router";
import { placePhotoUrl, shownCode, placeTree } from "@talaan/client";
import { listCard } from "../ui/styles";
import { PlaceKindIcon } from "./PlaceKindIcon";

// "3 records, 1 place inside"
function contentsText(place: PlaceSummary) {
  const parts = [];
  if (place.recordCount > 0) {
    parts.push(
      `${place.recordCount} ${place.recordCount === 1 ? "record" : "records"}`,
    );
  }
  if (place.placeCount > 0) {
    parts.push(
      `${place.placeCount} ${place.placeCount === 1 ? "place" : "places"} inside`,
    );
  }
  return parts.join(", ") || "Empty";
}

// Every place, each followed by what's inside it (indented)
export function PlaceList({
  places,
  flat = false,
}: {
  places: PlaceSummary[];
  // true: no indenting (a place's own list of what's inside)
  flat?: boolean;
}) {
  const rows = flat
    ? places.map((place) => ({ place, depth: 0 }))
    : placeTree(places);
  return (
    <ul className={listCard}>
      {rows.map(({ place, depth }) => (
        <li key={place.id}>
          <Link
            to={`/places/${place.id}`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50"
            // Inside places step in, so the tree reads at a glance
            style={{ paddingLeft: `${1 + depth * 1.5}rem` }}
          >
            {place.hasPhoto ? (
              <img
                src={placePhotoUrl(place.id, "thumb", place.updatedAt)}
                alt=""
                className="size-12 shrink-0 rounded-lg border border-edge object-cover"
              />
            ) : (
              <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-brand-soft">
                <PlaceKindIcon
                  kind={place.kind}
                  className="size-6 text-brand"
                />
              </span>
            )}
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-semibold break-words">{place.name}</span>
              <span className="flex flex-wrap items-center gap-x-2 text-sm text-muted">
                <span>{PLACE_KIND_LABELS[place.kind]}</span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <FileText aria-hidden="true" className="size-3.5" />
                  {contentsText(place)}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-xs">
                  {shownCode(place.code)}
                </span>
              </span>
            </span>
            <ChevronRight aria-hidden="true" className="size-5 text-muted" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
