// The code on a QR label, like "7K4Q-M2XD". Random, so it can't be guessed,
// and without letters that look alike (0/O, 1/I/L, U/V).
export const LABEL_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
export const LABEL_CODE_LENGTH = 8;

const CODE = new RegExp(`^[${LABEL_ALPHABET}]{${LABEL_CODE_LENGTH}}$`);

// What someone typed or scanned → the stored code, or null when it can't be one
export function normalizeLabelCode(input: string): string | null {
  const code = input.toUpperCase().replace(/[\s-]/g, "");
  return CODE.test(code) ? code : null;
}

// "7K4QM2XD" → "7K4Q-M2XD", easier to read off a label
export function formatLabelCode(code: string) {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

// The address a label's QR code opens
export function labelPath(code: string) {
  return `/l/${code}`;
}
