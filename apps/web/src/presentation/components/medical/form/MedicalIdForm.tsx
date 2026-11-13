import type { MedicalIdInfo } from "@talaan/shared";
import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useSaveMedicalId } from "@talaan/client";
import { errorMessage, fieldError } from "../../../format/errorMessage";
import { ErrorAlert } from "../../ui/ErrorAlert";
import { buttonPrimary, buttonSecondary } from "../../ui/styles";
import {
  medicalFieldsFromForm,
  formFromFields,
  type MedicalForm,
} from "@talaan/client";
import { MedicinesSection } from "./MedicinesSection";
import {
  AllergiesSection,
  BasicsSection,
  ConditionsSection,
  ContactsSection,
  DevicesSection,
  DoctorSection,
  OtherSection,
  type PartProps,
} from "./sections";

// Filling in or changing a Medical ID. Everything is optional.
export function MedicalIdForm({
  medicalId,
  backTo,
}: {
  medicalId: MedicalIdInfo;
  backTo: string;
}) {
  const [form, setForm] = useState<MedicalForm>(() =>
    formFromFields(medicalId.fields),
  );
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const person = {
    ownerId: medicalId.ownerId,
    profileId: medicalId.profileId ?? "self",
  };
  const save = useSaveMedicalId(person);
  const navigate = useNavigate();

  const set: PartProps["set"] = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setLocalErrors({});
  };
  const error = (key: string) =>
    localErrors[key] ?? fieldError(save.error, key);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const { fields, errors } = medicalFieldsFromForm(form);
    setLocalErrors(errors);
    if (!fields) return;
    try {
      await save.mutateAsync(fields);
      void navigate(backTo, { replace: true });
    } catch {
      // Shown from save.error
    }
  }

  const parts = { form, set, error };
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      {save.isError && (
        <ErrorAlert
          message={
            Object.keys(
              (save.error as { fieldErrors?: object }).fieldErrors ?? {},
            ).length
              ? "Please check the boxes marked in red."
              : errorMessage(save.error)
          }
        />
      )}
      <AllergiesSection {...parts} />
      <BasicsSection {...parts} />
      <ConditionsSection {...parts} />
      <MedicinesSection
        {...parts}
        ownerId={medicalId.ownerId}
        profileId={medicalId.profileId}
      />
      <ContactsSection {...parts} />
      <DoctorSection {...parts} />
      <DevicesSection {...parts} />
      <OtherSection {...parts} />
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={save.isPending}
          className={buttonPrimary}
        >
          {save.isPending ? "Saving…" : "Save Medical ID"}
        </button>
        <Link to={backTo} className={buttonSecondary}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
