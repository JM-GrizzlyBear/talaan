// What readers commonly get wrong in numbers, and spacing quirks
export function tidyLine(text: string) {
  return text
    .replace(/[–—−~]/g, "-")
    .replace(/(\d),(\d{3})(?!\d)/g, "$1$2") // "250,000" → "250000"
    .replace(/(\d)\s*\.\s*(\d)/g, "$1.$2") // "6 .0" → "6.0"
    .replace(/(\d)\s*-\s*(\d)/g, "$1 - $2")
    .replace(/^[\s•·.:|*-]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

// "0" read as the letter O inside a number ("1O.5" → "10.5")
export function fixLetterO(text: string) {
  const fixed = text.replace(
    /(?<=\d)[oO](?=[\d.]|\b)|(?<=\b)[oO](?=\.\d)/g,
    "0",
  );
  return { text: fixed, changed: fixed !== text };
}
