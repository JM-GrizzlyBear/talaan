import { RECORD_TYPE_LABELS, RECORD_TYPES } from "@talaan/shared";
import { RecordTypeIcon } from "../RecordTypeIcon";
import type { FormPartProps } from "./formParts";

// The 8 record types as big buttons
export function TypePicker({ form, set, error }: FormPartProps) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-semibold">Type</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {RECORD_TYPES.map((type) => (
          <label
            key={type}
            className={`flex min-h-16 cursor-pointer flex-col items-start justify-center gap-1 rounded-lg border px-3 py-2 text-sm font-semibold ${
              form.type === type
                ? "border-brand bg-brand-soft text-deep"
                : "border-edge bg-white hover:bg-gray-50"
            }`}
          >
            <input
              type="radio"
              name="type"
              value={type}
              checked={form.type === type}
              onChange={() => set("type", type)}
              className="sr-only"
            />
            <RecordTypeIcon type={type} className="size-5 text-brand" />
            {RECORD_TYPE_LABELS[type]}
          </label>
        ))}
      </div>
      {error("type") && (
        <p className="text-sm font-medium text-danger">{error("type")}</p>
      )}
    </fieldset>
  );
}
