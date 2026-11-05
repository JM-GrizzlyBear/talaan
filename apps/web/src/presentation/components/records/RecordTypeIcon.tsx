import type { RecordType } from "@talaan/shared";
import {
  FileBadge,
  FileText,
  FlaskConical,
  Pill,
  ReceiptText,
  ScanLine,
  Stethoscope,
  Syringe,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<RecordType, LucideIcon> = {
  imaging: ScanLine,
  lab: FlaskConical,
  prescription: Pill,
  consultation: Stethoscope,
  certificate: FileBadge,
  vaccination: Syringe,
  billing: ReceiptText,
  other: FileText,
};

export function RecordTypeIcon({
  type,
  className = "size-5",
}: {
  type: RecordType;
  className?: string;
}) {
  const Icon = ICONS[type];
  return <Icon aria-hidden="true" className={className} />;
}
