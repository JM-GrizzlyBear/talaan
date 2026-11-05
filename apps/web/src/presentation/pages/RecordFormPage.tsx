import {
  RECORD_LIMITS,
  RECORD_TYPES,
  RECORD_TYPE_LABELS,
  labFlag,
  type RecordAccountInfo,
  type RecordInfo,
} from "@talaan/shared";
import { ArrowLeft, Plus } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import {
  useCreateRecord,
  useRecord,
  useRecordAccounts,
  useUpdateRecord,
} from "../../application/records/useRecords";
import { RecordTypeIcon } from "../components/records/RecordTypeIcon";
import { ErrorAlert } from "../components/ui/ErrorAlert";
import { SelectField } from "../components/ui/SelectField";
import { TextAreaField } from "../components/ui/TextAreaField";
import { TextField } from "../components/ui/TextField";
import { buttonPrimary, buttonSecondary } from "../components/ui/styles";
import { errorMessage, fieldError } from "../format/errorMessage";
import {
  emptyForm,
  emptyLabRow,
  emptyMedicine,
  fieldsFromForm,
  formFromRecord,
  parseNumber,
  sentRowIndexes,
  type RecordFormState,
} from "./recordForm";

const linkButton =
  "cursor-pointer text-sm font-semibold text-brand underline disabled:opacity-60";

// /records/new?owner=…&person=… and /records/:id/edit
export function RecordFormPage() {
  const { id } = useParams();
  const accounts = useRecordAccounts();
  if (accounts.isPending) return <Loading />;
  if (accounts.isError)
    return <Problem message={errorMessage(accounts.error)} />;
  return id ? (
    <EditRecord id={id} accounts={accounts.data} />
  ) : (
    <NewRecord accounts={accounts.data} />
  );
}

function Loading() {
  return (
    <p role="status" className="p-8 text-center text-muted">
      Loading…
    </p>
  );
}

function Problem({ message }: { message: string }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <ErrorAlert message={message} />
    </main>
  );
}

function NewRecord({ accounts }: { accounts: RecordAccountInfo[] }) {
  const [params] = useSearchParams();
  const account =
    accounts.find((a) => a.ownerId === params.get("owner")) ?? accounts[0];
  const person = params.get("person");
  if (account.role === "view") {
    return (
      <Problem message="You can view these records, but not add to them. Ask the owner for “Can manage”." />
    );
  }
  return (
    <RecordForm
      account={account}
      initial={emptyForm(person && person !== "self" ? person : "")}
    />
  );
}

function EditRecord({
  id,
  accounts,
}: {
  id: string;
  accounts: RecordAccountInfo[];
}) {
  const record = useRecord(id);
  if (record.isPending) return <Loading />;
  if (record.isError) return <Problem message={errorMessage(record.error)} />;
  const account = accounts.find((a) => a.ownerId === record.data.ownerId);
  if (!account || record.data.role === "view") {
    return (
      <Problem message="You can view this record, but not change it. Ask the owner for “Can manage”." />
    );
  }
  return (
    <RecordForm
      account={account}
      record={record.data}
      initial={formFromRecord(record.data)}
    />
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4 rounded-xl border border-edge bg-white p-4">
      <legend className="px-1 font-bold">{title}</legend>
      {children}
    </fieldset>
  );
}

