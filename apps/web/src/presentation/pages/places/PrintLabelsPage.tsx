import { type PlaceSummary, type RecordAccountInfo } from "@talaan/shared";
import { Printer } from "lucide-react";
import { useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { useSearchParams } from "react-router";
import {
  useBlankLabels,
  useCreateBlankLabels,
  usePlaces,
} from "../../../application/places/usePlaces";
import { useRecordAccounts } from "../../../application/records/useRecords";
import { BlankLabelsPicker } from "../../components/places/print/BlankLabelsPicker";
import { ChoosePlaces } from "../../components/places/print/ChoosePlaces";
import { LabelSheets } from "../../components/places/print/LabelSheets";
import {
  sheetLayout,
  toSheets,
} from "../../components/places/print/labelLayout";
import type { LabelItem } from "../../components/places/print/PrintLabel";
import { PrintOptions } from "../../components/places/print/PrintOptions";
import {
  CUSTOM_LIMITS,
  labelSize,
  paperSize,
} from "../../components/places/print/sizes";
import { usePrintSettings } from "../../components/places/print/usePrintSettings";
import { placeTree } from "../../components/places/placeTree";
import { BackLink } from "../../components/ui/BackLink";
import { ErrorAlert } from "../../components/ui/ErrorAlert";
import { Loading } from "../../components/ui/Loading";
import { SelectField } from "../../components/ui/SelectField";
import { buttonPrimary } from "../../components/ui/styles";
import { errorMessage } from "../../format/errorMessage";

// /places/print?owner=…&ids=a,b (those places ticked) &blank=unused
export function PrintLabelsPage() {
  const [params] = useSearchParams();
  const accounts = useRecordAccounts();
  if (accounts.isPending)
    return <Loading className="p-8 text-center text-muted" />;
  if (accounts.isError) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <ErrorAlert message={errorMessage(accounts.error)} />
      </main>
    );
  }
  const account =
    accounts.data.find((a) => a.ownerId === params.get("owner")) ??
    accounts.data[0];
  return <PrintLabels key={account.ownerId} account={account} />;
}

