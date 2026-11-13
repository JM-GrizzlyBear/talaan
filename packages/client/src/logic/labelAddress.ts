import { formatLabelCode, labelPath } from "@talaan/shared";
import { webUrl } from "../api/http";

// What a label's QR code opens: the website's address, then /l/CODE.
// Phone cameras open it like any link; Talaan asks to sign in if needed.
// (The phone app scans it itself and opens the same place.)
export const labelUrl = (code: string) => `${webUrl()}${labelPath(code)}`;

export const shownCode = formatLabelCode;
