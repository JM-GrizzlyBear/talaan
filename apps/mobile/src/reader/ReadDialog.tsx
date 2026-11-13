import {
  applyChecks,
  canRead,
  type CheckRow,
  chosenRows,
  DETAIL_LABELS,
  type DetailCheck,
  doubtCount,
  type LabRow,
  labRowFlag,
  type MedicineCheck,
  needsCheck,
  notFound,
  type RecordFormState,
  shown,
  todayLocal,
  toCheckRows,
  toDetailChecks,
  toMedicineChecks,
} from "@talaan/client";
import {
  RECORD_TYPE_LABELS,
  RECORD_TYPES,
  type RecordFileInfo,
} from "@talaan/shared";
import { Image } from "expo-image";
import { Camera, FileText, TriangleAlert, Upload } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Modal, ScrollView, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { chooseFiles, type PickedFile, takePhoto } from "../files/phoneFiles";
import { LabFlagBadge } from "../records/RecordParts";
import { useTheme } from "../theme/ThemeProvider";
import { CheckRow as Tick, Select } from "../ui/form";
import {
  Badge,
  Button,
  Buttons,
  Card,
  ErrorNotice,
  Notice,
  Row,
  List,
  Txt,
} from "../ui/kit";
import { ReaderFrame } from "./ReaderFrame";
import { useReader } from "./useReader";

