import {
  addToForm,
  emptyLabRow,
  emptyMedicine,
  fieldsFromForm,
  type LabRow,
  labRowFlag,
  parseNumber,
  placeOptions,
  type RecordFormState,
  sentRowIndexes,
  TITLE_HINTS,
  uploadRecordFile,
  useCreateRecord,
  usePlaces,
  useRecordFiles,
  useUpdateRecord,
} from "@talaan/client";
import {
  RECORD_LIMITS,
  RECORD_TYPE_LABELS,
  RECORD_TYPES,
  type RecordAccountInfo,
  type RecordFileInfo,
  type RecordInfo,
} from "@talaan/shared";
import { useRouter } from "expo-router";
import { Camera, Plus, ScanText, Upload, X } from "lucide-react-native";
import { type ReactNode, useState } from "react";
import { Pressable, View } from "react-native";
import { fieldError, messageOf } from "../api/ApiError";
import { chooseFiles, type PickedFile, takePhoto } from "../files/phoneFiles";
import { ReadDialog } from "../reader/ReadDialog";
import { useTheme } from "../theme/ThemeProvider";
import { DateField } from "../ui/DateField";
import { Field, Select } from "../ui/form";
import {
  Button,
  Buttons,
  Card,
  ErrorNotice,
  Notice,
  Screen,
  Txt,
} from "../ui/kit";
import { LabFlagBadge } from "./RecordParts";
import { RECORD_ICONS } from "./RecordTypeIcon";

type Set = <K extends keyof RecordFormState>(
  key: K,
  value: RecordFormState[K],
) => void;

