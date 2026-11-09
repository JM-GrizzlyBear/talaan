import { todayText } from "@talaan/shared";
import { Printer } from "lucide-react";
import { useSearchParams } from "react-router";
import { useLabs } from "../../../application/labs/useLabs";
import { useRecordAccounts } from "../../../application/records/useRecords";
import { columnsFor, filterSeries } from "../../components/labs/labFilters";
import { filtersFromParams, isFiltered } from "../../components/labs/labParams";
import { LabPrintOptions } from "../../components/labs/print/LabPrintOptions";
import { LabPrintPages } from "../../components/labs/print/LabPrintPages";
import { useLabPrintSettings } from "../../components/labs/print/labPrintSettings";
import { BackLink } from "../../components/ui/BackLink";
import { ErrorAlert } from "../../components/ui/ErrorAlert";
import { Loading } from "../../components/ui/Loading";
import { buttonPrimary } from "../../components/ui/styles";
import { errorMessage } from "../../format/errorMessage";

// /labs/print?owner=…&person=…(+ the filters from the results page)
export function PrintLabsPage() {
  const [params] = useSearchParams();
  const accounts = useRecordAccounts();
  const account =
    accounts.data?.find((a) => a.ownerId === params.get("owner")) ??
    accounts.data?.[0];
  const person = params.get("person") ?? "self";
  const labs = useLabs(account?.ownerId, person);
  const [settings, setSettings] = useLabPrintSettings();
  const filters = filtersFromParams(params);

  const series = labs.data
    ? filterSeries(labs.data.series, filters, todayText(new Date()))
    : [];
  const columns = labs.data ? columnsFor(labs.data.records, series) : [];
  const nothing = !settings.table && !settings.charts && !settings.attention;

  return (
    <div>
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10 print:hidden">
        <BackLink to={`/labs?${params}`}>Back to lab results</BackLink>
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold">Print lab results</h1>
          <p className="text-muted">
            {labs.data ? `${labs.data.personName}. ` : ""}
            {isFiltered(filters)
              ? "Only the tests chosen on the results page. "
              : ""}
            In the print window, choose the same paper and orientation.
          </p>
        </div>
        {(accounts.isPending || labs.isPending) && <Loading />}
        {accounts.isError && (
          <ErrorAlert message={errorMessage(accounts.error)} />
        )}
        {labs.isError && <ErrorAlert message={errorMessage(labs.error)} />}
        <LabPrintOptions settings={settings} onChange={setSettings} />
        <button
          type="button"
          onClick={() => window.print()}
          disabled={!labs.data || nothing}
          className={`${buttonPrimary} self-start`}
        >
          <Printer aria-hidden="true" className="size-4" />
          Print
        </button>
        {nothing && (
          <p className="text-sm text-muted">Choose something to include.</p>
        )}
        <h2 className="text-lg font-bold">Preview</h2>
      </main>
      {labs.data && !nothing && (
        <div className="mx-auto max-w-5xl px-4 pb-10 print:max-w-none print:p-0">
          <LabPrintPages
            settings={settings}
            personName={labs.data.personName}
            series={series}
            columns={columns}
          />
        </div>
      )}
    </div>
  );
}
