import { formatLabelCode, labelPath } from "@talaan/shared";

// What a label's QR code opens: this site's address, then /l/CODE.
// Phone cameras open it like any link; Talaan asks to sign in if needed.
export const labelUrl = (code: string) =>
  `${window.location.origin}${labelPath(code)}`;

export const shownCode = formatLabelCode;
