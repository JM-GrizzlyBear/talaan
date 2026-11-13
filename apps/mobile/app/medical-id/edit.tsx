import {
  formFromFields,
  type MedicalForm,
  medicalFieldsFromForm,
  useMedicalId,
  useRecordAccounts,
  useReminders,
  useSaveMedicalId,
} from "@talaan/client";
import {
  ALLERGY_SEVERITIES,
  BLOOD_TYPES,
  MEDICAL_LIMITS,
  type MedicalIdInfo,
  SEVERITY_LABELS,
} from "@talaan/shared";
import { Stack, useRouter } from "expo-router";
import { Pill } from "lucide-react-native";
import { type ReactNode, useState } from "react";
import { View } from "react-native";
import { fieldError, messageOf } from "../../src/api/ApiError";
import { usePersonParams } from "../../src/medical/usePersonParams";
import { DateField } from "../../src/ui/DateField";
import { CheckRow, Field, Select } from "../../src/ui/form";
import {
  Button,
  Buttons,
  Card,
  ErrorNotice,
  Loading,
  Notice,
  Screen,
  Txt,
} from "../../src/ui/kit";
import { ListEditor } from "../../src/ui/ListEditor";

export default function EditMedicalId() {
  const accounts = useRecordAccounts();
  const { person } = usePersonParams(accounts.data);
  const medicalId = useMedicalId(person);
  return (
    <>
      <Stack.Screen options={{ title: "Edit Medical ID" }} />
      {accounts.isPending || medicalId.isPending ? (
        <Loading />
      ) : medicalId.data && medicalId.data.role !== "view" ? (
        <MedicalForm_ medicalId={medicalId.data} />
      ) : (
        <Screen>
          <ErrorNotice error={accounts.error ?? medicalId.error} />
          {medicalId.data?.role === "view" ? (
            <Notice tone="error">
              You can view this Medical ID, but not change it. Ask the owner for
              “Can manage”.
            </Notice>
          ) : null}
        </Screen>
      )}
    </>
  );
}

function Part({
  title,
  children,
  note,
}: {
  title: string;
  children: ReactNode;
  note?: string;
}) {
  return (
    <Card>
      <Txt tone="heading">{title}</Txt>
      {note ? (
        <Txt tone="small" muted>
          {note}
        </Txt>
      ) : null}
      <View style={{ gap: 12 }}>{children}</View>
    </Card>
  );
}

