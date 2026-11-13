import type { ReminderFormState } from "@talaan/client";

export type SetReminder = <K extends keyof ReminderFormState>(
  key: K,
  value: ReminderFormState[K],
) => void;

export interface ReminderPartProps {
  form: ReminderFormState;
  set: SetReminder;
  error: (key: string) => string | undefined;
}
