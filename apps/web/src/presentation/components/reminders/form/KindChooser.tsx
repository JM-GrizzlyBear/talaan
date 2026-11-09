import { REMINDER_KIND_LABELS, REMINDER_KINDS } from "@talaan/shared";
import { ReminderKindIcon } from "../ReminderKindIcon";
import type { ReminderPartProps } from "./formParts";

// Checkup, lab test, medicine… as big buttons
export function KindChooser({
  form,
  onChoose,
  error,
}: Pick<ReminderPartProps, "form" | "error"> & {
  onChoose: (kind: (typeof REMINDER_KINDS)[number]) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-semibold">What is it for?</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {REMINDER_KINDS.map((kind) => (
          <label
            key={kind}
            className={`flex min-h-14 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${
              form.kind === kind
                ? "border-brand bg-brand-soft text-deep"
                : "border-edge bg-white hover:bg-gray-50"
            }`}
          >
            <input
              type="radio"
              name="kind"
              value={kind}
              checked={form.kind === kind}
              onChange={() => onChoose(kind)}
              className="sr-only"
            />
            <ReminderKindIcon
              kind={kind}
              className="size-5 shrink-0 text-brand"
            />
            {REMINDER_KIND_LABELS[kind]}
          </label>
        ))}
      </div>
      {error("kind") && (
        <p className="text-sm font-medium text-danger">{error("kind")}</p>
      )}
    </fieldset>
  );
}
