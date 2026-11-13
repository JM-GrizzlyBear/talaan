import type { RecordType } from "@talaan/shared";
import {
  FileBadge,
  FileText,
  FlaskConical,
  type LucideIcon,
  Pill,
  ReceiptText,
  ScanLine,
  Stethoscope,
  Syringe,
} from "lucide-react-native";

// The same icon for each type as the website
export const RECORD_ICONS: Record<RecordType, LucideIcon> = {
  imaging: ScanLine,
  lab: FlaskConical,
  prescription: Pill,
  consultation: Stethoscope,
  certificate: FileBadge,
  vaccination: Syringe,
  billing: ReceiptText,
  other: FileText,
};
