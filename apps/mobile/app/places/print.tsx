import {
  CUSTOM_LIMITS,
  DEFAULT_SETTINGS,
  LABEL_SIZES,
  type LabelSizeId,
  labelSize,
  MARGINS,
  PAPER_SIZES,
  type PaperId,
  paperSize,
  placeTree,
  type PrintSettings,
  sheetLayout,
  toSheets,
  useBlankLabels,
  useCreateBlankLabels,
  usePlaces,
  useRecordAccounts,
} from "@talaan/client";
import { PLACE_LIMITS, type PlaceSummary } from "@talaan/shared";
import { Stack, useLocalSearchParams } from "expo-router";
import { FileDown, Printer } from "lucide-react-native";
import { useMemo, useState } from "react";
import { View } from "react-native";
import { type LabelItem, labelSheetsHtml } from "../../src/places/labelsHtml";
import { printPage, savePdf } from "../../src/print/printing";
import { CheckRow, Field, Select } from "../../src/ui/form";
import {
  Button,
  Buttons,
  Card,
  ErrorNotice,
  Loading,
  Notice,
  Screen,
  Txt,
} from "../../src/ui/kit";

const mm = (n: number) => `${Math.round(n * 10) / 10}`;

// Print QR labels: which places, copies, blank labels, paper and label size
export default function PrintLabels() {
  const params = useLocalSearchParams<{
    owner?: string;
    ids?: string;
    blank?: string;
  }>();
  const accounts = useRecordAccounts();
  const account =
    accounts.data?.find((a) => a.ownerId === params.owner) ??
    accounts.data?.[0];
  const canChange = account?.role === "owner" || account?.role === "manage";
  const places = usePlaces(account?.ownerId);
  const blank = useBlankLabels(canChange ? account?.ownerId : undefined);
  const makeBlank = useCreateBlankLabels();
  const [settings, setSettings] = useState<PrintSettings>(DEFAULT_SETTINGS);
  const [chosen, setChosen] = useState<Set<string>>(
    () => new Set(params.ids?.split(",").filter(Boolean) ?? []),
  );
  const [copies, setCopies] = useState(1);
  const [newBlank, setNewBlank] = useState(0);
  const [includeUnused, setIncludeUnused] = useState(params.blank === "unused");
  const [skip, setSkip] = useState(0);
  const [ticked, setTicked] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const placeList = places.data?.places;
  if (placeList && !ticked) {
    setTicked(true);
    if (chosen.size === 0 && !params.blank)
      setChosen(new Set(placeList.map((p) => p.id)));
  }
  const set = <K extends keyof PrintSettings>(
    key: K,
    value: PrintSettings[K],
  ) => setSettings((s) => ({ ...s, [key]: value }));
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
    for (const place of ordered.filter((p) => chosen.has(p.id)))
      for (let i = 0; i < copies; i++)
        list.push({ code: place.code, name: place.name, kind: place.kind });
    if (includeUnused)
      for (const b of blank.data ?? [])
        list.push({ code: b.code, name: null, kind: null });
    return list;
  }, [placeList, chosen, copies, includeUnused, blank.data]);
  const total = items.length + newBlank;
  const sheetsCount = Math.max(
    1,
    Math.ceil(
      (total + Math.min(skip, layout.perSheet - 1)) /
        Math.max(1, layout.perSheet),
    ),
  );

  const run = async (how: typeof printPage) => {
    setBusy(true);
    setError(null);
    try {
      let all = items;
      if (newBlank > 0 && account) {
        await makeBlank.mutateAsync({
          ownerId: account.ownerId,
          count: newBlank,
        });
        const fresh = await blank.refetch();
        setNewBlank(0);
        setIncludeUnused(true);
        const named = items.filter((i) => i.name !== null);
        all = [
          ...named,
          ...(fresh.data ?? []).map((b) => ({
            code: b.code,
            name: null,
            kind: null,
          })),
        ];
      }
      await how(
        labelSheetsHtml(
          toSheets(all, layout.perSheet, skip),
          paper,
          label,
          layout,
          settings.cutLines,
        ),
        paper,
      );
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  const toggle = (id: string, on: boolean) => {
    const next = new Set(chosen);
    if (on) next.add(id);
    else next.delete(id);
    setChosen(next);
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: "Print QR labels" }} />
      <Txt muted>
        Print on sticker paper, or plain paper and tape. In the print window,
        choose the same paper size and “Actual size” (100%), not “Fit to page”.
      </Txt>
      {places.isPending ? <Loading /> : null}
      <ErrorNotice error={places.error ?? makeBlank.error ?? error} />
      {placeList ? (
        <>
          <Card>
            {placeList.length > 0 ? (
              <>
                <Txt tone="label">Labels for these places</Txt>
                <View style={{ flexDirection: "row", gap: 16 }}>
                  <Button
                    kind="link"
                    small
                    onPress={() =>
                      setChosen(new Set(placeList.map((p) => p.id)))
                    }
                  >
                    All
                  </Button>
                  <Button
                    kind="link"
                    small
                    onPress={() => setChosen(new Set())}
                  >
                    None
                  </Button>
                </View>
                {placeTree(placeList).map(({ place, depth }) => (
                  <View key={place.id} style={{ paddingLeft: depth * 20 }}>
                    <CheckRow
                      label={place.name}
                      value={chosen.has(place.id)}
                      onChange={(on) => toggle(place.id, on)}
                    />
                  </View>
                ))}
                <Select
                  label="Copies of each place's label"
                  value={String(copies)}
                  onChange={(v) => setCopies(Number(v))}
                  options={[1, 2, 3, 4, 5].map((n) => ({
                    value: String(n),
                    label: String(n),
                  }))}
                />
              </>
            ) : (
              <Txt muted>
                No places yet. You can still print blank labels and name them
                later.
              </Txt>
            )}
            {canChange ? (
              <>
                <Field
                  label="New blank labels"
                  keyboardType="number-pad"
                  value={String(newBlank)}
                  onChangeText={(v) =>
                    setNewBlank(
                      Math.min(
                        PLACE_LIMITS.blankAtOnce,
                        Math.max(0, Math.floor(Number(v) || 0)),
                      ),
                    )
                  }
                  hint={`Stick them on boxes and folders now, and name each one the first time you scan it. Up to ${PLACE_LIMITS.blankAtOnce} at a time.`}
                />
                {(blank.data?.length ?? 0) > 0 ? (
                  <CheckRow
                    label={`Also print the ${blank.data!.length} blank ${blank.data!.length === 1 ? "label" : "labels"} not named yet`}
                    value={includeUnused}
                    onChange={setIncludeUnused}
                  />
                ) : null}
              </>
            ) : null}
          </Card>
          <Card>
            <Select
              label="Paper"
              value={settings.paper}
              onChange={(v) => set("paper", v as PaperId)}
              options={[
                ...Object.entries(PAPER_SIZES).map(([value, p]) => ({
                  value: value as PaperId,
                  label: `${p.name} · ${mm(p.width)} × ${mm(p.height)} mm`,
                })),
                { value: "custom" as PaperId, label: "Custom size" },
              ]}
            />
            {settings.paper === "custom" ? (
              <SizeInputs
                label="Paper"
                value={settings.customPaper}
                limits={CUSTOM_LIMITS.paper}
                onChange={(s) => set("customPaper", s)}
              />
            ) : null}
            <Select
              label="Label size"
              value={settings.label}
              onChange={(v) => set("label", v as LabelSizeId)}
              options={[
                ...Object.entries(LABEL_SIZES).map(([value, l]) => ({
                  value: value as LabelSizeId,
                  label: `${l.name} · ${l.width} × ${l.height} mm · ${sheetLayout(paper, l, settings.margin).perSheet} per sheet`,
                })),
                { value: "custom" as LabelSizeId, label: "Custom size" },
              ]}
            />
            {settings.label === "custom" ? (
              <SizeInputs
                label="Label"
                value={settings.customLabel}
                limits={CUSTOM_LIMITS.label}
                onChange={(s) => set("customLabel", s)}
              />
            ) : null}
            <Select
              label="Page margin"
              value={String(settings.margin)}
              onChange={(v) => set("margin", Number(v))}
              options={MARGINS.map((m) => ({
                value: String(m.value),
                label: m.name,
              }))}
            />
            <Field
              label="Labels already used on the first sheet"
              keyboardType="number-pad"
              value={String(skip)}
              onChangeText={(v) =>
                setSkip(Math.max(0, Math.floor(Number(v) || 0)))
              }
            />
            <CheckRow
              label="Show cut lines (for plain paper)"
              value={settings.cutLines}
              onChange={(v) => set("cutLines", v)}
            />
          </Card>
          {sizesOk && layout.perSheet === 0 ? (
            <Notice tone="error">
              That label doesn't fit on the paper. Choose a smaller label,
              bigger paper, or a smaller margin.
            </Notice>
          ) : null}
          <Txt tone="small" muted>
            {`${layout.perSheet} per sheet · ${sheetsCount} ${total > layout.perSheet ? "sheets" : "sheet"}${newBlank > 0 ? `. The ${newBlank} new blank ${newBlank === 1 ? "label is" : "labels are"} made when you print.` : ""}`}
          </Txt>
          <Buttons>
            <Button
              icon={Printer}
              busy={busy}
              disabled={total === 0 || layout.perSheet === 0 || !sizesOk}
              onPress={() => void run(printPage)}
            >
              {`Print ${total} ${total === 1 ? "label" : "labels"}`}
            </Button>
            <Button
              kind="secondary"
              icon={FileDown}
              busy={busy}
              disabled={total === 0 || layout.perSheet === 0 || !sizesOk}
              onPress={() => void run(savePdf)}
            >
              Save as PDF
            </Button>
          </Buttons>
        </>
      ) : null}
    </Screen>
  );
}

function SizeInputs({
  label,
  value,
  limits,
  onChange,
}: {
  label: string;
  value: { width: number; height: number };
  limits: { min: number; max: number };
  onChange: (size: { width: number; height: number }) => void;
}) {
  const set = (key: "width" | "height", text: string) => {
    const n = Number(text);
    if (Number.isFinite(n)) onChange({ ...value, [key]: n });
  };
  const problem = (n: number) =>
    n < limits.min || n > limits.max
      ? `${limits.min} to ${limits.max} mm`
      : undefined;
  return (
    <View style={{ flexDirection: "row", gap: 10 }}>
      <View style={{ flex: 1 }}>
        <Field
          label={`${label} width (mm)`}
          keyboardType="decimal-pad"
          value={String(value.width)}
          onChangeText={(v) => set("width", v)}
          error={problem(value.width)}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Field
          label={`${label} height (mm)`}
          keyboardType="decimal-pad"
          value={String(value.height)}
          onChangeText={(v) => set("height", v)}
          error={problem(value.height)}
        />
      </View>
    </View>
  );
}
