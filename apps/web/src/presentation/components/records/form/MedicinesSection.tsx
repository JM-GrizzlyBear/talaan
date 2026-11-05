import { RECORD_LIMITS } from "@talaan/shared";
import { Plus } from "lucide-react";
import { TextField } from "../../ui/TextField";
import { buttonSecondary, linkButton } from "../../ui/styles";
import { FormSection } from "./FormSection";
import type { RowPartProps } from "./formParts";
import { emptyMedicine } from "./recordFormState";

// Prescription: one row per medicine
export function MedicinesSection({ form, set, rowError }: RowPartProps) {
  return (
    <FormSection title="Medicines">
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
              placeholder={index === 0 ? "3 times a day, 7 days" : undefined}
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
        onClick={() => set("medicines", [...form.medicines, emptyMedicine()])}
        disabled={form.medicines.length >= RECORD_LIMITS.medicines}
        className={`${buttonSecondary} self-start`}
      >
        <Plus aria-hidden="true" className="size-4" />
        Add a medicine
      </button>
    </FormSection>
  );
}
