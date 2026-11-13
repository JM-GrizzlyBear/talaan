import {
  PAPER_SIZES,
  type PaperSizeId,
  useMedicalId,
  useRecordAccounts,
} from "@talaan/client";
import { Stack, useLocalSearchParams } from "expo-router";
import { FileDown, Printer } from "lucide-react-native";
import { useState } from "react";
import {
  summaryHtml,
  walletCardHtml,
} from "../../src/medical/medicalPrintHtml";
import { usePersonParams } from "../../src/medical/usePersonParams";
import { printPage, savePdf } from "../../src/print/printing";
import { CheckRow, Chips, Select } from "../../src/ui/form";
import {
  Button,
  Buttons,
  Card,
  ErrorNotice,
  Loading,
  Screen,
  Txt,
} from "../../src/ui/kit";

// /medical-id/print?…&what=card|summary
export default function PrintMedicalId() {
  const accounts = useRecordAccounts();
  const { person } = usePersonParams(accounts.data);
  const medicalId = useMedicalId(person);
  const card = useLocalSearchParams<{ what?: string }>().what === "card";
  const [paper, setPaper] = useState<PaperSizeId>("a4");
  const [landscape, setLandscape] = useState(false);
  const [philhealth, setPhilhealth] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const size = PAPER_SIZES[paper];
  const page =
    landscape && !card
      ? { width: size.height, height: size.width }
      : { width: size.width, height: size.height };

  const run = async (how: typeof printPage) => {
    if (!medicalId.data) return;
    setBusy(true);
    setError(null);
    try {
      const html = card
        ? walletCardHtml(medicalId.data, philhealth, page)
        : summaryHtml(medicalId.data, page, landscape);
      await how(html, page);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: card ? "Print a wallet card" : "Print a one-page summary",
        }}
      />
      <Txt muted>
        {card
          ? "Credit-card size, front and back. Cut along the dashed line, fold in the middle, and glue or laminate it. Print at “Actual size” (100%)."
          : "Everything on the Medical ID, for a doctor visit or the hospital."}
      </Txt>
      {accounts.isPending || medicalId.isPending ? <Loading /> : null}
      <ErrorNotice error={medicalId.error ?? error} />
      <Card>
        <Select
          label="Paper"
          value={paper}
          onChange={setPaper}
          options={Object.entries(PAPER_SIZES).map(([value, p]) => ({
            value: value as PaperSizeId,
            label: p.name,
          }))}
        />
        {!card ? (
          <Chips
            label="Orientation"
            value={landscape ? "landscape" : "portrait"}
            onChange={(v) => setLandscape(v === "landscape")}
            options={[
              { value: "portrait", label: "Portrait" },
              { value: "landscape", label: "Landscape" },
            ]}
          />
        ) : (
          <CheckRow
            label="Put the PhilHealth ID on the card"
            value={philhealth}
            onChange={setPhilhealth}
          />
        )}
      </Card>
      <Buttons>
        <Button
          icon={Printer}
          busy={busy}
          disabled={!medicalId.data}
          onPress={() => void run(printPage)}
        >
          Print
        </Button>
        <Button
          kind="secondary"
          icon={FileDown}
          busy={busy}
          disabled={!medicalId.data}
          onPress={() => void run(savePdf)}
        >
          Save or share as PDF
        </Button>
      </Buttons>
    </Screen>
  );
}
