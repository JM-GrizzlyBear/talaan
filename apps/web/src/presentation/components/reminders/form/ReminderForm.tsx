import type {
  RecordAccountInfo,
  ReminderInfo,
  ReminderKind,
} from "@talaan/shared";
import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useCreateReminder, useUpdateReminder } from "@talaan/client";
import { errorMessage, fieldError } from "../../../format/errorMessage";
import { ErrorAlert } from "../../ui/ErrorAlert";
import { buttonPrimary, buttonSecondary } from "../../ui/styles";
import { AboutSection } from "./AboutSection";
import { AlertsSection } from "./AlertsSection";
import { EndSection } from "./EndSection";
import type { SetReminder } from "./formParts";
import { KindChooser } from "./KindChooser";
import {
  reminderFieldsFromForm,
  KIND_ALERTS,
  type ReminderFormState,
  SERVER_FIELDS,
} from "@talaan/client";
import { RepeatSection } from "./RepeatSection";
import { SchedulePreview } from "./SchedulePreview";
import { WhenSection } from "./WhenSection";

// Adding or editing a reminder: what, when, how often, until when, alerts
export function ReminderForm({
  account,
  reminder,
  initial,
  recordTitle,
  backTo,
}: {
  account: RecordAccountInfo;
  reminder?: ReminderInfo;
  initial: ReminderFormState;
  recordTitle: string | null;
  backTo: string;
}) {
  const [form, setForm] = useState(initial);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  // The alerts follow the kind until they're changed by hand
  const [alertsTouched, setAlertsTouched] = useState(Boolean(reminder));
  const create = useCreateReminder();
  const update = useUpdateReminder();
  const save = reminder ? update : create;
  const navigate = useNavigate();

  const set: SetReminder = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (key === "alerts") setAlertsTouched(true);
    setLocalErrors({});
  };

  function chooseKind(kind: ReminderKind) {
    setForm((f) => ({
      ...f,
      kind,
      alerts: alertsTouched ? f.alerts : KIND_ALERTS[kind],
      // Medicine usually repeats every day
      repeat:
        !reminder && kind === "medicine" && f.repeat === "none"
          ? "day"
          : f.repeat,
    }));
  }

  // A box's message: this form's own check, then the API's
  const error = (key: string) => {
    if (localErrors[key]) return localErrors[key];
    const direct = fieldError(save.error, key);
    if (direct) return direct;
    const server = Object.entries(SERVER_FIELDS).find(([, v]) => v === key);
    return server ? fieldError(save.error, server[0]) : undefined;
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.kind) {
      setLocalErrors({ kind: "Choose what it's for" });
      return;
    }
    const { fields, errors } = reminderFieldsFromForm(form);
    setLocalErrors(errors);
    if (!fields) return;
    try {
      const saved = reminder
        ? await update.mutateAsync({ id: reminder.id, fields })
        : await create.mutateAsync({ ownerId: account.ownerId, fields });
      void navigate(`/reminders/${saved.id}`, { replace: Boolean(reminder) });
    } catch {
      // Shown from save.error
    }
  }

  const hasFieldErrors =
    Object.keys(localErrors).length > 0 ||
    Object.keys(
      (save.error as { fieldErrors?: object } | null)?.fieldErrors ?? {},
    ).length > 0;

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      {save.isError && (
        <ErrorAlert
          message={
            hasFieldErrors
              ? "Please check the boxes marked in red."
              : errorMessage(save.error)
          }
        />
      )}
      <KindChooser form={form} onChoose={chooseKind} error={error} />
      {form.kind && (
        <>
          <AboutSection
            form={form}
            set={set}
            error={error}
            account={account}
            recordTitle={recordTitle}
          />
          <WhenSection form={form} set={set} error={error} />
          <RepeatSection form={form} set={set} error={error} />
          {form.repeat !== "none" && (
            <EndSection form={form} set={set} error={error} />
          )}
          <AlertsSection form={form} set={set} error={error} />
          <SchedulePreview form={form} />
        </>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={save.isPending}
          className={buttonPrimary}
        >
          {save.isPending
            ? "Saving…"
            : reminder
              ? "Save changes"
              : "Save reminder"}
        </button>
        <Link to={backTo} className={buttonSecondary}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
