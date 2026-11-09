import {
  ALLERGY_SEVERITIES,
  BLOOD_TYPES,
  MEDICAL_LIMITS,
  SEVERITY_LABELS,
} from "@talaan/shared";
import { FormSection } from "../../records/form/FormSection";
import { CheckboxField } from "../../ui/CheckboxField";
import { SelectField } from "../../ui/SelectField";
import { TextAreaField } from "../../ui/TextAreaField";
import { TextField } from "../../ui/TextField";
import { ListEditor } from "./ListEditor";
import type { MedicalForm } from "./medicalFormState";

export interface PartProps {
  form: MedicalForm;
  set: <K extends keyof MedicalForm>(key: K, value: MedicalForm[K]) => void;
  error: (key: string) => string | undefined;
}

// Errors of a list's rows: "allergies.0.name"
const rowError = (error: PartProps["error"], list: string) => (key: string) =>
  error(`${list}.${key}`);

export function BasicsSection({ form, set, error }: PartProps) {
  return (
    <FormSection title="Basics">
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Birth date"
          type="date"
          value={form.birthDate}
          onChange={(v) => set("birthDate", v)}
          error={error("birthDate")}
        />
        <SelectField
          label="Sex"
          value={form.sex}
          onChange={(v) => set("sex", v as MedicalForm["sex"])}
          options={[
            { value: "", label: "Not given" },
            { value: "female", label: "Female" },
            { value: "male", label: "Male" },
          ]}
        />
        <SelectField
          label="Blood type"
          value={form.bloodType}
          onChange={(v) => set("bloodType", v as MedicalForm["bloodType"])}
          options={[
            { value: "", label: "Not given" },
            ...BLOOD_TYPES.map((t) => ({
              value: t,
              label: t === "unknown" ? "Don't know" : t,
            })),
          ]}
        />
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Height (cm)"
            inputMode="decimal"
            value={form.heightCm}
            onChange={(v) => set("heightCm", v)}
            error={error("heightCm")}
          />
          <TextField
            label="Weight (kg)"
            inputMode="decimal"
            value={form.weightKg}
            onChange={(v) => set("weightKg", v)}
            error={error("weightKg")}
          />
        </div>
      </div>
    </FormSection>
  );
}

