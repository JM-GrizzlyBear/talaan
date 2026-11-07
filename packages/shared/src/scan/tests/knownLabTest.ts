// Common lab tests in the Philippines and the names printouts use for them.
// Only for recognising lines: Talaan never fills in a normal range itself,
// because every lab has its own.

export interface KnownLabTest {
  // How Talaan writes it in the form
  name: string;
  // Lowercase spellings seen on printouts, the full name first
  aliases: string[];
  // Results like "0-2" (cells per field) or "Negative" are normal here
  textResults?: boolean;
}
