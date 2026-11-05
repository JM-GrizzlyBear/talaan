import { TextField } from "../../ui/TextField";
import { FormSection } from "./FormSection";
import type { FormPartProps } from "./formParts";

// Vaccination: the vaccine and the dose
export function VaccinationSection({ form, set, error }: FormPartProps) {
  return (
    <FormSection title="Vaccine">
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
    </FormSection>
  );
}
