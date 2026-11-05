import { RECORD_LIMITS } from "@talaan/shared";
import { TextAreaField } from "../../ui/TextAreaField";
import { TextField } from "../../ui/TextField";
import { FormSection } from "./FormSection";
import type { FormPartProps } from "./formParts";

// X-ray / imaging: what was imaged, and the reading
export function ImagingSection({ form, set, error }: FormPartProps) {
  return (
    <FormSection title="X-ray / imaging">
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
    </FormSection>
  );
}
