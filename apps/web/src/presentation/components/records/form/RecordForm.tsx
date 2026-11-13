import {
  RECORD_LIMITS,
  type RecordAccountInfo,
  type RecordInfo,
} from "@talaan/shared";
import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  useCreateRecord,
  useUpdateRecord,
  uploadRecordFile,
  fieldsFromForm,
  type RecordFormState,
  sentRowIndexes,
} from "@talaan/client";
import { errorMessage, fieldError } from "../../../format/errorMessage";
import { BackLink } from "../../ui/BackLink";
import { ErrorAlert } from "../../ui/ErrorAlert";
import { TextAreaField } from "../../ui/TextAreaField";
import { buttonPrimary, buttonSecondary } from "../../ui/styles";
import { AboutSection } from "./AboutSection";
import { BillingSection } from "./BillingSection";
import { ImagingSection } from "./ImagingSection";
import { KeptInSection } from "./KeptInSection";
import { StartFromPhoto } from "./StartFromPhoto";
import { LabResultsSection } from "./LabResultsSection";
import { MedicinesSection } from "./MedicinesSection";
import { TypePicker } from "./TypePicker";
import { VaccinationSection } from "./VaccinationSection";
import type { SetField } from "./formParts";

// Adding or editing a record: the type, then the fields for that type
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
  const [form, setForm] = useState(initial);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  // Photos read into the form: added to the record once it's saved
  const [pending, setPending] = useState<File[]>([]);
  const [adding, setAdding] = useState(false);
  const create = useCreateRecord();
  const update = useUpdateRecord();
  const save = record ? update : create;
  const navigate = useNavigate();

  const set: SetField = (key, value) => {
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
      let fileProblem: string | null = null;
      if (pending.length > 0) {
        setAdding(true);
        for (const file of pending) {
          try {
            await uploadRecordFile(saved.id, file, () => {});
          } catch (problem) {
            fileProblem = errorMessage(problem);
          }
        }
        setAdding(false);
      }
      navigate(`/records/${saved.id}`, {
        replace: Boolean(record),
        state: fileProblem ? { fileProblem } : undefined,
      });
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
      <BackLink to={backTo}>
        {record ? "Back to the record" : "Back to records"}
      </BackLink>
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

        {form.type && (
          <>
            <AboutSection
              form={form}
              set={set}
              error={error}
              account={account}
            />

            {form.type === "imaging" && (
              <ImagingSection form={form} set={set} error={error} />
            )}

            {form.type === "lab" && (
              <LabResultsSection
                form={form}
                set={set}
                error={error}
                rowError={rowError}
                recordId={record?.id}
                readFileId={readFileId}
              />
            )}

            {form.type === "prescription" && (
              <MedicinesSection
                form={form}
                set={set}
                error={error}
                rowError={rowError}
              />
            )}

            {form.type === "vaccination" && (
              <VaccinationSection form={form} set={set} error={error} />
            )}

            {form.type === "billing" && (
              <BillingSection form={form} set={set} error={error} />
            )}

            <KeptInSection
              form={form}
              set={set}
              error={error}
              account={account}
            />

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
            disabled={save.isPending || adding}
            className={buttonPrimary}
          >
            {adding
              ? "Adding the photo…"
              : save.isPending
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
