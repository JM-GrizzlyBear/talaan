import {
  parseSearch,
  SEARCH_KIND_LABELS,
  SEARCH_KINDS,
  SEARCH_LIMITS,
  type SearchKind,
  type SearchResult,
} from "@talaan/shared";
import { Search as SearchIcon, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { useSearch } from "../../../application/search/useSearch";
import { SearchResultItem } from "../../components/search/SearchResultItem";
import { ErrorAlert } from "../../components/ui/ErrorAlert";
import { inputBase, listCard } from "../../components/ui/styles";
import { errorMessage } from "../../format/errorMessage";

const EXAMPLES = [
  "CBC",
  "hemoglobin",
  "dugo",
  "resibo",
  "x-ray 2025",
  "penicillin",
];

const personKey = (r: Pick<SearchResult, "ownerId" | "profileId">) =>
  `${r.ownerId}:${r.profileId ?? "self"}`;

const chip = (on: boolean) =>
  `min-h-10 cursor-pointer rounded-full border px-3 text-sm font-semibold whitespace-nowrap ${
    on
      ? "border-brand bg-brand-soft text-deep"
      : "border-edge bg-white text-gray-700 hover:bg-gray-50"
  }`;

// /search?q=…&kind=…&who=…: everything you can see, in one box
export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const kind = (params.get("kind") ?? "") as SearchKind | "";
  const who = params.get("who") ?? "";
  const [typed, setTyped] = useState(q);
  const search = useSearch(q);
  const query = useMemo(() => parseSearch(q), [q]);

  const set = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setParams(next, { replace: true });
  };

  // Search as you type, once typing pauses
  useEffect(() => {
    if (typed.trim() === q) return;
    const timer = setTimeout(
      () => set({ q: typed.trim(), kind: "", who: "" }),
      250,
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typed]);

  const all = search.data?.results ?? [];
  const people = [
    ...new Map(all.map((r) => [personKey(r), r.personName])).entries(),
  ];
  const forWho = who ? all.filter((r) => personKey(r) === who) : all;
  const shown = kind ? forWho.filter((r) => r.kind === kind) : forWho;
  const counts = new Map<SearchKind, number>();
  for (const r of forWho) counts.set(r.kind, (counts.get(r.kind) ?? 0) + 1);
  const showPerson = people.length > 1 && !who;
  const tooShort = q.length > 0 && q.length < SEARCH_LIMITS.minLength;

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-8">
      <h1 className="sr-only">Search</h1>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          set({ q: typed.trim(), kind: "", who: "" });
        }}
        className="relative"
      >
        <label htmlFor="search-box" className="sr-only">
          Search records, lab tests, places, reminders and family
        </label>
        <SearchIcon
          aria-hidden="true"
          className="pointer-events-none absolute top-3.5 left-3.5 size-5 text-muted"
        />
        <input
          id="search-box"
          type="search"
          autoFocus
          autoComplete="off"
          enterKeyHint="search"
          maxLength={SEARCH_LIMITS.maxLength}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="CBC, hemoglobin, dugo, a QR code…"
          className={`${inputBase} h-12 border-edge pr-11 pl-11 text-lg [&::-webkit-search-cancel-button]:hidden`}
        />
        {typed && (
          <button
            type="button"
            aria-label="Clear"
            onClick={() => {
              setTyped("");
              set({ q: "", kind: "", who: "" });
            }}
            className="absolute top-2 right-2 cursor-pointer rounded-lg p-2 text-muted hover:bg-gray-100"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        )}
      </form>

      {!q && (
        <div className="flex flex-col gap-3 text-muted">
          <p>
            Search every record, lab test, Medical ID, place, reminder and
            person you can see, yours and your family's. English or Filipino
            both work.
          </p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => {
                  setTyped(example);
                  set({ q: example, kind: "", who: "" });
                }}
                className={chip(false)}
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}
      {tooShort && (
        <p className="text-muted">Type at least 2 letters or numbers.</p>
      )}
      {search.isError && <ErrorAlert message={errorMessage(search.error)} />}

      {q && !tooShort && search.data && (
        <>
          {all.length > 0 && (
            <div className="flex flex-col gap-3">
              <div
                role="group"
                aria-label="Show"
                className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
              >
                <button
                  type="button"
                  aria-pressed={!kind}
                  onClick={() => set({ kind: "" })}
                  className={chip(!kind)}
                >
                  All {forWho.length}
                </button>
                {SEARCH_KINDS.filter((k) => counts.has(k)).map((k) => (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={kind === k}
                    onClick={() => set({ kind: kind === k ? "" : k })}
                    className={chip(kind === k)}
                  >
                    {SEARCH_KIND_LABELS[k]} {counts.get(k)}
                  </button>
                ))}
              </div>
              {people.length > 1 && (
                <label className="flex items-center gap-2 text-sm font-semibold">
                  Whose
                  <select
                    value={who}
                    onChange={(e) => set({ who: e.target.value })}
                    className={`${inputBase} h-10 w-auto max-w-full border-edge`}
                  >
                    <option value="">Everyone</option>
                    {people.map(([key, name]) => (
                      <option key={key} value={key}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          )}

          <p aria-live="polite" className="text-sm text-muted">
            {search.isFetching
              ? "Searching…"
              : all.length === 0
                ? `Nothing found for “${q}”.`
                : search.data.total > all.length
                  ? `The best ${all.length} of ${search.data.total}. Add a word to narrow it.`
                  : `${search.data.total} found.`}
          </p>
          {all.length === 0 && !search.isFetching && (
            <p className="text-muted">
              Try fewer words, or another word for it (Filipino or English).
              Records in the Trash aren't searched.
            </p>
          )}

          {kind || shown.length <= 8
            ? shown.length > 0 && (
                <ul className={listCard}>
                  {shown.map((r) => (
                    <SearchResultItem
                      key={`${r.kind}-${r.id}`}
                      result={r}
                      query={query}
                      showPerson={showPerson}
                    />
                  ))}
                </ul>
              )
            : SEARCH_KINDS.filter((k) => counts.has(k)).map((k) => (
                <section
                  key={k}
                  aria-labelledby={`found-${k}`}
                  className="flex flex-col gap-2"
                >
                  <h2 id={`found-${k}`} className="text-lg font-bold">
                    {SEARCH_KIND_LABELS[k]}
                  </h2>
                  <ul className={listCard}>
                    {shown
                      .filter((r) => r.kind === k)
                      .map((r) => (
                        <SearchResultItem
                          key={`${r.kind}-${r.id}`}
                          result={r}
                          query={query}
                          showPerson={showPerson}
                        />
                      ))}
                  </ul>
                </section>
              ))}
        </>
      )}
    </main>
  );
}