// Reading a photo or PDF, then "Please check" before anything goes into the
// form, the same as the website:
// - "record": the type, title, date, doctor, hospital, medicines, results…
// - "lab": only the lab results
export function ReadDialog({
  mode,
  form,
  attached,
  startWith,
  startWithAttached,
  onApplyRecord,
  onAddRows,
  onClose,
}: {
  mode: "record" | "lab";
  form?: RecordFormState;
  attached: RecordFileInfo[];
  // A photo just taken or chosen, read straight away
  startWith?: PickedFile;
  // An attached file, read straight away (from the record page)
  startWithAttached?: RecordFileInfo;
  onApplyRecord?: (
    form: RecordFormState,
    file: PickedFile | null,
    doubts: number,
  ) => void;
  onAddRows?: (rows: LabRow[]) => void;
  onClose: () => void;
}) {
  const t = useTheme();
  const reader = useReader();
  const { state } = reader;
  const [file, setFile] = useState<PickedFile | null>(startWith ?? null);
  const [checks, setChecks] = useState<DetailCheck[]>([]);
  const [medicines, setMedicines] = useState<MedicineCheck[]>([]);
  const [rows, setRows] = useState<CheckRow[]>([]);
  const [pickError, setPickError] = useState<unknown>(null);
  const [showText, setShowText] = useState(false);

  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    if (startWith) {
      started.current = true;
      void reader.read(startWith);
    } else if (startWithAttached) {
      started.current = true;
      void reader.readAttached(startWithAttached);
    }
  }, [startWith, startWithAttached, reader]);

  // A new reading replaces what's being checked
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state.step === "check") {
      const d = state.result.details;
      if (mode === "record" && form) {
        setChecks(toDetailChecks(d, form, todayLocal()));
        setMedicines(toMedicineChecks(d));
        setRows(toCheckRows(d.labRows));
      } else {
        setRows(toCheckRows(state.result.rows));
      }
    }
  }

  const type =
    (checks.find((c) => c.key === "type" && c.include)?.value as
      RecordFormState["type"] | undefined) ??
    form?.type ??
    "";
  const unsure =
    doubtCount(checks, medicines) +
    rows.filter((r) => r.include && r.doubts.length > 0).length;
  const chosen = rows.filter((r) => r.include).length;

  const pick = async (
    from: () => Promise<PickedFile | PickedFile[] | null>,
  ) => {
    setPickError(null);
    try {
      const got = await from();
      const one = Array.isArray(got) ? got[0] : got;
      if (one) {
        setFile(one);
        void reader.read(one);
      }
    } catch (error) {
      setPickError(error);
    }
  };

  const title =
    state.step === "check"
      ? mode === "lab"
        ? "Check the results"
        : "Check what was read"
      : mode === "lab"
        ? "Read lab results"
        : "Read from a photo or PDF";

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: t.page }}>
        <ReaderFrame {...reader.frame} />
        <View
          style={{
            padding: 16,
            borderBottomWidth: 1,
            borderColor: t.edge,
            backgroundColor: t.card,
          }}
        >
          <Txt tone="heading">{title}</Txt>
        </View>
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 14 }}
          keyboardShouldPersistTaps="handled"
        >
          {state.step === "choose" && (
            <>
              <Txt muted>
                {mode === "lab"
                  ? "Talaan reads the tests, results and normal ranges."
                  : "Talaan reads the type, title, date, doctor and hospital, and the rest it can find: results, medicines, the reading, the HMO and amounts."}{" "}
                It's read here on your phone; the photo isn't sent anywhere to
                be read.
              </Txt>
              <ErrorNotice error={pickError} />
              <Buttons>
                <Button
                  kind="secondary"
                  icon={Camera}
                  onPress={() => void pick(takePhoto)}
                >
                  Take a photo
                </Button>
                <Button
                  kind="secondary"
                  icon={Upload}
                  onPress={() => void pick(chooseFiles)}
                >
                  Choose a photo or PDF
                </Button>
              </Buttons>
              {attached.filter(canRead).length > 0 && (
                <View style={{ gap: 6 }}>
                  <Txt tone="label">Or one already on this record:</Txt>
                  <List>
                    {attached.filter(canRead).map((f, i) => (
                      <Row
                        key={f.id}
                        first={i === 0}
                        icon={FileText}
                        title={f.name}
                        onPress={() => {
                          setFile(null);
                          void reader.readAttached(f);
                        }}
                      />
                    ))}
                  </List>
                </View>
              )}
              <Txt tone="tiny" muted>
                The first time, the reader downloads about 7 MB from Talaan's
                website.
              </Txt>
            </>
          )}

          {state.step === "reading" && (
            <View style={{ gap: 10 }} accessibilityLiveRegion="polite">
              <Txt bold>{state.name}</Txt>
              <Txt muted>
                {state.progress?.step === "preparing"
                  ? "Getting the reader ready… The first time, this downloads about 7 MB."
                  : mode === "lab"
                    ? "Reading the lab results…"
                    : "Reading…"}
              </Txt>
              <View
                accessibilityRole="progressbar"
                style={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: t.edge,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    width: `${Math.max(4, (state.progress?.fraction ?? 0) * 100)}%`,
                    height: 8,
                    backgroundColor: t.brand,
                  }}
                />
              </View>
            </View>
          )}

          {state.step === "failed" && (
            <>
              <Notice tone="error">{state.message}</Notice>
              {mode === "record" && file && form && onApplyRecord ? (
                <Button
                  kind="secondary"
                  onPress={() => onApplyRecord(form, file, 0)}
                >
                  Just add the photo, and type the rest
                </Button>
              ) : null}
            </>
          )}

          {state.step === "check" && (
            <>
              {state.result.pictures.map((src, i) => (
                <Image
                  key={i}
                  source={{ uri: src }}
                  style={{
                    width: "100%",
                    aspectRatio: 0.75,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: t.edge,
                  }}
                  contentFit="contain"
                  accessibilityLabel={`${state.name}, page ${i + 1}`}
                />
              ))}
              {checks.length + medicines.length + rows.length === 0 ? (
                <Notice tone="warn">
                  {mode === "record"
                    ? "Nothing could be read. Try a clearer, straighter photo in good light, or type it in. The photo is still added to the record when you save."
                    : "No results could be read. Try a clearer, straighter photo in good light, or type them in."}
                </Notice>
              ) : (
                <Txt tone="small" muted>
                  {state.result.from === "text"
                    ? "Taken from the PDF's own text. Still check it against the page."
                    : "Compare each one with the photo and fix anything that's wrong. Boxes marked Please check need a closer look."}{" "}
                  Untick anything you don't want.
                </Txt>
              )}
              {checks.map((check, i) => (
                <DetailCard
                  key={check.key}
                  check={check}
                  onChange={(patch) =>
                    setChecks(
                      checks.map((c, j) => (j === i ? { ...c, ...patch } : c)),
                    )
                  }
                />
              ))}
              {medicines.length > 0 && <Txt tone="heading">Medicines</Txt>}
              {medicines.map((m, i) => (
                <MedicineCard
                  key={i}
                  medicine={m}
                  index={i}
                  onChange={(patch) =>
                    setMedicines(
                      medicines.map((x, j) =>
                        j === i ? { ...x, ...patch } : x,
                      ),
                    )
                  }
                />
              ))}
              {rows.length > 0 && mode === "record" && (
                <Txt tone="heading">Lab results</Txt>
              )}
              {rows.map((row, i) => (
                <RowCard
                  key={i}
                  row={row}
                  index={i}
                  onChange={(patch) =>
                    setRows(
                      rows.map((r, j) => (j === i ? { ...r, ...patch } : r)),
                    )
                  }
                />
              ))}
              {mode === "record" &&
                notFound(state.result.details, type).length > 0 && (
                  <Card>
                    <Txt tone="small">
                      <Txt tone="small" bold>
                        Not found:
                      </Txt>{" "}
                      {notFound(state.result.details, type).join(", ")}. They're
                      left blank: fill them in now, or later by editing the
                      record.
                    </Txt>
                  </Card>
                )}
              <Button kind="link" small onPress={() => setShowText(!showText)}>
                {showText
                  ? "Hide the text it read"
                  : "Show all the text it read"}
              </Button>
              {showText && (
                <Card>
                  <Txt tone="tiny" selectable>
                    {state.result.lines.map((l) => l.text).join("\n") ||
                      "(nothing)"}
                  </Txt>
                </Card>
              )}
            </>
          )}
        </ScrollView>
        <View
          style={{
            padding: 12,
            gap: 8,
            borderTopWidth: 1,
            borderColor: t.edge,
            backgroundColor: t.card,
          }}
        >
          {state.step === "check" &&
            mode === "record" &&
            form &&
            onApplyRecord && (
              <Button
                onPress={() =>
                  onApplyRecord(
                    applyChecks(form, checks, chosenRows(rows), medicines),
                    file,
                    unsure,
                  )
                }
              >
                Use in the form
              </Button>
            )}
          {state.step === "check" &&
            mode === "lab" &&
            rows.length > 0 &&
            onAddRows && (
              <Button
                disabled={chosen === 0}
                onPress={() => onAddRows(chosenRows(rows))}
              >
                {`Add ${chosen} ${chosen === 1 ? "result" : "results"} to the form`}
              </Button>
            )}
          <Buttons>
            {(state.step === "check" || state.step === "failed") && (
              <Button
                kind="secondary"
                small
                onPress={() => {
                  setFile(null);
                  reader.reset();
                }}
              >
                Read another
              </Button>
            )}
            <Button kind="secondary" small onPress={onClose}>
              Cancel
            </Button>
          </Buttons>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function Box({
  label,
  value,
  onChange,
  multiline,
  decimal,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  decimal?: boolean;
}) {
  const t = useTheme();
  return (
    <View style={{ gap: 2, flexGrow: 1, flexBasis: 120 }}>
      <Txt tone="tiny" muted bold>
        {label}
      </Txt>
      <TextInput
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        accessibilityLabel={label}
        keyboardType={decimal ? "decimal-pad" : "default"}
        textAlignVertical={multiline ? "top" : "center"}
        style={{
          minHeight: multiline ? 90 : 42,
          borderWidth: 1,
          borderColor: t.edge,
          borderRadius: 8,
          backgroundColor: t.card,
          color: t.ink,
          paddingHorizontal: 10,
          paddingVertical: multiline ? 8 : 0,
          fontSize: 16 * t.scale,
        }}
      />
    </View>
  );
}

