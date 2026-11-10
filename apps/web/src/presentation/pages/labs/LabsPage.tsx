import { todayText } from "@talaan/shared";
import { Link2, Printer } from "lucide-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useLabs } from "../../../application/labs/useLabs";
import { useRecordAccounts } from "../../../application/records/useRecords";
import { ChartsGrid } from "../../components/labs/ChartsGrid";
import { CompareDates } from "../../components/labs/CompareDates";
import { columnsFor, filterSeries } from "../../components/labs/labFilters";
import { LabFiltersBar } from "../../components/labs/LabFiltersBar";
import {
  filtersFromParams,
  filtersToParams,
} from "../../components/labs/labParams";
import { LabTable } from "../../components/labs/LabTable";
import { NeedsAttention } from "../../components/labs/NeedsAttention";
import { PersonPicker } from "../../components/people/PersonPicker";
import { TestDetail } from "../../components/labs/TestDetail";
import { BackLink } from "../../components/ui/BackLink";
import { ErrorAlert } from "../../components/ui/ErrorAlert";
import { Loading } from "../../components/ui/Loading";
import { buttonSecondary } from "../../components/ui/styles";
import { errorMessage } from "../../format/errorMessage";

const VIEWS = [
  ["table", "Table"],
  ["charts", "Charts"],
  ["attention", "Needs attention"],
  ["compare", "Compare two dates"],
] as const;
type View = (typeof VIEWS)[number][0] | "test";

// /labs?owner=…&person=self|<profile>&view=…&test=…&record=… (+ filters)
export function LabsPage() {
  const [params, setParams] = useSearchParams();
  const accounts = useRecordAccounts();
  const list = accounts.data ?? [];
  const account =
    list.find((a) => a.ownerId === params.get("owner")) ?? list[0] ?? null;
  const person = params.get("person") ?? "self";
  const labs = useLabs(account?.ownerId, person);
  const view = (params.get("view") ?? "table") as View;
  const testKey = params.get("test") ?? "";
  const highlight = params.get("record") ?? undefined;
  // Typed into the page (only the print link puts them in an address)
  const [filters, setFilters] = useState(() => filtersFromParams(params));

  const go = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }
    setParams(next, { replace: true });
  };
  const openTest = (key: string) => go({ view: "test", test: key });

  const series = labs.data
    ? filterSeries(labs.data.series, filters, todayText(new Date()))
    : [];
  const columns = labs.data ? columnsFor(labs.data.records, series) : [];
  const chosen = labs.data?.series.find((s) => s.key === testKey);
  const printQuery = new URLSearchParams({
    ...(account ? { owner: account.ownerId } : {}),
    person,
    ...filtersToParams(filters),
  });

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold">Lab results</h1>
          <p className="text-muted">
            Every test across the lab records, lined up by date. Units from
            different labs are converted (marked *).
          </p>
        </div>
        {labs.data && labs.data.records.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {(labs.data.role === "owner" || labs.data.role === "manage") &&
              account && (
                <Link
                  to={`/shares/new?${new URLSearchParams({ owner: account.ownerId, person, labs: "1" })}`}
                  className={buttonSecondary}
                >
                  <Link2 aria-hidden="true" className="size-4" />
                  Share with a doctor
                </Link>
              )}
            <Link to={`/labs/print?${printQuery}`} className={buttonSecondary}>
              <Printer aria-hidden="true" className="size-4" />
              Print
            </Link>
          </div>
        )}
      </div>

      {accounts.isError && (
        <ErrorAlert message={errorMessage(accounts.error)} />
      )}
      {account && (
        <div className="sm:max-w-sm">
          <PersonPicker
            accounts={list}
            ownerId={account.ownerId}
            profileId={person}
            onChange={(owner, profile) =>
              go({
                owner,
                person: profile,
                test: null,
                record: null,
                view: view === "test" ? null : view,
              })
            }
          />
        </div>
      )}

      {(accounts.isPending || labs.isPending) && <Loading />}
      {labs.isError && <ErrorAlert message={errorMessage(labs.error)} />}
      {labs.data && labs.data.records.length === 0 && (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-edge bg-white p-6">
          <p className="font-semibold">
            No lab results for {labs.data.personName} yet.
          </p>
          <p className="text-sm text-muted">
            Add a lab result record (you can read the values from a photo or
            PDF), and they'll show here.
          </p>
          <Link
            to={`/records/new?owner=${account?.ownerId ?? ""}`}
            className="font-semibold text-brand underline"
          >
            Add a lab result
          </Link>
        </div>
      )}

      {labs.data && labs.data.records.length > 0 && (
        <>
          {view === "test" ? (
            <section className="flex flex-col gap-4">
              <BackLink
                to={`?${new URLSearchParams({ ...Object.fromEntries(params), view: "charts", test: "" })}`}
              >
                All tests
              </BackLink>
              {chosen ? (
                <>
                  <h2 className="text-2xl font-bold">
                    {chosen.name}
                    {chosen.unit && (
                      <span className="text-lg font-normal text-muted">
                        {" "}
                        · {chosen.unit}
                      </span>
                    )}
                  </h2>
                  <TestDetail series={chosen} highlight={highlight} />
                </>
              ) : (
                <ErrorAlert message="That test isn't in these results." />
              )}
            </section>
          ) : (
            <>
              <div
                role="tablist"
                className="flex gap-1 overflow-x-auto border-b border-edge"
              >
                {VIEWS.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={view === value}
                    onClick={() => go({ view: value })}
                    className={`-mb-px cursor-pointer border-b-2 px-3 py-2 font-semibold whitespace-nowrap ${
                      view === value
                        ? "border-brand text-brand"
                        : "border-transparent text-muted hover:text-gray-900"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {view !== "compare" && view !== "attention" && (
                <LabFiltersBar filters={filters} onChange={setFilters} />
              )}
              {series.length === 0 && view !== "attention" ? (
                <p className="text-sm text-muted">No tests match.</p>
              ) : view === "charts" ? (
                <ChartsGrid
                  series={series}
                  onTest={openTest}
                  highlight={highlight}
                />
              ) : view === "attention" ? (
                <NeedsAttention series={labs.data.series} onTest={openTest} />
              ) : view === "compare" ? (
                <CompareDates
                  series={labs.data.series}
                  columns={columnsFor(labs.data.records, labs.data.series)}
                />
              ) : (
                <LabTable
                  series={series}
                  columns={columns}
                  highlight={highlight}
                  onTest={openTest}
                />
              )}
            </>
          )}
          <p className="text-xs text-muted">
            * Converted from the unit on the record (a test's own page shows the
            original). Low and High follow the normal range printed on each
            result; only a doctor can say what they mean for you.
          </p>
        </>
      )}
    </main>
  );
}
