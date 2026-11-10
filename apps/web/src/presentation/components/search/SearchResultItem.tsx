import type { SearchQuery, SearchResult } from "@talaan/shared";
import { Link } from "react-router";
import { Highlight } from "./Highlight";
import { KIND_ICONS } from "./kindIcons";

export function SearchResultItem({
  result,
  query,
  showPerson,
}: {
  result: SearchResult;
  query: SearchQuery;
  // When results come from more than one person
  showPerson: boolean;
}) {
  const Icon = KIND_ICONS[result.kind];
  return (
    <li>
      <Link
        to={result.path}
        className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 focus-visible:bg-gray-50"
      >
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft">
          <Icon aria-hidden="true" className="size-5 text-brand" />
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="font-semibold break-words">
            <Highlight text={result.title} query={query} />
          </span>
          {(result.subtitle || showPerson) && (
            <span className="text-sm break-words text-muted">
              {[
                showPerson &&
                  result.kind !== "person" &&
                  !result.title.startsWith(result.personName) &&
                  result.personName,
                result.subtitle,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          )}
          {result.match && (
            <span className="text-sm break-words">
              <span className="font-medium text-muted">
                {result.match.label}:{" "}
              </span>
              <Highlight text={result.match.text} query={query} />
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}