function RecordForm({
  account,
  record,
  initial,
}: {
  account: RecordAccountInfo;
  record?: RecordInfo;
  initial: RecordFormState;
}) {
  const [form, setForm] = useState(initial);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const create = useCreateRecord();
  const update = useUpdateRecord();
  const save = record ? update : create;
  const navigate = useNavigate();

  const set = <K extends keyof RecordFormState>(
    key: K,
    value: RecordFormState[K],
  ) => {
    setForm((f) => ({ ...f, [key]: value }));
    // A fix clears the "not a number" notes; the save checks again
    setLocalErrors({});
  };

  // A local check (number boxes) first, then the server's message
  const error = (key: string) =>
    localErrors[key] ?? fieldError(save.error, key);
  // Server errors count rows that were sent; empty rows were skipped
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

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const { fields, errors } = fieldsFromForm(form);
    setLocalErrors(errors);
    if (!fields) return;
    try {
      const saved = record
        ? await update.mutateAsync({ id: record.id, fields })
        : await create.mutateAsync({ ownerId: account.ownerId, fields });
      navigate(`/records/${saved.id}`, { replace: Boolean(record) });
    } catch {
      // Shown from save.error
    }
  }

  const backTo = record
    ? `/records/${record.id}`
    : `/records?owner=${account.ownerId}`;
  const hasFieldErrors =
    Object.keys(localErrors).length > 0 ||
    Object.keys(
      (save.error as { fieldErrors?: object } | null)?.fieldErrors ?? {},
    ).length > 0;
  const forWhom =
    account.role === "owner" ? "" : ` · ${account.ownerName}'s records`;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
      <Link
        to={backTo}
        className="flex items-center gap-1 text-sm font-semibold text-brand"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        {record ? "Back to the record" : "Back to records"}
      </Link>
      <h1 className="text-3xl font-bold">
        {record ? "Edit record" : "Add a record"}
        <span className="text-lg font-normal text-muted">{forWhom}</span>
      </h1>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        {save.isError && (
          <ErrorAlert
            message={
              hasFieldErrors
                ? "Please check the boxes marked in red."
                : errorMessage(save.error)
            }
          />
        )}

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-semibold">Type</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {RECORD_TYPES.map((type) => (
              <label
                key={type}
                className={`flex min-h-16 cursor-pointer flex-col items-start justify-center gap-1 rounded-lg border px-3 py-2 text-sm font-semibold ${
                  form.type === type
                    ? "border-brand bg-brand-soft text-deep"
                    : "border-edge bg-white hover:bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  name="type"
                  value={type}
                  checked={form.type === type}
                  onChange={() => set("type", type)}
                  className="sr-only"
                />
                <RecordTypeIcon type={type} className="size-5 text-brand" />
                {RECORD_TYPE_LABELS[type]}
              </label>
            ))}
          </div>
          {error("type") && (
            <p className="text-sm font-medium text-danger">{error("type")}</p>
          )}
        </fieldset>

        {form.type && (
          <>
            <Section title="About it">
              <SelectField
                label="Who it's for"
                value={form.profileId}
                onChange={(value) => set("profileId", value)}
                options={account.people.map((p) => ({
                  value: p.profileId ?? "",
                  label: p.name,
                }))}
                error={error("profileId")}
              />
              <TextField
                label="Title"
                value={form.title}
                onChange={(value) => set("title", value)}
                maxLength={RECORD_LIMITS.title}
                placeholder={TITLE_HINTS[form.type]}
                error={error("title")}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Date"
                  type="date"
                  value={form.recordDate}
                  onChange={(value) => set("recordDate", value)}
                  min="1900-01-01"
                  error={error("recordDate")}
                />
                <TextField
                  label="Doctor (optional)"
                  value={form.doctor}
                  onChange={(value) => set("doctor", value)}
                  maxLength={RECORD_LIMITS.person}
                  error={error("doctor")}
                />
              </div>
              <TextField
                label="Clinic or hospital (optional)"
                value={form.facility}
                onChange={(value) => set("facility", value)}
                maxLength={RECORD_LIMITS.person}
                error={error("facility")}
              />
            </Section>

            {form.type === "imaging" && (
              <Section title="X-ray / imaging">
                <TextField
                  label="What was imaged (optional)"
                  value={form.bodyPart}
                  onChange={(value) => set("bodyPart", value)}
                  placeholder="Chest PA, left knee, whole abdomen…"
                  maxLength={120}
                  error={error("details.bodyPart")}
                />
                <TextAreaField
                  label="Reading / impression (optional)"
                  value={form.reading}
                  onChange={(value) => set("reading", value)}
                  maxLength={RECORD_LIMITS.reading}
                  rows={5}
                  error={error("details.reading")}
                />
              </Section>
            )}

            {form.type === "lab" && (
              <Section title="Results">
                <p className="-mt-2 text-sm text-muted">
                  Copy each line from the printout. The normal range is on the
                  same line, like “12.0 – 16.0”.
                </p>
                {form.results.map((row, index) => {
                  const change = (key: keyof typeof row, value: string) =>
                    set(
                      "results",
                      form.results.map((r, i) =>
                        i === index ? { ...r, [key]: value } : r,
                      ),
                    );
                  const low = parseNumber(row.rangeLow);
                  const high = parseNumber(row.rangeHigh);
                  const flag =
                    low !== undefined && high !== undefined
                      ? labFlag({
                          value: row.value,
                          rangeLow: low,
                          rangeHigh: high,
                        })
                      : null;
                  return (
                    <div
                      key={index}
                      className="flex flex-col gap-3 rounded-lg border border-edge p-3"
                    >
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[2fr_1fr_1fr]">
                        <div className="col-span-2 sm:col-span-1">
                          <TextField
                            label={`Test ${index + 1}`}
                            value={row.name}
                            onChange={(v) => change("name", v)}
                            placeholder={index === 0 ? "Hemoglobin" : undefined}
                            maxLength={80}
                            error={rowError("results", index, "name")}
                          />
                        </div>
                        <TextField
                          label="Result"
                          value={row.value}
                          onChange={(v) => change("value", v)}
                          placeholder={index === 0 ? "13.5" : undefined}
                          maxLength={30}
                          error={rowError("results", index, "value")}
                        />
                        <TextField
                          label="Unit"
                          value={row.unit}
                          onChange={(v) => change("unit", v)}
                          placeholder={index === 0 ? "g/dL" : undefined}
                          maxLength={20}
                          error={rowError("results", index, "unit")}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-start">
                        <TextField
                          label="Normal from"
                          value={row.rangeLow}
                          onChange={(v) => change("rangeLow", v)}
                          inputMode="decimal"
                          placeholder={index === 0 ? "12.0" : undefined}
                          error={rowError("results", index, "rangeLow")}
                        />
                        <TextField
                          label="Normal to"
                          value={row.rangeHigh}
                          onChange={(v) => change("rangeHigh", v)}
                          inputMode="decimal"
                          placeholder={index === 0 ? "16.0" : undefined}
                          error={rowError("results", index, "rangeHigh")}
                        />
                        <div className="col-span-2 flex items-center justify-between gap-3 sm:col-span-1 sm:mt-7 sm:h-11">
                          {flag ? (
                            <span className="rounded-full bg-danger-soft px-2 py-0.5 text-xs font-bold text-danger">
                              {flag === "low" ? "Low" : "High"}
                            </span>
                          ) : (
                            <span />
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              set(
                                "results",
                                form.results.length === 1
                                  ? [emptyLabRow()]
                                  : form.results.filter((_, i) => i !== index),
                              )
                            }
                            aria-label={`Remove test ${index + 1}`}
                            className={linkButton}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {error("details.results") && (
                  <p className="text-sm font-medium text-danger">
                    {error("details.results")}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() =>
                    set("results", [...form.results, emptyLabRow()])
                  }
                  disabled={form.results.length >= RECORD_LIMITS.labRows}
                  className={`${buttonSecondary} self-start`}
                >
                  <Plus aria-hidden="true" className="size-4" />
                  Add a test
                </button>
              </Section>
            )}

            {form.type === "prescription" && (
              <Section title="Medicines">
                {form.medicines.map((row, index) => {
                  const change = (key: keyof typeof row, value: string) =>
                    set(
                      "medicines",
                      form.medicines.map((r, i) =>
                        i === index ? { ...r, [key]: value } : r,
                      ),
                    );
                  return (
                    <div
                      key={index}
                      className="grid gap-3 rounded-lg border border-edge p-3 sm:grid-cols-[2fr_1fr_1.5fr_auto] sm:items-start"
                    >
                      <TextField
                        label={`Medicine ${index + 1}`}
                        value={row.name}
                        onChange={(v) => change("name", v)}
                        placeholder={index === 0 ? "Amoxicillin" : undefined}
                        maxLength={120}
                        error={rowError("medicines", index, "name")}
                      />
                      <TextField
                        label="Dose"
                        value={row.dose}
                        onChange={(v) => change("dose", v)}
                        placeholder={index === 0 ? "500 mg" : undefined}
                        maxLength={60}
                        error={rowError("medicines", index, "dose")}
                      />
                      <TextField
                        label="How often"
                        value={row.frequency}
                        onChange={(v) => change("frequency", v)}
                        placeholder={
                          index === 0 ? "3 times a day, 7 days" : undefined
                        }
                        maxLength={120}
                        error={rowError("medicines", index, "frequency")}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          set(
                            "medicines",
                            form.medicines.length === 1
                              ? [emptyMedicine()]
                              : form.medicines.filter((_, i) => i !== index),
                          )
                        }
                        aria-label={`Remove medicine ${index + 1}`}
                        className={`${linkButton} self-start sm:mt-7 sm:h-11`}
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
                <button
                  type="button"
                  onClick={() =>
                    set("medicines", [...form.medicines, emptyMedicine()])
                  }
                  disabled={form.medicines.length >= RECORD_LIMITS.medicines}
                  className={`${buttonSecondary} self-start`}
                >
                  <Plus aria-hidden="true" className="size-4" />
                  Add a medicine
                </button>
              </Section>
            )}

            {form.type === "vaccination" && (
              <Section title="Vaccine">
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    label="Vaccine (optional)"
                    value={form.vaccine}
                    onChange={(value) => set("vaccine", value)}
                    placeholder="Flu, Pneumococcal, Hepatitis B…"
                    maxLength={120}
                    error={error("details.vaccine")}
                  />
                  <TextField
                    label="Dose (optional)"
                    value={form.dose}
                    onChange={(value) => set("dose", value)}
                    placeholder="1st dose, Booster"
                    maxLength={40}
                    error={error("details.dose")}
                  />
                </div>
              </Section>
            )}

            {form.type === "billing" && (
              <BillingSection form={form} set={set} error={error} />
            )}

            <TextAreaField
              label="Notes (optional)"
              value={form.notes}
              onChange={(value) => set("notes", value)}
              maxLength={RECORD_LIMITS.notes}
              error={error("notes")}
            />
          </>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={save.isPending}
            className={buttonPrimary}
          >
            {save.isPending
              ? "Saving…"
              : record
                ? "Save changes"
                : "Save record"}
          </button>
          <Link to={backTo} className={buttonSecondary}>
            Cancel
          </Link>
        </div>
      </form>
    </main>
  );
}

const TITLE_HINTS: Record<string, string> = {
  imaging: "e.g. Chest X-ray",
  lab: "e.g. CBC and blood chemistry",
  prescription: "e.g. Antibiotics for cough",
  consultation: "e.g. Check-up with Dr. Cruz",
  certificate: "e.g. Fit-to-work certificate",
  vaccination: "e.g. Flu shot",
  billing: "e.g. SOA, St. Luke's (Oct 2026)",
  other: "",
};

function BillingSection({
  form,
  set,
  error,
}: {
  form: RecordFormState;
  set: <K extends keyof RecordFormState>(
    key: K,
    value: RecordFormState[K],
  ) => void;
  error: (key: string) => string | undefined;
}) {
  const total = parseNumber(form.totalAmount);
  const covered = parseNumber(form.hmoCovered);
  const remaining =
    typeof total === "number" && typeof covered === "number"
      ? Math.max(0, Math.round((total - covered) * 100) / 100)
      : null;
  return (
    <Section title="HMO / Billing">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="HMO (optional)"
          value={form.hmo}
          onChange={(value) => set("hmo", value)}
          placeholder="Maxicare, Intellicare, PhilHealth…"
          maxLength={120}
          error={error("details.hmo")}
        />
        <TextField
          label="LOA / approval number (optional)"
          value={form.loaNumber}
          onChange={(value) => set("loaNumber", value)}
          maxLength={60}
          error={error("details.loaNumber")}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField
          label="Total bill (₱)"
          value={form.totalAmount}
          onChange={(value) => set("totalAmount", value)}
          inputMode="decimal"
          placeholder="45,210.50"
          error={error("details.totalAmount")}
        />
        <TextField
          label="HMO covered (₱)"
          value={form.hmoCovered}
          onChange={(value) => set("hmoCovered", value)}
          inputMode="decimal"
          error={error("details.hmoCovered")}
        />
        <TextField
          label="You paid (₱)"
          value={form.youPaid}
          onChange={(value) => set("youPaid", value)}
          inputMode="decimal"
          error={error("details.youPaid")}
        />
      </div>
      {remaining !== null && form.youPaid.trim() === "" && (
        <button
          type="button"
          onClick={() => set("youPaid", String(remaining))}
          className={`${linkButton} self-start`}
        >
          Fill “You paid” with ₱
          {remaining.toLocaleString("en-PH", { minimumFractionDigits: 2 })}{" "}
          (total minus HMO)
        </button>
      )}
    </Section>
  );
}