export function AllergiesSection({ form, set, error }: PartProps) {
  return (
    <FormSection title="Allergies">
      {form.allergies.length === 0 && (
        <CheckboxField
          checked={form.noKnownAllergies}
          onChange={(v) => set("noKnownAllergies", v)}
        >
          No known allergies (leave it unticked if you're not sure)
        </CheckboxField>
      )}
      <ListEditor
        itemLabel="allergy"
        items={form.allergies}
        onChange={(v) => set("allergies", v as MedicalForm["allergies"])}
        columns={[
          {
            key: "name",
            label: "Allergic to",
            placeholder: "Penicillin, shrimp, latex",
          },
          {
            key: "reaction",
            label: "Reaction",
            placeholder: "Hives, can't breathe",
          },
          {
            key: "severity",
            label: "How bad",
            type: "select",
            options: ALLERGY_SEVERITIES.map((s) => ({
              value: s,
              label: SEVERITY_LABELS[s],
            })),
          },
        ]}
        empty={{ name: "", reaction: "", severity: "moderate" }}
        addLabel="Add an allergy"
        max={MEDICAL_LIMITS.allergies}
        error={rowError(error, "allergies")}
      />
    </FormSection>
  );
}

export function ConditionsSection({ form, set, error }: PartProps) {
  return (
    <FormSection title="Conditions">
      <ListEditor
        itemLabel="condition"
        items={form.conditions}
        onChange={(v) => set("conditions", v)}
        columns={[
          {
            key: "name",
            label: "Condition",
            placeholder: "Hypertension, diabetes type 2, asthma",
          },
          {
            key: "since",
            label: "Since (year)",
            placeholder: "2019",
            inputMode: "numeric",
          },
        ]}
        empty={{ name: "", since: "" }}
        addLabel="Add a condition"
        max={MEDICAL_LIMITS.conditions}
        error={rowError(error, "conditions")}
      />
    </FormSection>
  );
}

export function DevicesSection({ form, set, error }: PartProps) {
  return (
    <FormSection title="Implants and devices">
      <ListEditor
        itemLabel="device"
        items={form.devices}
        onChange={(v) => set("devices", v)}
        columns={[
          {
            key: "name",
            label: "Implant or device",
            placeholder: "Pacemaker, stent, insulin pump",
          },
          { key: "note", label: "Note", placeholder: "Placed 2022 at PHC" },
        ]}
        empty={{ name: "", note: "" }}
        addLabel="Add an implant or device"
        max={MEDICAL_LIMITS.devices}
        error={rowError(error, "devices")}
      />
    </FormSection>
  );
}

export function ContactsSection({ form, set, error }: PartProps) {
  return (
    <FormSection title="Emergency contacts">
      <p className="-mt-2 text-sm text-muted">
        In the order to call them. Up to {MEDICAL_LIMITS.contacts}.
      </p>
      <ListEditor
        itemLabel="contact"
        items={form.contacts}
        onChange={(v) => set("contacts", v)}
        columns={[
          { key: "name", label: "Name", placeholder: "Ana Santos" },
          {
            key: "relationship",
            label: "Relationship",
            placeholder: "Anak, asawa, kapatid",
          },
          {
            key: "phone",
            label: "Phone",
            type: "tel",
            inputMode: "tel",
            placeholder: "0917 123 4567",
            wide: true,
          },
        ]}
        empty={{ name: "", relationship: "", phone: "" }}
        addLabel="Add a contact"
        max={MEDICAL_LIMITS.contacts}
        error={rowError(error, "contacts")}
        reorder
      />
    </FormSection>
  );
}

export function DoctorSection({ form, set, error }: PartProps) {
  const doctor = (key: keyof MedicalForm["doctor"], value: string) =>
    set("doctor", { ...form.doctor, [key]: value });
  return (
    <FormSection title="Doctor">
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Name"
          value={form.doctor.name}
          onChange={(v) => doctor("name", v)}
          placeholder="Dr. Reyes"
          error={error("doctor.name")}
        />
        <TextField
          label="Specialty"
          value={form.doctor.specialty}
          onChange={(v) => doctor("specialty", v)}
          placeholder="Internal medicine"
          error={error("doctor.specialty")}
        />
        <TextField
          label="Clinic or hospital"
          value={form.doctor.clinic}
          onChange={(v) => doctor("clinic", v)}
          error={error("doctor.clinic")}
        />
        <TextField
          label="Phone"
          type="tel"
          inputMode="tel"
          value={form.doctor.phone}
          onChange={(v) => doctor("phone", v)}
          error={error("doctor.phone")}
        />
      </div>
    </FormSection>
  );
}

export function OtherSection({ form, set, error }: PartProps) {
  return (
    <FormSection title="Other">
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="PhilHealth ID (optional)"
          inputMode="numeric"
          value={form.philhealth}
          onChange={(v) => set("philhealth", v)}
          placeholder="12-345678901-2"
          error={error("philhealth")}
        />
        <SelectField
          label="Organ donor"
          value={form.organDonor}
          onChange={(v) => set("organDonor", v as MedicalForm["organDonor"])}
          options={[
            { value: "", label: "Not given" },
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
          ]}
        />
      </div>
      <TextAreaField
        label="Notes for doctors (optional)"
        value={form.notes}
        onChange={(v) => set("notes", v)}
        placeholder="Hard to find a vein: use the left arm. Speaks Ilocano."
        maxLength={MEDICAL_LIMITS.notes}
        error={error("notes")}
      />
    </FormSection>
  );
}
