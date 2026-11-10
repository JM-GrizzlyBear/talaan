// "Ñiño's X-ray, 2026-03-02" → "ninos x ray 2026 03 02": no accents, no case,
// only letters and numbers, single spaces ("Luke's" stays one word)
export function normalizeSearch(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