function Doubts({ doubts }: { doubts: string[] }) {
  const t = useTheme();
  return (
    <>
      {doubts.map((d) => (
        <View
          key={d}
          style={{ flexDirection: "row", gap: 6, alignItems: "flex-start" }}
        >
          <TriangleAlert size={16} color={t.warn} />
          <Txt tone="small" color={t.warn} style={{ flex: 1 }}>
            {d}
          </Txt>
        </View>
      ))}
    </>
  );
}

function look(include: boolean, unsure: boolean) {
  return !include ? undefined : unsure ? ("warn" as const) : undefined;
}

function DetailCard({
  check,
  onChange,
}: {
  check: DetailCheck;
  onChange: (patch: Partial<DetailCheck>) => void;
}) {
  const unsure = needsCheck(check.doubts);
  const label = DETAIL_LABELS[check.key];
  return (
    <Card
      tone={look(check.include, unsure)}
      style={{ opacity: check.include ? 1 : 0.7 }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Tick
            label={label}
            value={check.include}
            onChange={(include) => onChange({ include })}
          />
        </View>
        {unsure && check.include ? (
          <Badge tone="warn">Please check</Badge>
        ) : null}
      </View>
      {check.key === "type" ? (
        <Select
          label={label}
          value={check.value as (typeof RECORD_TYPES)[number]}
          onChange={(value) => onChange({ value })}
          options={RECORD_TYPES.map((v) => ({
            value: v,
            label: RECORD_TYPE_LABELS[v],
          }))}
        />
      ) : (
        <Box
          label={check.key === "recordDate" ? `${label} (YYYY-MM-DD)` : label}
          value={check.value}
          onChange={(value) => onChange({ value })}
          multiline={check.key === "reading"}
          decimal={["totalAmount", "hmoCovered", "youPaid"].includes(check.key)}
        />
      )}
      {unsure ? <Doubts doubts={check.doubts} /> : null}
      {check.current ? (
        <Txt tone="small" muted>
          The form has “{shown(check.key, check.current)}”.{" "}
          {check.include
            ? "This will replace it."
            : "Tick to use this instead."}
        </Txt>
      ) : null}
      {check.line && check.key !== "reading" ? (
        <Txt tone="tiny" muted numberOfLines={2}>
          From: {check.line}
        </Txt>
      ) : null}
    </Card>
  );
}

function MedicineCard({
  medicine,
  index,
  onChange,
}: {
  medicine: MedicineCheck;
  index: number;
  onChange: (patch: Partial<MedicineCheck>) => void;
}) {
  const unsure = medicine.doubts.length > 0;
  return (
    <Card
      tone={look(medicine.include, unsure)}
      style={{ opacity: medicine.include ? 1 : 0.7 }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Tick
            label={`Medicine ${index + 1}`}
            value={medicine.include}
            onChange={(include) => onChange({ include })}
          />
        </View>
        {unsure && medicine.include ? (
          <Badge tone="warn">Please check</Badge>
        ) : null}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Box
          label="Medicine"
          value={medicine.name}
          onChange={(name) => onChange({ name })}
        />
        <Box
          label="Dose"
          value={medicine.dose}
          onChange={(dose) => onChange({ dose })}
        />
        <Box
          label="How often"
          value={medicine.frequency}
          onChange={(frequency) => onChange({ frequency })}
        />
      </View>
      {unsure ? <Doubts doubts={medicine.doubts} /> : null}
      <Txt tone="tiny" muted numberOfLines={2}>
        From: {medicine.line}
      </Txt>
    </Card>
  );
}

function RowCard({
  row,
  index,
  onChange,
}: {
  row: CheckRow;
  index: number;
  onChange: (patch: Partial<CheckRow>) => void;
}) {
  const unsure = row.doubts.length > 0;
  return (
    <Card
      tone={look(row.include, unsure)}
      style={{ opacity: row.include ? 1 : 0.6 }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Tick
            label="Add this result"
            value={row.include}
            onChange={(include) => onChange({ include })}
          />
        </View>
        <LabFlagBadge flag={labRowFlag(row)} />
      </View>
      {unsure ? <Doubts doubts={[`${row.doubts.join(". ")}.`]} /> : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Box
          label={`Test, row ${index + 1}`}
          value={row.name}
          onChange={(name) => onChange({ name })}
        />
        <Box
          label="Result"
          value={row.value}
          onChange={(value) => onChange({ value })}
        />
        <Box
          label="Unit"
          value={row.unit}
          onChange={(unit) => onChange({ unit })}
        />
        <Box
          label="Normal from"
          value={row.rangeLow}
          onChange={(rangeLow) => onChange({ rangeLow })}
          decimal
        />
        <Box
          label="Normal to"
          value={row.rangeHigh}
          onChange={(rangeHigh) => onChange({ rangeHigh })}
          decimal
        />
      </View>
      <Txt tone="tiny" muted>
        Read as: “{row.line}”
      </Txt>
    </Card>
  );
}
