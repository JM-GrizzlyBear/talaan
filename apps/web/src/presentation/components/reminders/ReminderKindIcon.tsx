import type { ReminderKind } from "@talaan/shared";
import {
  Bell,
  CreditCard,
  FlaskConical,
  type LucideProps,
  Pill,
  RefreshCw,
  Stethoscope,
  Syringe,
} from "lucide-react";

const ICONS = {
  checkup: Stethoscope,
  lab: FlaskConical,
  medicine: Pill,
  refill: RefreshCw,
  vaccination: Syringe,
  hmo: CreditCard,
  other: Bell,
} satisfies Record<ReminderKind, unknown>;

export function ReminderKindIcon({
  kind,
  ...props
}: { kind: ReminderKind } & LucideProps) {
  const Icon = ICONS[kind];
  return <Icon aria-hidden="true" {...props} />;
}