// Filling in or changing a Medical ID. Everything is optional.
function MedicalForm_({ medicalId }: { medicalId: MedicalIdInfo }) {
  const router = useRouter();
  const [form, setForm] = useState<MedicalForm>(() =>
    formFromFields(medicalId.fields),
  );
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const save = useSaveMedicalId({
    ownerId: medicalId.ownerId,
    profileId: medicalId.profileId ?? "self",
  });
  const reminders = useReminders(medicalId.ownerId);
  const set = <K extends keyof MedicalForm>(key: K, value: MedicalForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setLocalErrors({});
  };
  const error = (key: string) =>
    localErrors[key] ?? fieldError(save.error, key);
  const rowError = (list: string) => (key: string) => error(`${list}.${key}`);
  const doctor = (key: keyof MedicalForm["doctor"], value: string) =>
    set("doctor", { ...form.doctor, [key]: value });

  const known = new Set(form.medicines.map((m) => m.name.trim().toLowerCase()));
  const fromReminders = (reminders.data?.reminders ?? [])
    .filter(
      (r) =>
        r.kind === "medicine" &&
        r.profileId === medicalId.profileId &&
        !r.paused &&
        r.nextAt !== null &&
        !known.has(r.title.trim().toLowerCase()),
    )
    .map((r) => ({ name: r.title, dose: r.dose }));

  async function submit() {
    const { fields, errors } = medicalFieldsFromForm(form);
    setLocalErrors(errors);
    if (!fields) return;
    try {
      await save.mutateAsync(fields);
      router.back();
    } catch {
      // Shown from save.error
    }
  }

  return (
    <Screen
      problem={
        save.isError
          ? Object.keys(
              (save.error as { fieldErrors?: object }).fieldErrors ?? {},
            ).length
            ? "Please check the boxes marked in red above."
            : messageOf(save.error)
          : null
      }
      footer={
        <Buttons>
          <Button busy={save.isPending} onPress={() => void submit()}>
            {save.isPending ? "Saving…" : "Save Medical ID"}
          </Button>
          <Button kind="secondary" onPress={() => router.back()}>
            Cancel
          </Button>
        </Buttons>
      }
    >
      <Txt tone="heading">{medicalId.personName}</Txt>
      <Txt muted>
        Everything is optional. Allergies and emergency contacts matter most.
      </Txt>
      {save.isError ? (
        <Notice tone="error">
          {Object.keys(
            (save.error as { fieldErrors?: object }).fieldErrors ?? {},
          ).length
            ? "Please check the boxes marked in red."
            : messageOf(save.error)}
        </Notice>
      ) : null}

      <Part title="Allergies">
        {form.allergies.length === 0 ? (
          <CheckRow
            label="No known allergies"
            note="Leave it unticked if you're not sure"
            value={form.noKnownAllergies}
            onChange={(v) => set("noKnownAllergies", v)}
          />
        ) : null}
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
          error={rowError("allergies")}
        />
      </Part>

      <Part title="Basics">
        <DateField
          label="Birth date"
          value={form.birthDate}
          onChange={(v) => set("birthDate", v)}
          optional
          maximumToday
          error={error("birthDate")}
        />
        <Select
          label="Sex"
          value={form.sex}
          onChange={(v) => set("sex", v as MedicalForm["sex"])}
          options={[
            { value: "", label: "Not given" },
            { value: "female", label: "Female" },
            { value: "male", label: "Male" },
          ]}
        />
        <Select
          label="Blood type"
          value={form.bloodType}
          onChange={(v) => set("bloodType", v as MedicalForm["bloodType"])}
          options={[
            { value: "", label: "Not given" },
            ...BLOOD_TYPES.map((b) => ({
              value: b,
              label: b === "unknown" ? "Don't know" : b,
            })),
          ]}
        />
        <Field
          label="Height (cm)"
          keyboardType="decimal-pad"
          value={form.heightCm}
          onChangeText={(v) => set("heightCm", v)}
          error={error("heightCm")}
        />
        <Field
          label="Weight (kg)"
          keyboardType="decimal-pad"
          value={form.weightKg}
          onChangeText={(v) => set("weightKg", v)}
          error={error("weightKg")}
        />
      </Part>

      <Part title="Conditions">
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
              numeric: true,
            },
          ]}
          empty={{ name: "", since: "" }}
          addLabel="Add a condition"
          max={MEDICAL_LIMITS.conditions}
          error={rowError("conditions")}
        />
      </Part>

      <Part title="Medicines taken regularly">
        {fromReminders.length > 0 ? (
          <Button
            kind="secondary"
            small
            icon={Pill}
            onPress={() =>
              set(
                "medicines",
                [...form.medicines, ...fromReminders].slice(
                  0,
                  MEDICAL_LIMITS.medicines,
                ),
              )
            }
          >
            {`Add ${fromReminders.length} from medicine reminders`}
          </Button>
        ) : null}
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
          error={rowError("medicines")}
        />
      </Part>

      <Part
        title="Emergency contacts"
        note={`In the order to call them. Up to ${MEDICAL_LIMITS.contacts}.`}
      >
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
              placeholder: "0917 123 4567",
            },
          ]}
          empty={{ name: "", relationship: "", phone: "" }}
          addLabel="Add a contact"
          max={MEDICAL_LIMITS.contacts}
          error={rowError("contacts")}
          reorder
        />
      </Part>

      <Part title="Doctor">
        <Field
          label="Name"
          value={form.doctor.name}
          onChangeText={(v) => doctor("name", v)}
          placeholder="Dr. Reyes"
          error={error("doctor.name")}
        />
        <Field
          label="Specialty"
          value={form.doctor.specialty}
          onChangeText={(v) => doctor("specialty", v)}
          placeholder="Internal medicine"
          error={error("doctor.specialty")}
        />
        <Field
          label="Clinic or hospital"
          value={form.doctor.clinic}
          onChangeText={(v) => doctor("clinic", v)}
          error={error("doctor.clinic")}
        />
        <Field
          label="Phone"
          keyboardType="phone-pad"
          value={form.doctor.phone}
          onChangeText={(v) => doctor("phone", v)}
          error={error("doctor.phone")}
        />
      </Part>

      <Part title="Implants and devices">
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
          error={rowError("devices")}
        />
      </Part>

      <Part title="Other">
        <Field
          label="PhilHealth ID (optional)"
          keyboardType="number-pad"
          value={form.philhealth}
          onChangeText={(v) => set("philhealth", v)}
          placeholder="12-345678901-2"
          error={error("philhealth")}
        />
        <Select
          label="Organ donor"
          value={form.organDonor}
          onChange={(v) => set("organDonor", v as MedicalForm["organDonor"])}
          options={[
            { value: "", label: "Not given" },
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
          ]}
        />
        <Field
          label="Home address (optional)"
          multiline
          value={form.address}
          onChangeText={(v) => set("address", v)}
          placeholder="12 Mabini St., Brgy. San Roque, Marikina City"
          maxLength={MEDICAL_LIMITS.address}
          error={error("address")}
        />
        <Field
          label="Notes for doctors (optional)"
          multiline
          value={form.notes}
          onChangeText={(v) => set("notes", v)}
          placeholder="Hard to find a vein: use the left arm. Speaks Ilocano."
          maxLength={MEDICAL_LIMITS.notes}
          error={error("notes")}
        />
      </Part>
    </Screen>
  );
}
