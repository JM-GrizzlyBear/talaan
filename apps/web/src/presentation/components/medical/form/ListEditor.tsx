import { ArrowDown, ArrowUp, Plus } from "lucide-react";
import { SelectField } from "../../ui/SelectField";
import { TextField } from "../../ui/TextField";
import { buttonSecondary, linkButton } from "../../ui/styles";
import { move } from "./medicalFormState";

export interface Column<T> {
  key: keyof T & string;
  label: string;
  placeholder?: string;
  type?: "text" | "tel" | "select";
  options?: { value: string; label: string }[];
  inputMode?: "numeric" | "tel";
  // Takes the whole row on wide screens
  wide?: boolean;
}

// Rows to add, change, remove (and reorder): allergies, conditions…
export function ListEditor<T extends Record<string, string>>({
  itemLabel,
  items,
  onChange,
  columns,
  empty,
  addLabel,
  max,
  error,
  reorder = false,
}: {
  // "Allergy 2", "Contact 1"
  itemLabel: string;
  items: T[];
  onChange: (items: T[]) => void;
  columns: Column<T>[];
  empty: T;
  addLabel: string;
  max: number;
  error: (key: string) => string | undefined;
  reorder?: boolean;
}) {
  const set = (index: number, key: keyof T, value: string) =>
    onChange(
      items.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    );

  return (
    <div className="flex flex-col gap-3">
      {items.map((item, index) => (
        <div
          key={index}
          className="flex flex-col gap-3 rounded-lg border border-edge bg-white p-3"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {columns.map((column) => {
              const label = `${column.label}${index === 0 ? "" : ""}`;
              const err = error(`${index}.${column.key}`);
              return (
                <div
                  key={column.key}
                  className={column.wide ? "sm:col-span-2" : ""}
                >
                  {column.type === "select" ? (
                    <SelectField
                      label={label}
                      value={item[column.key]}
                      onChange={(v) => set(index, column.key, v)}
                      options={column.options ?? []}
                      error={err}
                    />
                  ) : (
                    <TextField
                      label={label}
                      type={column.type === "tel" ? "tel" : "text"}
                      inputMode={column.inputMode}
                      value={item[column.key]}
                      onChange={(v) => set(index, column.key, v)}
                      placeholder={index === 0 ? column.placeholder : undefined}
                      error={err}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {reorder && items.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => onChange(move(items, index, -1))}
                  disabled={index === 0}
                  aria-label={`Move ${itemLabel} ${index + 1} up`}
                  className={`${linkButton} disabled:opacity-40`}
                >
                  <ArrowUp aria-hidden="true" className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onChange(move(items, index, 1))}
                  disabled={index === items.length - 1}
                  aria-label={`Move ${itemLabel} ${index + 1} down`}
                  className={`${linkButton} disabled:opacity-40`}
                >
                  <ArrowDown aria-hidden="true" className="size-4" />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => onChange(items.filter((_, i) => i !== index))}
              aria-label={`Remove ${itemLabel} ${index + 1}`}
              className={`${linkButton} ml-auto`}
            >
              Remove
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, { ...empty }])}
        disabled={items.length >= max}
        className={`${buttonSecondary} self-start`}
      >
        <Plus aria-hidden="true" className="size-4" />
        {addLabel}
      </button>
    </div>
  );
}