// Adding or editing a record: start from a photo, the type, then the fields
// for that type (the same form as the website's)
export function RecordForm({
  account,
  record,
  initial,
  readFileId,
}: {
  account: RecordAccountInfo;
  record?: RecordInfo;
  initial: RecordFormState;
  // From the record page's "Read lab values from this"
  readFileId?: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  // Photos read into the form: added to the record once it's saved
  const [pending, setPending] = useState<PickedFile[]>([]);
  const [adding, setAdding] = useState(false);
  const create = useCreateRecord();
  const update = useUpdateRecord();
  const save = record ? update : create;

  const set: Set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setLocalErrors({});
  };
  const error = (key: string) =>
    localErrors[key] ?? fieldError(save.error, key);
  const labSent = sentRowIndexes(form.results);
  const medSent = sentRowIndexes(form.medicines);
  const rowError = (
    list: "results" | "medicines",
    index: number,
    key: string,
  ) => {
    const sent = (list === "results" ? labSent : medSent).indexOf(index);
    return sent === -1 ? undefined : error(`details.${list}.${sent}.${key}`);
  };

  async function submit() {
    const { fields, errors } = fieldsFromForm(form);
    setLocalErrors(errors);
    if (!fields) return;
    try {
      const saved = record
        ? await update.mutateAsync({ id: record.id, fields })
        : await create.mutateAsync({ ownerId: account.ownerId, fields });
      let fileProblem: string | null = null;
      if (pending.length > 0) {
        setAdding(true);
        for (const file of pending) {
          try {
            await uploadRecordFile(saved.id, file, () => {});
          } catch (problem) {
            fileProblem = messageOf(problem);
          }
        }
        setAdding(false);
      }
      const params = fileProblem ? { fileProblem } : {};
      if (record) router.back();
      else
        router.replace({
          pathname: "/records/[id]",
          params: { id: saved.id, ...params },
        });
    } catch {
      // Shown from save.error
    }
  }

  const hasFieldErrors =
    Object.keys(localErrors).length > 0 ||
    Object.keys(
      (save.error as { fieldErrors?: object } | null)?.fieldErrors ?? {},
    ).length > 0;

  return (
    <Screen
      problem={
        hasFieldErrors
          ? "Please check the boxes marked in red above."
          : save.isError
            ? messageOf(save.error)
            : null
      }
      footer={
        <Buttons>
          <Button onPress={() => void submit()} busy={save.isPending || adding}>
            {adding
              ? "Adding the photo…"
              : save.isPending
                ? "Saving…"
                : record
                  ? "Save changes"
                  : "Save record"}
          </Button>
          <Button kind="secondary" onPress={() => router.back()}>
            Cancel
          </Button>
        </Buttons>
      }
    >
      {account.role !== "owner" ? (
        <Txt muted>{account.ownerName}'s records</Txt>
      ) : null}
      {save.isError ? (
        <Notice tone="error">
          {hasFieldErrors
            ? "Please check the boxes marked in red."
            : messageOf(save.error)}
        </Notice>
      ) : null}

      <StartFromPhoto
        form={form}
        onForm={(next) => {
          setForm(next);
          setLocalErrors({});
        }}
        recordId={record?.id}
        pending={pending}
        onPending={setPending}
      />

      <TypePicker form={form} set={set} error={error} />

      {form.type ? (
        <>
          <Part title="About it">
            <Select
              label="Who it's for"
              value={form.profileId}
              onChange={(v) => set("profileId", v)}
              options={account.people.map((p) => ({
                value: p.profileId ?? "",
                label: p.name,
              }))}
              error={error("profileId")}
            />
            <Field
              label="Title (optional)"
              value={form.title}
              onChangeText={(v) => set("title", v)}
              maxLength={RECORD_LIMITS.title}
              placeholder={TITLE_HINTS[form.type]}
              error={error("title")}
            />
            <DateField
              label="Date"
              value={form.recordDate}
              onChange={(v) => set("recordDate", v)}
              maximumToday
              error={error("recordDate")}
            />
            <Field
              label="Doctor (optional)"
              value={form.doctor}
              onChangeText={(v) => set("doctor", v)}
              maxLength={RECORD_LIMITS.person}
              error={error("doctor")}
            />
            <Field
              label="Clinic or hospital (optional)"
              value={form.facility}
              onChangeText={(v) => set("facility", v)}
              maxLength={RECORD_LIMITS.person}
              error={error("facility")}
            />
          </Part>

          {form.type === "imaging" && (
            <Part title="X-ray / imaging">
              <Field
                label="What was imaged (optional)"
                value={form.bodyPart}
                onChangeText={(v) => set("bodyPart", v)}
                placeholder="Chest PA, left knee, whole abdomen…"
                maxLength={120}
                error={error("details.bodyPart")}
              />
              <Field
                label="Reading / impression (optional)"
                value={form.reading}
                onChangeText={(v) => set("reading", v)}
                multiline
                maxLength={RECORD_LIMITS.reading}
                error={error("details.reading")}
              />
            </Part>
          )}

          {form.type === "lab" && (
            <LabRows
              form={form}
              set={set}
              error={error}
              rowError={rowError}
              recordId={record?.id}
              readFileId={readFileId}
            />
          )}

          {form.type === "prescription" && (
            <MedicineRows form={form} set={set} rowError={rowError} />
          )}

          {form.type === "vaccination" && (
            <Part title="Vaccine">
              <Field
                label="Vaccine (optional)"
                value={form.vaccine}
                onChangeText={(v) => set("vaccine", v)}
                placeholder="Flu, Pneumococcal, Hepatitis B…"
                maxLength={120}
                error={error("details.vaccine")}
              />
              <Field
                label="Dose (optional)"
                value={form.dose}
                onChangeText={(v) => set("dose", v)}
                placeholder="1st dose, Booster"
                maxLength={40}
                error={error("details.dose")}
              />
            </Part>
          )}

          {form.type === "billing" && (
            <Billing form={form} set={set} error={error} />
          )}

          <KeptIn form={form} set={set} error={error} account={account} />

          <Field
            label="Notes (optional)"
            value={form.notes}
            onChangeText={(v) => set("notes", v)}
            multiline
            maxLength={RECORD_LIMITS.notes}
            error={error("notes")}
          />
        </>
      ) : null}
    </Screen>
  );
}

function Part({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <Txt tone="heading">{title}</Txt>
      <View style={{ gap: 14 }}>{children}</View>
    </Card>
  );
}

function TypePicker({
  form,
  set,
  error,
}: {
  form: RecordFormState;
  set: Set;
  error: (key: string) => string | undefined;
}) {
  const t = useTheme();
  return (
    <View style={{ gap: 8 }} accessibilityRole="radiogroup">
      <Txt tone="label">Type</Txt>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {RECORD_TYPES.map((type) => {
          const Icon = RECORD_ICONS[type];
          const on = form.type === type;
          return (
            <Pressable
              key={type}
              onPress={() => set("type", type)}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={RECORD_TYPE_LABELS[type]}
              style={{
                width: "48%",
                flexGrow: 1,
                minHeight: 64,
                justifyContent: "center",
                gap: 4,
                borderRadius: 12,
                borderWidth: on ? 2 : 1,
                borderColor: on ? t.brand : t.edge,
                backgroundColor: on ? t.brandSoft : t.card,
                paddingHorizontal: 12,
                paddingVertical: 8,
              }}
            >
              <Icon size={20} color={t.brand} />
              <Txt tone="label" color={on ? t.deep : t.ink}>
                {RECORD_TYPE_LABELS[type]}
              </Txt>
            </Pressable>
          );
        })}
      </View>
      {error("type") ? (
        <Txt tone="small" color={t.danger}>
          {error("type")}
        </Txt>
      ) : null}
    </View>
  );
}

