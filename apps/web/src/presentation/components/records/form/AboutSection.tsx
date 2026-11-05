import { RECORD_LIMITS, type RecordAccountInfo } from "@talaan/shared";
import { SelectField } from "../../ui/SelectField";
import { TextField } from "../../ui/TextField";
import { FormSection } from "./FormSection";
import type { FormPartProps } from "./formParts";
import { TITLE_HINTS } from "./titleHints";

// Who it's for, the title, the date, the doctor and the clinic
export function AboutSection({
  form,
  set,
  error,
  account,
}: FormPartProps & { account: RecordAccountInfo }) {
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
    </FormSection>
  );
}
