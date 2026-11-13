import { normalizeLabelCode } from "@talaan/shared";

// A scanned QR code → a Talaan label code, or null for other QR codes
export function labelFromScan(data: string) {
  const fromLink = /\/l\/([A-Za-z0-9-]+)\/?(?:[?#].*)?$/.exec(data.trim());
  return normalizeLabelCode(fromLink ? fromLink[1] : data);
}
