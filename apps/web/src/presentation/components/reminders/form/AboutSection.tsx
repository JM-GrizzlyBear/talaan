import { REMINDER_LIMITS, type RecordAccountInfo } from "@talaan/shared";
import { FileText } from "lucide-react";
import { Link } from "react-router";
import { FormSection } from "../../records/form/FormSection";
import { SelectField } from "../../ui/SelectField";
import { TextAreaField } from "../../ui/TextAreaField";
import { TextField } from "../../ui/TextField";
import { linkButton } from "../../ui/styles";
import type { ReminderPartProps } from "./formParts";

const PLACEHOLDERS: Record<string, string> = {
  checkup: "Follow-up with Dr. Santos",
  lab: "Repeat FBS and lipid profile",
  medicine: "Metformin",
  refill: "Buy Losartan at Mercury Drug",
  vaccination: "Flu vaccine",
  hmo: "Renew Maxicare",
  other: "What to remember",
};

// Who it's for, what it's called, the dose, a note, the record it's about
export function AboutSection({
  form,
  set,
  error,
  account,
  recordTitle,
}: ReminderPartProps & {
  account: RecordAccountInfo;
  recordTitle: string | null;
}) {
  return (
    <FormSection title="About it">
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
        label={form.kind === "medicine" ? "Medicine name" : "Title"}
        value={form.title}
        onChange={(v) => set("title", v)}
        placeholder={PLACEHOLDERS[form.kind || "other"]}
        maxLength={REMINDER_LIMITS.title}
        error={error("title")}
      />
      {form.kind === "medicine" && (
        <TextField
          label="Dose (optional)"
          value={form.dose}
          onChange={(v) => set("dose", v)}
          placeholder="500 mg, 1 tablet after meals"
          maxLength={REMINDER_LIMITS.dose}
          error={error("dose")}
        />
      )}
      <TextAreaField
        label="Note (optional)"
        value={form.note}
        onChange={(v) => set("note", v)}
        placeholder="Bring the last lab results. Fasting 8 hours."
        maxLength={REMINDER_LIMITS.note}
        error={error("note")}
      />
      {form.recordId && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <FileText aria-hidden="true" className="size-4 text-brand" />
          About the record{" "}
          <Link
            to={`/records/${form.recordId}`}
            className="font-semibold text-brand underline"
          >
            {recordTitle ?? "this record"}
          </Link>
          <button
            type="button"
            onClick={() => set("recordId", "")}
            className={linkButton}
          >
            Unlink
          </button>
        </div>
      )}
    </FormSection>
  );
}
