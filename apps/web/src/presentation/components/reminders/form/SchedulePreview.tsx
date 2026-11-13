import {
  describeSchedule,
  nextOccurrences,
  scheduleSchema,
} from "@talaan/shared";
import { CalendarClock } from "lucide-react";
import { reminderFieldsFromForm, type ReminderFormState } from "@talaan/client";
import { whenText } from "@talaan/client";

// The schedule in words and its next few times, as you fill the form in
export function SchedulePreview({ form }: { form: ReminderFormState }) {
  const { fields } = reminderFieldsFromForm({
    ...form,
    kind: form.kind || "other",
  });
  const parsed = fields ? scheduleSchema.safeParse(fields.schedule) : null;
  if (!parsed?.success) return null;
  const next = nextOccurrences(parsed.data, new Date(), 5);

  return (
    <section
      aria-label="When it happens"
      className="flex flex-col gap-2 rounded-xl border border-brand/30 bg-brand-soft p-4"
    >
      <p className="flex items-start gap-2 font-semibold text-deep">
        <CalendarClock aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        {describeSchedule(parsed.data)}
      </p>
      {next.length > 0 ? (
        <ul className="ml-7 list-disc text-sm text-deep">
          {next.map((at) => (
            <li key={at.toISOString()}>{whenText(at)}</li>
          ))}
        </ul>
      ) : (
        <p className="ml-7 text-sm text-deep">No times left from now.</p>
      )}
    </section>
  );
}