// "Start from a photo or PDF" (new) / "Read from a photo or PDF" (editing)
function StartFromPhoto({
  form,
  onForm,
  recordId,
  pending,
  onPending,
}: {
  form: RecordFormState;
  onForm: (form: RecordFormState) => void;
  recordId?: string;
  pending: PickedFile[];
  onPending: (files: PickedFile[]) => void;
}) {
  const t = useTheme();
  const files = useRecordFiles(recordId);
  const [reading, setReading] = useState<{ file?: PickedFile } | null>(null);
  const [done, setDone] = useState<{ doubts: number } | null>(null);
  const [pickError, setPickError] = useState<unknown>(null);

  const pick = async (
    from: () => Promise<PickedFile | PickedFile[] | null>,
  ) => {
    setPickError(null);
    try {
      const got = await from();
      const file = Array.isArray(got) ? got[0] : got;
      if (file) {
        setDone(null);
        setReading({ file });
      }
    } catch (error) {
      setPickError(error);
    }
  };

  return (
    <View
      style={{
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: t.brand,
        backgroundColor: t.brandSoft,
        borderRadius: 16,
        padding: 14,
        gap: 10,
      }}
    >
      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
        <ScanText size={20} color={t.brand} />
        <Txt bold>
          {recordId ? "Read from a photo or PDF" : "Start from a photo or PDF"}
        </Txt>
      </View>
      <Txt tone="small" muted>
        Talaan reads the date, doctor, hospital and more, and fills the form.
        You check everything first; anything it can't read stays blank for
        later.
      </Txt>
      <ErrorNotice error={pickError} />
      <Buttons>
        <Button
          kind="secondary"
          small
          icon={Camera}
          onPress={() => void pick(takePhoto)}
        >
          Take a photo
        </Button>
        <Button
          kind="secondary"
          small
          icon={Upload}
          onPress={() => void pick(chooseFiles)}
        >
          Choose a photo or PDF
        </Button>
        {recordId && (files.data?.length ?? 0) > 0 ? (
          <Button
            kind="secondary"
            small
            onPress={() => {
              setDone(null);
              setReading({});
            }}
          >
            One already on this record
          </Button>
        ) : null}
      </Buttons>
      {done ? (
        <Notice>
          {done.doubts > 0
            ? `Filled in from the paper. ${done.doubts} ${done.doubts === 1 ? "box was" : "boxes were"} marked Please check: look again before saving.`
            : "Filled in from the paper. Look it over, then save."}
        </Notice>
      ) : null}
      {pending.length > 0 ? (
        <View style={{ gap: 6 }}>
          <Txt tone="small" bold>
            Added to the record when you save:
          </Txt>
          {pending.map((file, i) => (
            <View
              key={`${file.name}-${i}`}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                borderWidth: 1,
                borderColor: t.edge,
                borderRadius: 8,
                backgroundColor: t.card,
                paddingHorizontal: 10,
                paddingVertical: 6,
              }}
            >
              <Txt tone="small" style={{ flex: 1 }} numberOfLines={1}>
                {file.name}
              </Txt>
              <Pressable
                onPress={() => onPending(pending.filter((_, j) => j !== i))}
                accessibilityRole="button"
                accessibilityLabel={`Don't add ${file.name}`}
                hitSlop={8}
              >
                <X size={18} color={t.muted} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
      {reading ? (
        <ReadDialog
          mode="record"
          form={form}
          attached={files.data ?? []}
          startWith={reading.file}
          onClose={() => setReading(null)}
          onApplyRecord={(next, file, doubts) => {
            onForm(next);
            if (file && !pending.includes(file)) onPending([...pending, file]);
            setDone({ doubts });
            setReading(null);
          }}
        />
      ) : null}
    </View>
  );
}

function LabRows({
  form,
  set,
  error,
  rowError,
  recordId,
  readFileId,
}: {
  form: RecordFormState;
  set: Set;
  error: (key: string) => string | undefined;
  rowError: (
    list: "results" | "medicines",
    index: number,
    key: string,
  ) => string | undefined;
  recordId?: string;
  readFileId?: string;
}) {
  const t = useTheme();
  const rows = form.results;
  const files = useRecordFiles(recordId);
  const [reading, setReading] = useState(Boolean(readFileId));
  const [added, setAdded] = useState<number | null>(null);
  const ready = !readFileId || files.isSuccess;
  const change = (index: number, key: keyof LabRow, value: string) =>
    set(
      "results",
      rows.map((r, i) => (i === index ? { ...r, [key]: value } : r)),
    );

  return (
    <Part title="Results">
      <Txt tone="small" muted>
        Copy each line from the printout, or let Talaan read a photo or PDF of
        it. The normal range is on the same line, like “12.0 – 16.0”.
      </Txt>
      <Button
        kind="secondary"
        small
        icon={ScanText}
        onPress={() => {
          setAdded(null);
          setReading(true);
        }}
      >
        Read from a photo or PDF
      </Button>
      {added !== null ? (
        <Notice>{`Added ${added} ${added === 1 ? "result" : "results"} from the printout. Check them below, then save.`}</Notice>
      ) : null}
      {rows.map((row, index) => {
        const example = (text: string) => (index === 0 ? text : undefined);
        return (
          <View
            key={index}
            style={{
              borderWidth: 1,
              borderColor: t.edge,
              borderRadius: 12,
              padding: 12,
              gap: 10,
            }}
          >
            <Field
              label={`Test ${index + 1}`}
              value={row.name}
              onChangeText={(v) => change(index, "name", v)}
              placeholder={example("Hemoglobin")}
              maxLength={80}
              error={rowError("results", index, "name")}
            />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Field
                  label="Result"
                  value={row.value}
                  onChangeText={(v) => change(index, "value", v)}
                  placeholder={example("13.5")}
                  maxLength={30}
                  error={rowError("results", index, "value")}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="Unit"
                  value={row.unit}
                  onChangeText={(v) => change(index, "unit", v)}
                  placeholder={example("g/dL")}
                  maxLength={20}
                  error={rowError("results", index, "unit")}
                />
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Field
                  label="Normal from"
                  value={row.rangeLow}
                  onChangeText={(v) => change(index, "rangeLow", v)}
                  keyboardType="decimal-pad"
                  placeholder={example("12.0")}
                  error={rowError("results", index, "rangeLow")}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="Normal to"
                  value={row.rangeHigh}
                  onChangeText={(v) => change(index, "rangeHigh", v)}
                  keyboardType="decimal-pad"
                  placeholder={example("16.0")}
                  error={rowError("results", index, "rangeHigh")}
                />
              </View>
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <LabFlagBadge flag={labRowFlag(row)} />
              <Button
                kind="link"
                small
                label={`Remove test ${index + 1}`}
                onPress={() =>
                  set(
                    "results",
                    rows.length === 1
                      ? [emptyLabRow()]
                      : rows.filter((_, i) => i !== index),
                  )
                }
              >
                Remove
              </Button>
            </View>
          </View>
        );
      })}
      {error("details.results") ? (
        <Txt tone="small" color={t.danger}>
          {error("details.results")}
        </Txt>
      ) : null}
      <Button
        kind="secondary"
        small
        icon={Plus}
        disabled={rows.length >= RECORD_LIMITS.labRows}
        onPress={() => set("results", [...rows, emptyLabRow()])}
      >
        Add a test
      </Button>
      {reading && ready ? (
        <ReadDialog
          mode="lab"
          attached={files.data ?? []}
          startWithAttached={files.data?.find(
            (f: RecordFileInfo) => f.id === readFileId,
          )}
          onClose={() => setReading(false)}
          onAddRows={(read) => {
            set("results", addToForm(rows, read));
            setAdded(read.length);
            setReading(false);
          }}
        />
      ) : null}
    </Part>
  );
}

function MedicineRows({
  form,
  set,
  rowError,
}: {
  form: RecordFormState;
  set: Set;
  rowError: (
    list: "results" | "medicines",
    index: number,
    key: string,
  ) => string | undefined;
}) {
  const t = useTheme();
  return (
    <Part title="Medicines">
      {form.medicines.map((row, index) => {
        const change = (key: keyof typeof row, value: string) =>
          set(
            "medicines",
            form.medicines.map((r, i) =>
              i === index ? { ...r, [key]: value } : r,
            ),
          );
        return (
          <View
            key={index}
            style={{
              borderWidth: 1,
              borderColor: t.edge,
              borderRadius: 12,
              padding: 12,
              gap: 10,
            }}
          >
            <Field
              label={`Medicine ${index + 1}`}
              value={row.name}
              onChangeText={(v) => change("name", v)}
              placeholder={index === 0 ? "Amoxicillin" : undefined}
              maxLength={120}
              error={rowError("medicines", index, "name")}
            />
            <Field
              label="Dose"
              value={row.dose}
              onChangeText={(v) => change("dose", v)}
              placeholder={index === 0 ? "500 mg" : undefined}
              maxLength={60}
              error={rowError("medicines", index, "dose")}
            />
            <Field
              label="How often"
              value={row.frequency}
              onChangeText={(v) => change("frequency", v)}
              placeholder={index === 0 ? "3 times a day, 7 days" : undefined}
              maxLength={120}
              error={rowError("medicines", index, "frequency")}
            />
            <Button
              kind="link"
              small
              label={`Remove medicine ${index + 1}`}
              onPress={() =>
                set(
                  "medicines",
                  form.medicines.length === 1
                    ? [emptyMedicine()]
                    : form.medicines.filter((_, i) => i !== index),
                )
              }
            >
              Remove
            </Button>
          </View>
        );
      })}
      <Button
        kind="secondary"
        small
        icon={Plus}
        disabled={form.medicines.length >= RECORD_LIMITS.medicines}
        onPress={() => set("medicines", [...form.medicines, emptyMedicine()])}
      >
        Add a medicine
      </Button>
    </Part>
  );
}

function Billing({
  form,
  set,
  error,
}: {
  form: RecordFormState;
  set: Set;
  error: (key: string) => string | undefined;
}) {
  const total = parseNumber(form.totalAmount);
  const covered = parseNumber(form.hmoCovered);
  const remaining =
    typeof total === "number" && typeof covered === "number"
      ? Math.max(0, Math.round((total - covered) * 100) / 100)
      : null;
  return (
    <Part title="HMO / Billing">
      <Field
        label="HMO (optional)"
        value={form.hmo}
        onChangeText={(v) => set("hmo", v)}
        placeholder="Maxicare, Intellicare, PhilHealth…"
        maxLength={120}
        error={error("details.hmo")}
      />
      <Field
        label="LOA / approval number (optional)"
        value={form.loaNumber}
        onChangeText={(v) => set("loaNumber", v)}
        maxLength={60}
        error={error("details.loaNumber")}
      />
      <Field
        label="Total bill (₱)"
        value={form.totalAmount}
        onChangeText={(v) => set("totalAmount", v)}
        keyboardType="decimal-pad"
        placeholder="45,210.50"
        error={error("details.totalAmount")}
      />
      <Field
        label="HMO covered (₱)"
        value={form.hmoCovered}
        onChangeText={(v) => set("hmoCovered", v)}
        keyboardType="decimal-pad"
        error={error("details.hmoCovered")}
      />
      <Field
        label="You paid (₱)"
        value={form.youPaid}
        onChangeText={(v) => set("youPaid", v)}
        keyboardType="decimal-pad"
        error={error("details.youPaid")}
      />
      {remaining !== null && form.youPaid.trim() === "" ? (
        <Button
          kind="link"
          small
          onPress={() => set("youPaid", String(remaining))}
        >
          {`Fill “You paid” with ₱${remaining.toLocaleString("en-PH", { minimumFractionDigits: 2 })} (total minus HMO)`}
        </Button>
      ) : null}
    </Part>
  );
}

function KeptIn({
  form,
  set,
  error,
  account,
}: {
  form: RecordFormState;
  set: Set;
  error: (key: string) => string | undefined;
  account: RecordAccountInfo;
}) {
  const router = useRouter();
  const places = usePlaces(account.ownerId);
  const options = placeOptions(places.data?.places ?? []);
  if (
    form.placeId &&
    places.data &&
    !options.some((o) => o.value === form.placeId)
  ) {
    options.unshift({ value: form.placeId, label: "A removed place" });
  }
  return (
    <View style={{ gap: 6 }}>
      <Select
        label="Where it's kept (optional)"
        value={form.placeId}
        onChange={(v) => set("placeId", v)}
        options={[{ value: "", label: "Not in a place" }, ...options]}
        error={error("placeId")}
      />
      <Txt tone="small" muted>
        The folder, box or drawer the paper or film is in.
      </Txt>
      <Button
        kind="link"
        small
        onPress={() =>
          router.push({
            pathname: "/places/new",
            params: { owner: account.ownerId },
          })
        }
      >
        Add a place
      </Button>
    </View>
  );
}