function PrintLabels({ account }: { account: RecordAccountInfo }) {
  const [params] = useSearchParams();
  const canChange = account.role === "owner" || account.role === "manage";
  const places = usePlaces(account.ownerId);
  const blank = useBlankLabels(canChange ? account.ownerId : undefined);
  const makeBlank = useCreateBlankLabels();

  const [settings, setSettings] = usePrintSettings();
  const [chosen, setChosen] = useState<Set<string>>(
    () => new Set(params.get("ids")?.split(",").filter(Boolean) ?? []),
  );
  const [copies, setCopies] = useState(1);
  const [newBlank, setNewBlank] = useState(0);
  const [includeUnused, setIncludeUnused] = useState(
    params.get("blank") === "unused",
  );
  const [skip, setSkip] = useState(0);

  // Nothing ticked from the address: every place
  const placeList = places.data?.places;
  const [ticked, setTicked] = useState(false);
  if (placeList && !ticked) {
    setTicked(true);
    if (chosen.size === 0 && !params.get("blank")) {
      setChosen(new Set(placeList.map((p) => p.id)));
    }
  }

  const paper = paperSize(settings);
  const label = labelSize(settings);
  const sizesOk =
    [paper.width, paper.height].every(
      (n) => n >= CUSTOM_LIMITS.paper.min && n <= CUSTOM_LIMITS.paper.max,
    ) &&
    [label.width, label.height].every(
      (n) => n >= CUSTOM_LIMITS.label.min && n <= CUSTOM_LIMITS.label.max,
    );
  const layout = sheetLayout(paper, label, settings.margin);

  const items = useMemo(() => {
    const list: LabelItem[] = [];
    const ordered: PlaceSummary[] = placeTree(placeList ?? []).map(
      (r) => r.place,
    );
    for (const place of ordered.filter((p) => chosen.has(p.id))) {
      for (let i = 0; i < copies; i++) {
        list.push({ code: place.code, name: place.name, kind: place.kind });
      }
    }
    if (includeUnused) {
      for (const b of blank.data ?? []) {
        list.push({ code: b.code, name: null, kind: null });
      }
    }
    return list;
  }, [placeList, chosen, copies, includeUnused, blank.data]);

  const sheets = sizesOk ? toSheets(items, layout.perSheet, skip) : [];
  const total = items.length + newBlank;

  // New blank labels are made first, then everything prints together
  async function print() {
    if (newBlank > 0) {
      try {
        await makeBlank.mutateAsync({
          ownerId: account.ownerId,
          count: newBlank,
        });
        await blank.refetch();
      } catch {
        return; // Shown from makeBlank.error
      }
      // On the sheets before the print window opens
      flushSync(() => {
        setNewBlank(0);
        setIncludeUnused(true);
      });
    }
    window.print();
  }

  return (
    <div className="print:m-0">
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10 print:hidden">
        <BackLink to={`/places?owner=${account.ownerId}`}>
          Back to places
        </BackLink>
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold">Print QR labels</h1>
          <p className="text-muted">
            Print on sticker paper, or plain paper and tape. In the print
            window, choose the same paper size and “Actual size” (100%), not
            “Fit to page”.
          </p>
        </div>

        {places.isPending && <Loading />}
        {places.isError && <ErrorAlert message={errorMessage(places.error)} />}

        {placeList && (
          <div className="grid gap-8 md:grid-cols-2">
            <div className="flex flex-col gap-6">
              {placeList.length > 0 ? (
                <ChoosePlaces
                  places={placeList}
                  chosen={chosen}
                  onChange={setChosen}
                />
              ) : (
                <p className="text-sm text-muted">
                  No places yet. You can still print blank labels and name them
                  later.
                </p>
              )}
              {placeList.length > 0 && (
                <SelectField
                  label="Copies of each place's label"
                  value={String(copies)}
                  onChange={(v) => setCopies(Number(v))}
                  options={[1, 2, 3, 4, 5].map((n) => ({
                    value: String(n),
                    label: String(n),
                  }))}
                />
              )}
              {canChange && (
                <BlankLabelsPicker
                  count={newBlank}
                  onCount={setNewBlank}
                  unused={blank.data?.length ?? 0}
                  includeUnused={includeUnused}
                  onIncludeUnused={setIncludeUnused}
                />
              )}
            </div>
            <PrintOptions
              settings={settings}
              onChange={setSettings}
              skip={skip}
              onSkip={setSkip}
              perSheet={layout.perSheet}
            />
          </div>
        )}

        {makeBlank.isError && (
          <ErrorAlert message={errorMessage(makeBlank.error)} />
        )}
        {sizesOk && layout.perSheet === 0 && (
          <ErrorAlert message="That label doesn't fit on the paper. Choose a smaller label, bigger paper, or a smaller margin." />
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void print()}
            disabled={
              total === 0 ||
              layout.perSheet === 0 ||
              !sizesOk ||
              makeBlank.isPending
            }
            className={buttonPrimary}
          >
            <Printer aria-hidden="true" className="size-4" />
            {makeBlank.isPending
              ? "Making blank labels…"
              : `Print ${total} ${total === 1 ? "label" : "labels"}`}
          </button>
          <span className="text-sm text-muted" role="status">
            {layout.perSheet} per sheet ·{" "}
            {Math.max(
              1,
              Math.ceil(
                (total + Math.min(skip, layout.perSheet - 1)) /
                  Math.max(1, layout.perSheet),
              ),
            )}{" "}
            {total > layout.perSheet ? "sheets" : "sheet"}
            {newBlank > 0 &&
              `. The ${newBlank} new blank ${newBlank === 1 ? "label is" : "labels are"} made when you print.`}
          </span>
        </div>

        {sheets.length > 0 && <h2 className="text-lg font-bold">Preview</h2>}
      </main>

      {sheets.length > 0 && (
        <div className="mx-auto max-w-5xl px-4 pb-10 print:max-w-none print:p-0">
          <LabelSheets
            sheets={sheets}
            paper={paper}
            label={label}
            layout={layout}
            cutLines={settings.cutLines}
          />
        </div>
      )}
    </div>
  );
}
