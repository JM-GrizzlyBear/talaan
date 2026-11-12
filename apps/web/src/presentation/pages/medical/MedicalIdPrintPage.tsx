import { Printer } from "lucide-react";
import { useState } from "react";
import { useMedicalId } from "../../../application/medical/useMedicalId";
import { useRecordAccounts } from "../../../application/records/useRecords";
import { MedicalIdView } from "../../components/medical/MedicalIdView";
import { usePersonParams } from "../../components/medical/usePersonParams";
import { WalletCard } from "../../components/medical/print/WalletCard";
import { PAPER_SIZES, type PaperSizeId } from "../../components/print/paper";
import { BackLink } from "../../components/ui/BackLink";
import { CheckboxField } from "../../components/ui/CheckboxField";
import { ErrorAlert } from "../../components/ui/ErrorAlert";
import { Loading } from "../../components/ui/Loading";
import { SelectField } from "../../components/ui/SelectField";
import { buttonPrimary } from "../../components/ui/styles";
import { errorMessage } from "../../format/errorMessage";

// /medical-id/print?owner=…&person=…&what=card|summary
export function MedicalIdPrintPage() {
  const accounts = useRecordAccounts();
  const { person, query, params } = usePersonParams(accounts.data);
  const medicalId = useMedicalId(person);
  const card = params.get("what") === "card";
  const [paper, setPaper] = useState<PaperSizeId>("a4");
  const [landscape, setLandscape] = useState(false);
  const [philhealth, setPhilhealth] = useState(false);

  const size = PAPER_SIZES[paper];
  const page = landscape
    ? { width: size.height, height: size.width }
    : { width: size.width, height: size.height };
  const printed = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div>
      <style>{`@page { size: ${page.width}mm ${page.height}mm; margin: 12mm; }`}</style>
      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-10 print:hidden">
        <BackLink to={`/medical-id?${query}`}>Back to the Medical ID</BackLink>
        <h1 className="text-3xl font-bold">
          {card ? "Print a wallet card" : "Print a one-page summary"}
        </h1>
        <p className="-mt-3 text-muted">
          {card
            ? "Credit-card size, front and back. Cut along the dashed line, fold in the middle, and glue or laminate it. Print at “Actual size” (100%)."
            : "Everything on the Medical ID, for a doctor visit or the hospital."}
        </p>
        {(accounts.isPending || medicalId.isPending) && <Loading />}
        {medicalId.isError && (
          <ErrorAlert message={errorMessage(medicalId.error)} />
        )}
        <div className="grid gap-4 rounded-xl border border-edge bg-white p-4 sm:grid-cols-2">
          <SelectField
            label="Paper"
            value={paper}
            onChange={(v) => setPaper(v as PaperSizeId)}
            options={Object.entries(PAPER_SIZES).map(([value, p]) => ({
              value,
              label: p.name,
            }))}
          />
          {!card && (
            <SelectField
              label="Orientation"
              value={landscape ? "landscape" : "portrait"}
              onChange={(v) => setLandscape(v === "landscape")}
              options={[
                { value: "portrait", label: "Portrait" },
                { value: "landscape", label: "Landscape" },
              ]}
            />
          )}
          {card && (
            <CheckboxField checked={philhealth} onChange={setPhilhealth}>
              Put the PhilHealth ID on the card
            </CheckboxField>
          )}
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          disabled={!medicalId.data}
          className={`${buttonPrimary} self-start`}
        >
          <Printer aria-hidden="true" className="size-4" />
          Print
        </button>
        <h2 className="text-lg font-bold">Preview</h2>
      </main>
      {medicalId.data && (
        <div className="mx-auto max-w-4xl overflow-x-auto px-4 pb-10 print:max-w-none print:overflow-visible print:p-0">
          {card ? (
            <WalletCard medicalId={medicalId.data} philhealth={philhealth} />
          ) : (
            <div className="paper bg-white p-6 text-black shadow-md ring-1 ring-edge print:p-0 print:shadow-none print:ring-0">
              <header className="mb-4 flex items-end justify-between gap-4 border-b-2 border-black pb-2">
                <h1 className="text-xl font-bold">
                  Medical ID: {medicalId.data.personName}
                </h1>
                <p className="text-right text-xs">
                  Printed {printed}
                  <br />
                  from Talaan
                </p>
              </header>
              <div
                className={
                  landscape
                    ? "columns-2 gap-4 [&>div>section]:break-inside-avoid"
                    : ""
                }
              >
                <MedicalIdView fields={medicalId.data.fields} print />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
