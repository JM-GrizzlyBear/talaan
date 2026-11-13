import {
  columnsFor,
  PAPER_SIZES,
  type PaperSizeId,
  useLabs,
  useRecordAccounts,
} from "@talaan/client";
import { Stack, useLocalSearchParams } from "expo-router";
import { FileDown, Printer } from "lucide-react-native";
import { useState } from "react";
import {
  DEFAULT_LAB_PRINT,
  labsPrintHtml,
  pageSize,
} from "../../src/labs/labsPrintHtml";
import { printPage, savePdf } from "../../src/print/printing";
import { Chips, CheckRow, Select } from "../../src/ui/form";
import {
  Button,
  Buttons,
  Card,
  ErrorNotice,
  Loading,
  Screen,
  Txt,
} from "../../src/ui/kit";

// Lab results on paper (or a PDF): the website's print page
export default function PrintLabs() {
  const params = useLocalSearchParams<{ owner?: string; person?: string }>();
  const accounts = useRecordAccounts();
  const account =
    accounts.data?.find((a) => a.ownerId === params.owner) ??
    accounts.data?.[0];
  const labs = useLabs(account?.ownerId, params.person ?? "self");
  const [settings, setSettings] = useState(DEFAULT_LAB_PRINT);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof settings>(
    key: K,
    value: (typeof settings)[K],
  ) => setSettings((s) => ({ ...s, [key]: value }));

  const run = async (how: typeof printPage) => {
    if (!labs.data) return;
    setBusy(true);
    setError(null);
    try {
      const html = labsPrintHtml(
        settings,
        labs.data.personName,
        labs.data.series,
        columnsFor(labs.data.records, labs.data.series),
      );
      await how(html, pageSize(settings));
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: "Print lab results" }} />
      {labs.isPending ? <Loading /> : null}
      <ErrorNotice error={labs.error ?? error} />
      {labs.data ? (
        <Txt muted>{`Lab results: ${labs.data.personName}`}</Txt>
      ) : null}
      <Card>
        <Select
          label="Paper"
          value={settings.paper}
          onChange={(v) => set("paper", v as PaperSizeId)}
          options={Object.entries(PAPER_SIZES).map(([value, p]) => ({
            value: value as PaperSizeId,
            label: p.name,
          }))}
        />
        <Chips
          label="Orientation"
          value={settings.orientation}
          onChange={(v) => set("orientation", v)}
          options={[
            { value: "portrait", label: "Portrait" },
            { value: "landscape", label: "Landscape" },
          ]}
        />
        <Txt tone="label">Include</Txt>
        <CheckRow
          label="Needs attention"
          value={settings.attention}
          onChange={(v) => set("attention", v)}
        />
        <CheckRow
          label="Table of results"
          value={settings.table}
          onChange={(v) => set("table", v)}
        />
        <CheckRow
          label="Charts"
          value={settings.charts}
          onChange={(v) => set("charts", v)}
        />
        <Select
          label="Dates in the table"
          value={String(settings.dates)}
          onChange={(v) => set("dates", Number(v))}
          options={[
            { value: "4", label: "The latest 4" },
            { value: "6", label: "The latest 6" },
            { value: "8", label: "The latest 8" },
            { value: "12", label: "The latest 12" },
            { value: "0", label: "All of them" },
          ]}
        />
      </Card>
      <Buttons>
        <Button
          icon={Printer}
          busy={busy}
          disabled={!labs.data}
          onPress={() => void run(printPage)}
        >
          Print
        </Button>
        <Button
          kind="secondary"
          icon={FileDown}
          busy={busy}
          disabled={!labs.data}
          onPress={() => void run(savePdf)}
        >
          Save or share as PDF
        </Button>
      </Buttons>
    </Screen>
  );
}
