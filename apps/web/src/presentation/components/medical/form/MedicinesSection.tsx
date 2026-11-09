import { MEDICAL_LIMITS } from "@talaan/shared";
import { Pill } from "lucide-react";
import { useReminders } from "../../../../application/reminders/useReminders";
import { FormSection } from "../../records/form/FormSection";
import { buttonSecondary } from "../../ui/styles";
import { ListEditor } from "./ListEditor";
import type { PartProps } from "./sections";

// Medicines taken regularly; can be filled in from medicine reminders
export function MedicinesSection({
  form,
  set,
  error,
  ownerId,
  profileId,
}: PartProps & { ownerId: string; profileId: string | null }) {
  const reminders = useReminders(ownerId);
  const known = new Set(form.medicines.map((m) => m.name.trim().toLowerCase()));
  const fromReminders = (reminders.data?.reminders ?? [])
    .filter(
      (r) =>
        r.kind === "medicine" &&
        r.profileId === profileId &&
        !r.paused &&
        r.nextAt !== null &&
        !known.has(r.title.trim().toLowerCase()),
    )
    .map((r) => ({ name: r.title, dose: r.dose }));

  return (
    <FormSection title="Medicines taken regularly">
      {fromReminders.length > 0 && (
        <button
          type="button"
          onClick={() =>
            set(
              "medicines",
              [...form.medicines, ...fromReminders].slice(
                0,
                MEDICAL_LIMITS.medicines,
              ),
            )
          }
          className={`${buttonSecondary} self-start`}
        >
          <Pill aria-hidden="true" className="size-4" />
          Add {fromReminders.length} from medicine reminders
        </button>
      )}
      <ListEditor
        itemLabel="medicine"
        items={form.medicines}
        onChange={(v) => set("medicines", v)}
        columns={[
          { key: "name", label: "Medicine", placeholder: "Losartan" },
          { key: "dose", label: "Dose", placeholder: "50 mg once a day" },
        ]}
        empty={{ name: "", dose: "" }}
        addLabel="Add a medicine"
        max={MEDICAL_LIMITS.medicines}
        error={(key) => error(`medicines.${key}`)}
      />
    </FormSection>
  );
}
