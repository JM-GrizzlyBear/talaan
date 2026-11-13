import type { RecordFormState } from "@talaan/client";

// What every part of the record form gets: the values, a way to change one,
// and the message for a box ("title", "details.hmo", …), if there is one
export type SetField = <K extends keyof RecordFormState>(
  key: K,
  value: RecordFormState[K],
) => void;

export interface FormPartProps {
  form: RecordFormState;
  set: SetField;
  error: (key: string) => string | undefined;
}

// Lab rows and medicines: the message for one box of one row
export interface RowPartProps extends FormPartProps {
  rowError: (
    list: "results" | "medicines",
    index: number,
    key: string,
  ) => string | undefined;
}
